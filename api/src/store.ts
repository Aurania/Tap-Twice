import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { db } from "./firebase.js";
import type { Profile, PurchaseInput, WishlistItemInput } from "./schemas.js";
import type { StoredPurchase, StoredWishlistItem } from "./summary.js";

// Layout: users/{uid} holds the profile; wishlist and purchases are subcollections.
const userDoc = (uid: string) => db.collection("users").doc(uid);

/**
 * v1 profiles (rupiah-only, joy budget) have a different shape. A stored profile that does not
 * look like v2 is treated as "no profile" so the user onboards again. No migration.
 */
function isV2(profile: unknown): profile is Profile {
  const p = profile as Partial<Profile> | undefined;
  return Boolean(p && Array.isArray(p.pockets) && typeof p.currency === "string" && typeof p.monthlyExpenses === "number");
}

export async function getProfile(uid: string): Promise<Profile | null> {
  const snap = await userDoc(uid).get();
  const profile = snap.data()?.profile;
  return isV2(profile) ? profile : null;
}

export async function saveProfile(uid: string, profile: Profile) {
  await userDoc(uid).set({ profile, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
}

export async function listWishlist(uid: string): Promise<StoredWishlistItem[]> {
  const snap = await userDoc(uid).collection("wishlist").orderBy("createdAt", "desc").limit(200).get();
  return snap.docs
    .map((d) => {
      const data = d.data();
      return { id: d.id, name: data.name, price: data.price, pocketId: data.pocketId, emoji: data.emoji ?? null, createdAt: toIso(data.createdAt) };
    })
    .filter((w) => typeof w.pocketId === "string"); // v1 items had no pocket
}

export async function addWishlistItem(uid: string, item: WishlistItemInput) {
  const ref = await userDoc(uid).collection("wishlist").add({ ...item, createdAt: Timestamp.now() });
  return ref.id;
}

export async function deleteWishlistItem(uid: string, id: string) {
  await userDoc(uid).collection("wishlist").doc(id).delete();
}

export async function addPurchase(uid: string, purchase: PurchaseInput) {
  const ref = await userDoc(uid).collection("purchases").add({ ...purchase, createdAt: Timestamp.now() });
  return ref.id;
}

/**
 * Start of the current calendar month in UTC.
 * TODO: the handoff does not say which timezone "this month" follows; v1 used Jakarta. Revisit with multi-currency.
 */
function startOfMonth(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export async function monthPurchases(uid: string): Promise<StoredPurchase[]> {
  const snap = await userDoc(uid).collection("purchases").where("createdAt", ">=", Timestamp.fromDate(startOfMonth())).get();
  return snap.docs.map((d) => ({ amount: d.data().amount, pocketId: d.data().pocketId }));
}

export async function deleteAllUserData(uid: string) {
  await db.recursiveDelete(userDoc(uid));
}

function toIso(value: unknown) {
  return value instanceof Timestamp ? value.toDate().toISOString() : null;
}
