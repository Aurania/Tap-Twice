#!/usr/bin/env node
// Runs the whole Tap Twice flow against the live API with your own cart screenshot.
//
//   node scripts/test-api.mjs path/to/cart.jpg            # English
//   node scripts/test-api.mjs path/to/cart.png --id       # Bahasa Indonesia
//   node scripts/test-api.mjs path/to/cart.jpg --chat     # then chat with Future Me yourself
//   API=http://localhost:8080 node scripts/test-api.mjs cart.jpg   # against a local API
//
// Needs a .env in the repo root (copy .env.example).
//
// It signs in as a fresh anonymous user, uses the "Dinda" demo profile, and
// deletes that user's data at the end.
import { existsSync, readFileSync } from "node:fs";
import { extname } from "node:path";
import { createInterface } from "node:readline/promises";

// Settings come from the repo's .env (see .env.example).
const envFile = new URL("../.env", import.meta.url);
if (existsSync(envFile)) process.loadEnvFile(envFile);
const { API, FIREBASE_WEB_API_KEY } = process.env;
if (!API || !FIREBASE_WEB_API_KEY) {
  console.error("Missing API or FIREBASE_WEB_API_KEY. Copy .env.example to .env and fill it in.");
  process.exit(1);
}

const args = process.argv.slice(2);
const imagePath = args.find((a) => !a.startsWith("--"));
const language = args.includes("--id") ? "id" : "en";
const interactive = args.includes("--chat");
if (!imagePath) {
  console.error("Usage: node scripts/test-api.mjs <screenshot.jpg|png|webp> [--id] [--chat]");
  process.exit(1);
}
const mimeType = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" }[extname(imagePath).toLowerCase()];
if (!mimeType) throw new Error("Use a .jpg, .png or .webp image");

const rp = (n) => (n == null ? "—" : `Rp${Math.round(n).toLocaleString("id-ID")}`);
const step = (s) => console.log(`\n\x1b[1m▸ ${s}\x1b[0m`);

const signUp = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_WEB_API_KEY}`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ returnSecureToken: true }),
}).then((r) => r.json());
if (!signUp.idToken) throw new Error(`Anonymous sign-in failed: ${JSON.stringify(signUp)}`);
const headers = { authorization: `Bearer ${signUp.idToken}`, "content-type": "application/json" };

async function call(method, path, body) {
  const t = Date.now();
  const res = await fetch(API + path, { method, headers, body: body && JSON.stringify(body) });
  const ms = Date.now() - t;
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${text.slice(0, 300)}`);
  return { text, ms, json: () => JSON.parse(text) };
}

try {
  step("Save profile (Dinda demo)");
  await call("PUT", "/api/profile", {
    nickname: "Dinda", age: 23, monthlyIncome: 6_000_000, hoursPerWeek: 45, joyBudget: 600_000, language,
    goal: { name: "Concert in Singapore", targetAmount: 8_000_000, savedAmount: 2_000_000, targetDate: "2027-07-16" },
  });
  console.log("ok");

  step("Extract cart from screenshot (Gemini)");
  const ex = await call("POST", "/api/extract", { mimeType, data: readFileSync(imagePath).toString("base64") });
  const { extraction: orig, idr, fx } = ex.json();
  console.log(`${ex.ms} ms · is_cart=${orig.is_cart} · confidence=${orig.confidence} · currency=${orig.currency} · ${orig.merchant ?? "unknown shop"}`);
  if (!orig.is_cart) {
    console.log("\nNot a cart. The app would ask for another screenshot.");
    process.exit(0);
  }
  if (!idr) {
    console.log(`\n⚠ No exchange rate for ${orig.currency}. The confirm screen would ask the user to type the rupiah total.`);
    process.exit(0);
  }
  if (fx) console.log(`  1 ${fx.currency} = ${rp(fx.rateToIdr)} (${fx.source}, ${fx.date})`);

  // Show both amounts for foreign carts, like the confirm screen.
  const both = (o, n) => (n == null ? "—" : fx ? `${orig.currency} ${o.toLocaleString("en")} ≈ ${rp(n)}` : rp(n));
  orig.items.forEach((i, k) => console.log(`  ${i.quantity} × ${i.name} @ ${both(i.unit_price, idr.items[k].unit_price)}`));
  console.log(`  subtotal ${both(orig.subtotal, idr.subtotal)} · discounts ${both(orig.discounts, idr.discounts)} · shipping ${both(orig.shipping, idr.shipping)}`);
  console.log(`  TOTAL ${both(orig.total, idr.total)}`);
  console.log(`  payment: ${orig.payment_method ?? "—"}${orig.installment ? ` · installment ${JSON.stringify(orig.installment)}` : ""}`);

  const e = idr;
  // Same fallback the confirm screen will use: no total on screen → sum of the items.
  if (!e.total) {
    e.total = e.items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
    console.log(`  no total on screen → using sum of items: ${rp(e.total)}`);
  }

  const cart = {
    merchant: e.merchant,
    items: e.items.map((i) => ({ name: i.name, quantity: i.quantity, unitPrice: i.unit_price })),
    total: e.total,
    paymentMethod: e.payment_method,
  };
  const inst = e.installment;
  const paylater = inst?.tenor_months
    ? { tenorMonths: inst.tenor_months, monthlyRatePct: inst.monthly_rate_pct ?? 2.95, adminFee: inst.admin_fee ?? 0, lateFee: 50_000 }
    : null;

  step("Reality card + reflection (cost engine + Gemini)");
  const rf = await call("POST", "/api/reflect", { cart, paylater });
  const { cost, reflection } = rf.json();
  console.log(`${rf.ms} ms`);
  console.log(`  ${cost.hoursOfWork} hours of work (at ${rp(cost.hourlyRate)}/hour)`);
  console.log(`  delays "${cost.goal.name}" by ${cost.goal.delayDays ?? "—"} days`);
  console.log(`  joy budget: ${rp(cost.joy.leftBefore)} left → ${rp(cost.joy.leftAfter)} (${cost.joy.usedPct ?? "—"}% of what's left)`);
  if (cost.paylater) {
    const p = cost.paylater;
    console.log(`  paylater ${p.tenorMonths}×: ${rp(p.monthlyInstallment)}/month, total ${rp(p.totalPaid)}, +${rp(p.extraCost)} (${p.extraCostPct}%)`);
  }
  console.log(`  “${reflection}”`);

  step("Future Me (agent with tools, streamed)");
  const messages = [];
  async function futureMe() {
    const t = Date.now();
    const res = await fetch(API + "/api/future-me", { method: "POST", headers, body: JSON.stringify({ cart, paylater, messages }) });
    if (!res.ok) throw new Error(`future-me → ${res.status}: ${await res.text()}`);
    let reply = "", first = 0, buf = "", turnsLeft = 0;
    const decoder = new TextDecoder();
    for await (const chunk of res.body) {
      buf += decoder.decode(chunk, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop();
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const ev = JSON.parse(line.slice(5));
        if (ev.type === "tool") process.stdout.write(`\x1b[2m[tool: ${ev.name}]\x1b[0m `);
        if (ev.type === "text") {
          if (!first) { first = Date.now() - t; process.stdout.write("\nFuture Me: "); }
          process.stdout.write(ev.text);
          reply += ev.text;
        }
        if (ev.type === "done") turnsLeft = ev.turnsLeft;
        if (ev.type === "error") process.stdout.write("\n[error from server]");
      }
    }
    console.log(`\n\x1b[2m(first words after ${first} ms, ${turnsLeft} turns left)\x1b[0m`);
    messages.push({ role: "model", text: reply });
    return turnsLeft;
  }

  let turnsLeft = await futureMe();
  if (interactive) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    while (turnsLeft > 0) {
      const text = (await rl.question("\nYou (empty to stop): ")).trim();
      if (!text) break;
      messages.push({ role: "user", text });
      turnsLeft = await futureMe();
    }
    rl.close();
  }
} finally {
  step("Clean up: delete this test user's data");
  await call("DELETE", "/api/me").then(() => console.log("ok"), (err) => console.log(err.message));
}
