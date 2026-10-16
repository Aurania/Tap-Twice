import { FieldValue, Timestamp } from "firebase-admin/firestore";
import type { z } from "zod";
import { jakartaDate } from "./cost.js";
import { db } from "./firebase.js";
import type { DecisionSchema, Profile, WishlistItemSchema } from "./schemas.js";

// Layout: users/{uid} holds the profile; wishlist and decisions are subcollections.
const userDoc = (uid: string) => db.collection("users").doc(uid);

export async function getProfile(uid: string): Promise<Profile | null> {
  const snap = await userDoc(uid).get();
  return (snap.data()?.profile as Profile | undefined) ?? null;
}

export async function saveProfile(uid: string, profile: Profile) {
  await userDoc(uid).set({ profile, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
}

export async function listWishlist(uid: string) {
  const snap = await userDoc(uid).collection("wishlist").orderBy("createdAt", "desc").limit(50).get();
  return snap.docs.map((d) => {
    const data = d.data();
    return { id: d.id, name: data.name, price: data.price, merchant: data.merchant ?? null, createdAt: toIso(data.createdAt) };
  });
}

export async function addWishlistItem(uid: string, item: z.infer<typeof WishlistItemSchema>) {
  const ref = await userDoc(uid).collection("wishlist").add({ ...item, createdAt: Timestamp.now() });
  return ref.id;
}

export async function deleteWishlistItem(uid: string, id: string) {
  await userDoc(uid).collection("wishlist").doc(id).delete();
}

export async function addDecision(uid: string, decision: z.infer<typeof DecisionSchema>) {
  const ref = await userDoc(uid).collection("decisions").add({ ...decision, createdAt: Timestamp.now() });
  return ref.id;
}

/** Start of the current calendar month in Jakarta (UTC+7). */
function startOfJakartaMonth(now = new Date()) {
  const [y, m] = jakartaDate(now);
  return new Date(Date.UTC(y, m - 1, 1) - 7 * 60 * 60 * 1000);
}

export async function monthDecisions(uid: string) {
  const snap = await userDoc(uid)
    .collection("decisions")
    .where("createdAt", ">=", Timestamp.fromDate(startOfJakartaMonth()))
    .get();
  return snap.docs.map((d) => {
    const data = d.data();
    return { id: d.id, action: data.action, title: data.title, total: data.total, createdAt: toIso(data.createdAt) };
  });
}

/** Sum of purchases marked "Buy" this month; this is what the joy budget is spent against. */
export async function spentThisMonth(uid: string) {
  const decisions = await monthDecisions(uid);
  return decisions.filter((d) => d.action === "buy").reduce((sum, d) => sum + d.total, 0);
}

export async function deleteAllUserData(uid: string) {
  await db.recursiveDelete(userDoc(uid));
}

function toIso(value: unknown) {
  return value instanceof Timestamp ? value.toDate().toISOString() : null;
}
