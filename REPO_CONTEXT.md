> **Outdated: this is the v1 handoff** (cart screenshots, rupiah only, joy budget, the old API). v2 is described in [README.md](README.md) and [docs/v2/PHASE0_AUDIT.md](docs/v2/PHASE0_AUDIT.md). Kept for history.

# Tap Twice: handoff context

For whoever continues development, especially the frontend. Last updated 16 October 2026.

The product source of truth is the PRD (Google Docs, see [Links](#links)). This file covers what is **built**, what is **not**, and the exact contract the frontend must follow.

---

## 1. Status at a glance

| Part | Status |
|---|---|
| Backend API (`api/`) | ✅ Built, deployed to Cloud Run, smoke-tested live |
| Cost engine + tests | ✅ 13 tests passing (`npm --prefix api test`) |
| Gemini: extract, reflect, Future Me | ✅ Working live (EN + ID) |
| Foreign-currency carts | ✅ Converted to rupiah on the server (ECB rates) |
| Firestore + anonymous auth | ✅ Working |
| **Frontend PWA (`web/`)** | ❌ **Not started.** Folder doesn't exist yet |
| Firebase Hosting deploy | ❌ Not done (config is ready in `firebase.json`) |
| Git | ⚠️ **Nothing committed yet.** Everything is local, uncommitted files |

**Deadline:** submission 18 October 2026. Feature freeze Saturday 17 October, 12:00.

---

## 2. What the app does (one paragraph)

Gen Z Indonesians share a screenshot of their shopping cart. Gemini reads it, the user confirms the numbers, and the app shows a **reality card**: hours of work, delay to their savings goal, joy budget used, and the true cost of paylater. Then they choose **Buy (guilt-free)**, **Save for later**, or **Ask Future Me** (a chat with themselves a few years older). The app never blocks a purchase.

**Flow:** Onboarding → Upload screenshot → Confirm items → Reality card (+ paylater) → Buy / Save / Future Me → (Future Me always ends at Buy / Save).

---

## 3. Architecture

```
Browser (PWA, Firebase Hosting)
  │  Firebase anonymous sign-in → ID token
  │  fetch(API_URL + "/api/...", Authorization: Bearer <token>)
  ▼
Cloud Run: tap-twice-api (asia-southeast2, Jakarta)   ← Hono + TypeScript
  ├─ verifies Firebase ID token on every /api/* request (except /api/health)
  ├─ cost engine (all money math)                        api/src/cost.ts
  ├─ Vertex AI Gemini, model gemini-3.5-flash-lite, location "global"
  ├─ Frankfurter (ECB) exchange rates for non-IDR carts   api/src/fx.ts
  └─ Firestore database "tap-twice-db" (Jakarta) via Admin SDK
```

Key rules (from the PRD, already enforced by the backend):

- **The browser never calls Gemini or Firestore directly.** Firestore rules deny all client access. Everything goes through the API.
- **Gemini never does money math.** All numbers come from `cost.ts`. Never compute reality-card numbers in the frontend; display what the API returns.
- **Screenshots are never stored.** Resize in the browser, send once, discard.
- **No secrets in the frontend.** The Firebase web config (including its `apiKey`) is public by design and is fine to ship.

### Repo layout

```
api/                 Backend (deployed)
  src/index.ts       Routes
  src/cost.ts        Cost engine (the only place money math happens)
  src/extract.ts     Screenshot → JSON (Gemini, structured output)
  src/reflect.ts     Two-sentence reflection (Gemini)
  src/futureMe.ts    Future Me agent: tools, guardrails, streaming
  src/fx.ts          Currency conversion to IDR
  src/schemas.ts     Zod schemas = the request/response contract
  src/store.ts       Firestore access
scripts/
  setup-gcp.sh       One-time GCP setup (already run)
  deploy-api.sh      Deploy API to Cloud Run   (arg: min instances, default 0)
  test-api.mjs       End-to-end test of the live API with any screenshot
firebase.json        Hosting (serves web/dist, SPA rewrite) + Firestore rules
firestore.rules      Deny all client access
web/                 ← TO BUILD
```

---

## 4. Frontend: what to build

### Stack (decided in the PRD)

React + Vite + TypeScript, Tailwind CSS, `vite-plugin-pwa`, Firebase JS SDK (**auth only**). Mobile-first, installable. Deployed to Firebase Hosting from `web/dist`.

### Design

Figma: https://www.figma.com/design/EBxd7b9Wc8YsmIF9mO0sY6/Tap-Twice?node-id=29-50

> ⚠️ **Figma access via Claude is blocked.** The Figma connector works, but the signed-in account (ahmad.handoyo1@gmail.com) has no **edit** access to this file, and both of its teams are on the **Starter** plan, which allows only ~6 design-read calls per month. Options: (a) the file owner (Rudi) shares the file with that account as editor and, if Rudi's team is on a paid plan, adds a Full seat; (b) export each screen at 2x PNG into `design/` in this repo and build from the images; (c) both: use the few Figma calls for design tokens (colors, type, spacing), PNGs for the rest.

### Screens and what each one calls

| Screen | API calls | Notes |
|---|---|---|
| **Splash / boot** | Firebase `signInAnonymously` → `GET /api/profile` | `profile: null` → Onboarding. Else → Home. |
| **Onboarding** (F1) | `PUT /api/profile` | Target: done in < 60 s. Prefill joy budget with 10% of income (team decision; user can edit). Language picker defaults to English. |
| **Home / Cart Check** (F2) | — | Upload from gallery or camera (`<input type="file" accept="image/*" capture>`). Show joy budget left (from `GET /api/decisions`). |
| **Reading…** | `POST /api/extract` | Typically 1.5–2.5 s. Show a clear loading state. |
| **Confirm items** | — | User edits items/total before anything is calculated. See [edge cases](#edge-cases-the-ui-must-handle). |
| **Reality card** (F2 + F3) | `POST /api/reflect` once; `POST /api/cost` on paylater edits | Hours of work, goal delay, joy budget, reflection, paylater block. ~1 s. |
| **Future Me** (F4) | `POST /api/future-me` (SSE stream) | First words in ~2.3 s. Show "checking your numbers…" on `tool` events. Max 6 user turns. Buy / Save buttons always visible. |
| **Wishlist** (F5) | `GET/POST/DELETE /api/wishlist` | Item, price, date. "Check again" re-runs the reality card with `{ items: [{name, quantity: 1, unitPrice: price}], total: price }`. |
| **Settings** | `PUT /api/profile`, `DELETE /api/me` | Edit profile; "Delete all my data". |
| **Everywhere** | — | Persistent disclaimer: *Tap Twice shows costs and reflections, not financial advice.* |

**Buy** → `POST /api/decisions { action: "buy", title, total, paylater? }` (counts against the joy budget).
**Save for later** → `POST /api/wishlist { name, price, merchant }` **and** `POST /api/decisions { action: "save", ... }`.

### Edge cases the UI must handle

| Situation | How you'll see it | What to show |
|---|---|---|
| Not a cart | `extraction.is_cart === false` | "This doesn't look like a cart. Try another screenshot." |
| Low confidence | `extraction.confidence === "low"` | Warning on the confirm screen: please check the numbers carefully. |
| No total on screen | `idr.total === null` | Default total = Σ `quantity × unit_price` from `idr.items`; let the user edit. |
| Foreign currency | `fx !== null` | Show both: "£50.02 ≈ Rp1.188.975", plus a small "1 GBP = Rp23.770 · ECB, 2026-10-15". Send the **rupiah** values onward. |
| Currency with no rate | `idr === null` | Ask the user to type the rupiah total. |
| Paylater found | `idr.installment?.tenor_months` | Turn the paylater toggle on and prefill (see [Paylater](#paylater-inputs)). |
| No profile | any endpoint → `409 { error: "no_profile" }` | Send to onboarding. |
| Reflection failed | `reflection === null` | Show the card without it. Numbers still work. |
| Goal reached / date passed | `cost.goal.delayDays === null` | Hide the goal-delay line or say the goal is done. |
| Joy budget used up | `cost.joy.usedPct === null`, `leftAfter < 0` | "This goes Rp… over your joy budget". Not a red alarm; no shaming. |
| Future Me ended | `done.turnsLeft === 0` or `400 conversation_over` | Hide the input; keep Buy / Save. |
| Extraction error | `502 { error: "extraction_failed" }` | "Couldn't read that one. Try again or another screenshot." |
| Session lost | `401` | Re-run anonymous sign-in, retry once. |

---

## 5. API contract

Base URL: `https://tap-twice-api-973641804480.asia-southeast2.run.app`
All paths start with `/api`. All need `Authorization: Bearer <Firebase ID token>` except `GET /api/health`.
JSON in, JSON out (except Future Me: SSE). The Zod schemas in `api/src/schemas.ts` are the authority.

### Profile

```ts
type Profile = {
  nickname?: string;            // ≤ 40 chars
  age?: number;                 // 15–80, makes Future Me "you at 30"
  monthlyIncome: number;        // IDR, > 0
  hoursPerWeek: number;         // 1–120
  joyBudget: number;            // IDR per month, ≥ 0
  goal: { name: string; targetAmount: number; savedAmount: number; targetDate: "YYYY-MM-DD" };
  language: "en" | "id";        // drives Gemini's language
};
```

- `GET /api/profile` → `{ profile: Profile | null }`
- `PUT /api/profile` (body: `Profile`) → `{ profile }` · `400 invalid_profile`
- `DELETE /api/me` → `{ ok: true }` (deletes profile, wishlist, decisions)

### Extract

`POST /api/extract`, body `{ mimeType: "image/jpeg" | "image/png" | "image/webp", data: <base64, no data: prefix> }` (max ~8 MB).

```ts
type Extraction = {
  is_cart: boolean;
  merchant: string | null;
  items: { name: string; quantity: number; unit_price: number }[];
  subtotal: number | null; discounts: number | null; shipping: number | null; total: number | null;
  currency: string;                       // "IDR", "GBP", ...
  payment_method: string | null;
  installment: { provider: string | null; tenor_months: number | null; monthly_amount: number | null;
                 monthly_rate_pct: number | null; admin_fee: number | null } | null;
  confidence: "high" | "medium" | "low";
};
// Response:
{ extraction: Extraction;          // as read, original currency
  idr: Extraction | null;          // same, in whole rupiah (=== extraction when already IDR)
  fx: { currency: string; rateToIdr: number; date: string; source: "ECB via Frankfurter" } | null }
```

Note the **snake_case** here (it's Gemini's schema). Everything else is camelCase.

### Cart check: reflect and cost

Body for both:

```ts
type Cart = {
  merchant?: string | null;
  items: { name: string; quantity: number; unitPrice: number }[];   // IDR, camelCase
  total: number;                                                    // IDR, > 0
  paymentMethod?: string | null;
};
type Paylater = { tenorMonths: number /* 1–36 */; monthlyRatePct: number /* 0–20, flat */; adminFee: number; lateFee?: number };
// body: { cart: Cart, paylater?: Paylater | null }
```

- `POST /api/reflect` → `{ cost: Cost, reflection: string | null }` (use once when the card opens)
- `POST /api/cost` → `{ cost: Cost }` (no AI; use when the paylater toggle/inputs change, debounced ~300 ms)

```ts
type Cost = {
  total: number; hourlyRate: number; hoursOfWork: number;            // hoursOfWork has 1 decimal
  goal: { name: string; monthlySaving: number | null; delayDays: number | null };
  joy: { budget: number; spentThisMonth: number; leftBefore: number; leftAfter: number; usedPct: number | null };
  paylater: { tenorMonths: number; monthlyInstallment: number; totalPaid: number;
              extraCost: number; extraCostPct: number; lateFee: number | null } | null;
};
```

### Paylater inputs

PRD F3: tenor, monthly rate, admin fee, late fee. Always editable. Prefill from `idr.installment`:

- `tenorMonths` ← `tenor_months`
- `monthlyRatePct` ← `monthly_rate_pct`; if null but `monthly_amount` is known: `((monthly_amount × tenor − total) / total / tenor) × 100`; otherwise default **2.95**
- `adminFee` ← `admin_fee ?? 0`; `lateFee` ← user input (optional)

Always show the SLIK note: *Late payments may be recorded in OJK's credit system (SLIK) and can affect future loans such as a mortgage (KPR).*

### Future Me (SSE)

`POST /api/future-me`, body `{ cart: Cart, paylater?: Paylater | null, messages: { role: "user" | "model"; text: string }[] }`.

- **First call:** `messages: []`. The server opens the conversation itself.
- **Next calls:** send the **whole** history, starting with Future Me's first reply (`role: "model"`), then the user's message. Tested: a history starting with `model` works.
- Max 6 user messages. More → `400 conversation_over`.

Response is `text/event-stream`. Each event's `data` is JSON:

```
event: tool   data: {"type":"tool","name":"calculate_cost"}     → show "checking your numbers…"
event: text   data: {"type":"text","text":"That jacket is"}     → append to the bubble
event: done   data: {"type":"done","turnsLeft":5}
event: error  data: {"type":"error"}                            → "Future Me lost the thread. Try again."
```

`EventSource` can't POST, so read the stream with `fetch`:

```ts
const res = await fetch(`${API_URL}/api/future-me`, { method: "POST", headers, body: JSON.stringify(body) });
const reader = res.body!.pipeThrough(new TextDecoderStream()).getReader();
let buf = "";
for (;;) {
  const { value, done } = await reader.read();
  if (done) break;
  buf += value;
  const lines = buf.split("\n");
  buf = lines.pop()!;
  for (const line of lines) if (line.startsWith("data:")) onEvent(JSON.parse(line.slice(5)));
}
```

### Wishlist and decisions

- `GET /api/wishlist` → `{ items: { id, name, price, merchant, createdAt }[] }` (newest first, max 50)
- `POST /api/wishlist` `{ name, price, merchant? }` → `201 { id }`
- `DELETE /api/wishlist/:id` → `{ ok: true }`
- `GET /api/decisions` → `{ decisions: { id, action, title, total, createdAt }[], spentThisMonth, joyBudgetLeft }` (this calendar month, Jakarta time)
- `POST /api/decisions` `{ action: "buy" | "save", title, total, paylater? }` → `201 { id }`

### Errors

`400 invalid_*` (bad body) · `401 unauthenticated` · `409 no_profile` · `502 extraction_failed` · `500 internal`. All are `{ error: string }`.

---

## 6. Frontend setup notes

### Firebase (auth only)

Firebase web app "Tap Twice Web" already exists. Get its config with:

```bash
firebase apps:sdkconfig WEB --project tap-twice-aurania
```

Put it in `web/.env.local` (gitignored):

```
VITE_API_URL=https://tap-twice-api-973641804480.asia-southeast2.run.app
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=tap-twice-aurania.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=tap-twice-aurania
VITE_FIREBASE_APP_ID=...
```

Anonymous sign-in is already enabled. Get a fresh token per request with `await auth.currentUser.getIdToken()` (the SDK refreshes it). The anonymous user persists in the browser; clearing site data creates a new user with no profile.

### CORS

The API only accepts browser requests from:
`http://localhost:5173`, `https://tap-twice-aurania.web.app`, `https://tap-twice-aurania.firebaseapp.com`.
If you use another dev port or a custom domain, add it to `ORIGINS` in `scripts/deploy-api.sh` and redeploy.

The API is called **directly**, not through a Firebase Hosting rewrite. Hosting rewrites to Cloud Run may buffer streamed responses, which would break Future Me streaming; calling Cloud Run directly avoids the risk.

### Image upload

Resize to ~1600 px on the long edge and JPEG ~0.8 before sending (PRD: faster, cheaper, no storage):

```ts
async function toUpload(file: File) {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const canvas = new OffscreenCanvas(Math.round(bmp.width * scale), Math.round(bmp.height * scale));
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  const blob = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.8 });
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
  return { mimeType: "image/jpeg" as const, data: dataUrl.split(",")[1] };  // strip "data:...;base64,"
}
```

HEIC from iPhones: `createImageBitmap` handles it in Safari; elsewhere the `<input>` usually delivers JPEG.

### Formatting and language

- Rupiah: `new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 })` → "Rp 451.000".
- Decimals (hours, days): `Intl.NumberFormat(lang === "id" ? "id-ID" : "en-US", { maximumFractionDigits: 1 })`.
- UI copy in **English and Bahasa Indonesia**, following `profile.language`. Gemini output already follows it.
- Tone: warm, never shaming. Joy spending inside the budget is a good outcome.

### PWA

`vite-plugin-pwa` with a manifest (name, icons, `display: "standalone"`, theme color). `firebase.json` already serves `/sw.js` with `no-cache`. Stretch only: `share_target` so screenshots can be shared straight from the gallery (Android; limited on iPhone).

### Deploy the frontend

```bash
cd web && npm run build && cd ..
firebase deploy --only hosting --project tap-twice-aurania
```

Live at `https://tap-twice-aurania.web.app`.

---

## 7. Backend: how to work with it

```bash
npm --prefix api install
npm --prefix api test                    # cost engine + fx tests
cp .env.example .env                     # fill FIREBASE_WEB_API_KEY and API
node scripts/test-api.mjs cart.png       # full flow against the live API (add --id, --chat)
scripts/deploy-api.sh                    # redeploy API (min instances 0)
scripts/deploy-api.sh 1                  # judging day: no cold start (billed while idle). Set back to 0 after.
```

Run the API locally: `cd api && cp .env.example .env && npm run dev` (needs `gcloud auth application-default login`). Locally, `DEV_AUTH_BYPASS=1` lets you send `x-dev-uid: test` instead of a token; this never works on Cloud Run.

### Measured performance (live, Jakarta)

| Step | Time |
|---|---|
| `/extract` | 1.6–2.5 s |
| `/reflect` | ~1.0 s |
| `/future-me` first words | ~2.3–2.9 s (after 2–3 tool calls) |

PRD target: upload → reality card < 10 s. Met with room to spare.

---

## 8. Decisions already made

| Decision | Why |
|---|---|
| Gemini **3.5 Flash-Lite** for all AI steps, Vertex AI `global` endpoint | Team choice. `gemini-3.1-flash-lite` is cheaper and a drop-in swap via `GEMINI_MODEL`; 2.5 Flash-Lite retires 20 Oct 2026. `GEMINI_EXTRACT_MODEL` can upgrade extraction alone if accuracy falls short. |
| Cloud Run in Jakarta, min 0 / max 3 instances, 512 MiB | Cheapest; inside the free tier at hackathon traffic. |
| Firestore database **`tap-twice-db`** (not `(default)`) | It holds the project's free tier. |
| `--no-invoker-iam-check` on Cloud Run | Otherwise Cloud Run rejects the Firebase bearer token before it reaches the app. The app itself verifies every token. |
| Non-IDR carts converted with ECB rates (Frankfurter, no key) | Users shop cross-border too; profile and math stay in rupiah. |
| Joy budget prefilled at 10% of income, editable | PRD open question; sensible default. |
| Default language English (for the demo); Bahasa Indonesia selectable | Submission must be in English. |
| Paylater math is **flat-rate**: installment = price/tenor + price×rate; total = installment×tenor + admin | Matches how Indonesian paylater advertises rates. Five reference cases in `cost.test.ts`. |
| Goal months counted on the calendar (Jakarta date) | "9 months to July" should mean 9, not 9.1. |

---

## 9. Known issues and loose ends

- **Nothing is committed.** Commit before anything else (`.gitignore` already excludes `.env*` and credentials).
- **Figma access** (see [Design](#design)).
- Firestore rules on `tap-twice-db` were **replaced** with deny-all. If a teammate had other rules there, restore them from rules history in the Firebase console (but the app needs deny-all).
- An empty, unused Firestore database `(default)` was created by mistake. Free; delete when convenient:
  `gcloud firestore databases delete --database="(default)" --project=tap-twice-aurania`
- ~8 anonymous test users exist in Firebase Auth from API testing. Harmless.
- PRD evaluation still to do: 10 real cart screenshots (target ≥ 8/10 correct totals), 10 adversarial Future Me prompts (target 10/10), full demo flow on a phone < 90 s. `scripts/test-api.mjs` (with `--chat`) is the tool for the first two.
- Stretch goals not started: Future Me voice, 24-hour delay with push, share target.

---

## Links

| | |
|---|---|
| PRD (source of truth) | https://docs.google.com/document/d/1HwsWXiL7IjW_RFGCrNqUYFXJtx2R1lEshYjhCmDkcfw/edit |
| Figma design | https://www.figma.com/design/EBxd7b9Wc8YsmIF9mO0sY6/Tap-Twice?node-id=29-50 |
| Drive folder (incl. 03 Test Screenshots) | https://drive.google.com/drive/folders/1oPk0xra0VTNcg2TMsUlErw8HLU9I2kFe |
| Live API health | https://tap-twice-api-973641804480.asia-southeast2.run.app/api/health |
| GCP / Firebase project | `tap-twice-aurania` (Firebase console: https://console.firebase.google.com/project/tap-twice-aurania) |
| GitHub | https://github.com/Aurania/Tap-Twice |
| Competition | https://aibuildercup.com/ |
