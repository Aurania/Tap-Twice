import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { db } from "./firebase.js";
import type { PurchaseDoc } from "./purchase.js";
import type { Profile, WishlistItemInput } from "./schemas.js";
import { purchasesThisMonth } from "./purchase.js";
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

/** Stores a purchase plan; when it came from a wishlist item, that item is removed in the same write. */
export async function addPurchase(uid: string, doc: PurchaseDoc, wishlistId?: string) {
  const batch = db.batch();
  const ref = userDoc(uid).collection("purchases").doc();
  batch.set(ref, { ...doc, createdAt: Timestamp.now() });
  if (wishlistId) batch.delete(userDoc(uid).collection("wishlist").doc(wishlistId));
  await batch.commit();
  return ref.id;
}

/** What this month takes from each pocket: pay-in-full purchases from this month and every PayLater installment still running. */
export async function monthPurchases(uid: string, now = new Date()): Promise<StoredPurchase[]> {
  const snap = await userDoc(uid).collection("purchases").limit(500).get();
  const docs = snap.docs
    .map((d) => d.data())
    .filter((d) => typeof d.startMonth === "string") // purchases from before PayLater plans had no schedule
    .map((d) => ({ pocketId: d.pocketId as string, startMonth: d.startMonth as string, months: d.months as number, installment: d.installment as number, adminFee: (d.adminFee as number) ?? 0 }));
  return purchasesThisMonth(docs, now);
}

export async function deleteAllUserData(uid: string) {
  await db.recursiveDelete(userDoc(uid));
}

function toIso(value: unknown) {
  return value instanceof Timestamp ? value.toDate().toISOString() : null;
}
