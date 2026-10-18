# Tap Twice v2: handoff for the next developer

Written 18 Oct 2026, at the end of the first implementation pass. Read this first, then [`PHASE0_AUDIT.md`](PHASE0_AUDIT.md) (the running decision log, one section per phase, with every assumption and what was verified) and the [README](../../README.md).

## 1. What this is

**Tap Twice** is a mobile PWA that makes people pause before buying. They snap one product (photo, screenshot or link); the app turns the price into **hours of their work**, checks whether it fits a monthly budget **pocket**, and lets them save it to a **wishlist per pocket**. **Future Me** is an AI assistant (a pocket-aware reflection chat) they can ask. Paying for a wishlist item can go through a **PayLater** cost comparison.

v2 replaces the v1 cart-screenshot app (rupiah only, joy budget, Buy / Save). The design source of truth is Figma; the original brief is the file `tap-twice-v2-handoff.md` (it is not in the repo: ask the previous owner, or work from this document).

## 2. Where everything is

| Thing | Where |
|---|---|
| Repo | https://github.com/Aurania/Tap-Twice |
| Work branch | `feat/web-v2` (14 commits ahead of `main`, **pushed, no PR yet**: the GitHub CLI was not installed, open it at https://github.com/Aurania/Tap-Twice/pull/new/feat/web-v2) |
| Live web | https://tap-twice-aurania.web.app (Firebase Hosting, deployed from `feat/web-v2`) |
| Live API | https://tap-twice-api-973641804480.asia-southeast2.run.app (Cloud Run `tap-twice-api`, revision `00003-gs2`) |
| GCP / Firebase project | `tap-twice-aurania`; Firestore database `tap-twice-db` |
| Figma working file | key `kmYlp9f09qqYhHwaVReJLW` ("Tap Twice (Copy)"), page "User flow · End to end", section "Final flow — v2 (all features, with negative cases)" node `2026:1422`. The original file `EBxd7b9Wc8YsmIF9mO0sY6` was never modified |
| Decision log | `docs/v2/PHASE0_AUDIT.md` |
| Old v1 docs | `REPO_CONTEXT.md`, `docs/frontend/*` (marked outdated) |

**Production runs an unmerged branch.** `main` does not match what is live. Merge the PR soon, or the next person to deploy from `main` will put v1 back.

## 3. Architecture in one minute

```
Browser PWA (React + Vite + Tailwind, Firebase anonymous auth)
   │  fetch(API + /api/..., Authorization: Bearer <ID token>)
   ▼
Cloud Run: Hono API (Node, TypeScript)
   ├─ calc.ts / summary.ts / purchase.ts / cost.ts   ← ALL money math, pure, unit-tested
   ├─ ai.ts → Vertex AI Gemini (gemini-3.5-flash-lite)  ← only phrases; numbers are handed in
   └─ store.ts → Firestore (tap-twice-db), client rules deny everything
```

Rules that hold the design together (do not break them):

1. **The web never computes money.** It formats and displays what the API returns. (It only adds up *percentages* of pocket sliders for the ring, and multiplies hours × days for the work-week summary.) Even amounts on the onboarding sliders come from `POST /api/preview/budget`.
2. **The model never calculates and never recommends products.** The server computes every number, formats it ("$37.90", "14 days") and passes it in; prompts say to copy exactly. There are no alternative-product suggestions anywhere (that feature was cut on purpose; N8 went with it). Guardrail wording is unit-tested (`api/src/ai.test.ts`) and was checked live.
3. **The browser never calls Gemini or Firestore.** Everything goes through the API with the user's token.
4. **Photos are resized in the browser (1600 px, JPEG 0.8), sent once, never stored, never logged.**
5. **Never shame; never block a purchase.**

## 4. Repo map

```
api/src/
  calc.ts            pure rules: leftover, hourlyRate, workHours, pocket budget/remaining, Healthy / Not healthy /
                     Pocket empty, wishlist %, allocation 100% check, refill date, purchase schedule (amountInMonth)
  summary.ts         buildSummary (Home, Wishlist), buildReality (the Reality card), buildBudgetPreview (onboarding)
  purchase.ts        planPurchase (pay in full vs PayLater schedule), quotePaylater (server derives the rate from a typed payment)
  cost.ts            flat-rate PayLater math (kept from v1)
  ai.ts              Gemini: analyze (identify + price in one call), reflect, Future Me (SSE); prompts + guardrails
  rateLimit.ts       per-user sliding window for the /api/ai routes (in memory per instance)
  schemas.ts         zod: Profile (rejects N1 and N2), purchases, PayLater, AI requests
  store.ts           Firestore (users/{uid}: profile; subcollections wishlist, purchases)
  index.ts           routes        seed.ts  consistent sample data (used by tests and the mock)
web/src/
  app/               router, RootLayout (titles), RequireProfile (deep links), App providers
  features/          onboarding, home, wishlist (+ PayFlow, RealCost), check (Snap, Reading, Match, Reality, Problem),
                     futureMe (provider, sheet, nudge), welcome, boot (Splash), dev (/dev/components)
  services/ai/       AiService interface, MockAiService (default), GeminiAiService
  state/             ProfileProvider, CheckProvider, PayProvider
  ui/                shared components (FutureMeRobot is vector, PercentRing, ScrollPicker, PocketCard, Verdict, Dialog…)
  styles/tokens.css  design tokens (pocket colors, robot, status; --tt-color-danger-ink is mine, for contrast)
  i18n/              en.ts and id.ts (both complete; add every string to both)
docs/v2/             PHASE0_AUDIT.md (decision log), HANDOFF.md (this file)
```

## 5. Run it

```bash
# API (once: gcloud auth application-default login)
cd api && cp .env.example .env && npm install && npm run dev      # :8080, DEV_AUTH_BYPASS=1 allows x-dev-uid
npm test                                                           # 115 tests

# Web
cd web && npm install
printf 'VITE_API_URL=http://localhost:8080\n' > .env.development.local   # git-ignored; production values live in .env.local
npm run dev                                                         # :5173 (the API's CORS only allows this origin)
npm test                                                            # 43 tests
npm run build
```

- `web/.env.example` lists the variables. **`VITE_AI_PROVIDER`**: `mock` (default; offline, deterministic, used by tests) or `gemini`. Production is built with `gemini`.
- **The local API talks to the real Firestore** (`tap-twice-db`). Use throwaway users. In dev builds Home has buttons to add 5 sample wishlist items, spend $278 / $330 in Fashion (to reach Not healthy / Pocket empty) and reset your data.
- `/dev/components` shows every shared component and a **mock scenario switch** (`ok`, `not_a_product`, `no_price`, `offline`, `unreachable`, `camera_denied`) that drives N3, N4, N5, N6 and 07e in the real screens. It is stored in `localStorage` under `tt.ai.mock` and read at page load.

## 6. Deploy and roll back

```bash
scripts/deploy-api.sh                       # Cloud Run, from api/ (min instances 0, max 3)
cd web && VITE_AI_PROVIDER=gemini npm run build && cd ..
firebase deploy --only hosting --project tap-twice-aurania
```

- Deploy the **web with the Gemini provider on**, or the live app will use the mock.
- Roll back the API: `gcloud run services update-traffic tap-twice-api --to-revisions=tap-twice-api-00002-zt7=100 --region=asia-southeast2 --project=tap-twice-aurania` (that is the v1 API; the v2 web will then break). Roll back the web in the Firebase console (Hosting → release history).
- v1 profiles are not migrated: a stored v1 profile counts as "no profile" and the person onboards again.
- On 18 Oct 2026 the live API was smoke-tested with a throwaway anonymous user (profile, summary, check, N1 rejection, reflect, chat, link analyze, delete); the data was removed.

## 7. Data model (Firestore)

- `users/{uid}.profile`: `{ nickname?, currency (USD IDR INR SGD EUR GBP JPY AUD), monthlyIncome, monthlyExpenses, workDays[], hoursPerDay, pockets[{id,name,allocationPct}], goal{name,targetAmount,savedAmount,targetDate}, language }`. Pockets must add to exactly 100 and expenses must be below income (server-enforced; messages `allocation_not_100:<n>`, `expenses_exceed_income`).
- `users/{uid}/wishlist/{id}`: `{ name, price, pocketId, emoji?, createdAt }`.
- `users/{uid}/purchases/{id}`: `{ name, pocketId, startMonth "YYYY-MM", months, installment, adminFee, totalPaid, createdAt }`. **Pocket remaining = pocket budget − what this month takes from purchases** (pay in full: the whole price in its month; PayLater: one installment per month of the tenor, the one-time fee in month 1). The wishlist never reduces a pocket. Decision recorded as option A.
- Pocket budget = `(income − expenses) × allocation%`. Hourly rate = `income ÷ (hoursPerDay × workDays × 52/12)`.
- "This month" and the refill date use **UTC** (not decided; see open items).

## 8. What is done (all 10 phases)

Tokens and pure rules; shared components; onboarding (money with currency sheet, work time, pocket sliders, goal); Home and Wishlist; Check a product (Snap, Reading, Match, Reality ×3 verdicts); Future Me (chat, nudge); PayLater from a wishlist item; Gemini behind `AiService`; hardening (deep links, rate limits, accessibility, PWA text). Welcome 1–3 rewritten for v2.

**Negative cases, all real states in the app:** N1 expenses ≥ income, N2 pockets ≠ 100%, N3 camera off, N4 not a product, N5 price not found, N6 offline, N7 pocket empty, N9 wishlist empty, N10 already on the wishlist, N11 empty Home, plus 07e Future Me can't be reached. **N8 (no cheaper option) was dropped** with the alternatives feature.

Each screen was compared with its Figma frame in a browser; numbers match the frames to the cent (for example −$37.90, "14 days for the refill").

## 9. What still needs doing

### 9.1 Do soon
1. **Open the PR and merge** `feat/web-v2` → `main` (production already runs it). Body suggestion is in the phase 10 notes of the audit log and the last chat message; the short version: v2 replaces v1, math on the server, AI behind one interface, 10 negative cases, deploy notes.
2. **Check the live site on a real phone**: install as a PWA, offline behavior, camera photo, real product links. Only generated images and `example.com` were tried.
3. **Try real products with Gemini** (many categories, both languages) and tune `api/src/ai.ts` prompts if the pocket match or price reading is weak. Check latency (about 3–5 s per call) and cost.
4. **Rate limits are per instance** (in memory). Fine for loops; add a shared store (Firestore or Redis) if hard per-user caps are needed. Consider a daily cap per user.
5. **Timezone** for "this month" and the refill date is UTC (v1 used Jakarta). Decide: per-profile timezone, or the device's.
6. Tap targets: Figma's circle buttons (40 px) and chips (39–42 px) are slightly under 44 px. Left as designed. A real screen reader pass (VoiceOver, TalkBack) and Lighthouse have not been run.

### 9.2 Needs a design or product decision (marked `TODO(design)` in the code)
- Goal card chevron and a 6-month projection screen (md §12 #6); pockets "Edit"; **Settings** (there is none in v2: no language switch after onboarding, no "Delete my data" outside dev builds; v1 had both. A privacy promise, so worth doing).
- Goal screen redesign (still the v1 layout; goal is required, "Just spend less" and Skip hidden).
- Floating robot covers part of "Check a product" (md §12 #4); the tooltip is always visible, no dismissal rule.
- Future Me: **when the nudge appears** (now: once on Home after "Not now" on a Not healthy or Pocket empty card), the **quick replies** ("Can it wait?", "How did you get these numbers?", "How are my pockets?", "What should I watch?"), the Reality-card **entry placement** ("Ask Future Me" link under the buttons), the 07e layout inside the sheet.
- Custom pockets: name rules, removal, color (falls back to brand blue), the **under-100% allocation state**, "no work day selected", amounts under 1 hour, a pocket over 100% wishlisted.
- Home subtitle wordings other than the two designed ones ("has room" = pocket with the most left).
- Welcome 4 ("Your money. Your call.") is not in the v2 flow list; kept.
- **PayLater screens are v1 in Figma** (cart, screenshot, "Same jacket"); wording here is mine. Provider list is Indonesian and shown to every currency; the late-payment note names SLIK OJK (Indonesia) for everyone; the "Debt-free" chip is per month (Figma: per week).
- Copy I wrote that is not in Figma: Reality hero "This costs you" (Figma: "These shoes cost you"), "Looking at your product", pocket descriptions for Gadgets / Entertainment / Travel, Welcome 1–3 text, nudge text, EN/ID translations in general (ID is mine and unreviewed by a native reader).
- Contrast deviations from Figma, chosen for accessibility: wishlist % in ink instead of the pocket color; darker red for text and the over-allocated card. Revert if design disagrees, but then the colors fail WCAG AA.

### 9.3 Tech debt and loose ends
- `web/CLAUDE.md` still describes v1 below its banner; rewrite or delete it. `REPO_CONTEXT.md` and `docs/frontend/*` are outdated (bannered).
- Unused i18n keys from v1 remain in `en.ts` and `id.ts`; prune.
- v1 PayLater files were deleted and rebuilt; the provider JSON is `web/src/data/paylater-providers.ID.json` (rates checked 2026-10-16; refresh or source per country).
- `api/src/fx.ts` was removed (v2 never converts currency). If multi-currency conversion is wanted later, it must be designed.
- The Firestore `(default)` database was created by mistake in v1 and is unused; delete when convenient.
- No end-to-end test suite: verification so far is unit tests plus scripted browser passes. Consider Playwright for the 10 negative cases (the scenario switch makes them cheap).

## 10. Gotchas that cost time

- **Reload on `/dev/...` or after editing a context module** can show "must be used inside <Provider>": Vite HMR creates two copies of the module. A full page reload fixes it. Not a production issue.
- **React StrictMode runs effects twice in dev.** Anything with an `AbortController` must create it inside the effect (this broke the Future Me chat once).
- **Tailwind class conflicts:** `cx()` does not merge conflicting utilities, and the `.tt-*` text styles use the `font:` shorthand, so a Tailwind `text-[…]` size class does not override them. Use inline `style={{ fontSize }}` or a different class.
- **zsh does not word-split `$VAR`**: when testing the API with curl, write headers out in full.
- Browser automation: sheets animate in, so wait about a second before reading or screenshotting; React inputs need the native value setter plus an `input` event; file inputs can be filled with `DataTransfer` (see `__upload` in the audit notes).
- The API's CORS allows only `localhost:5173` and the two Firebase Hosting origins (set in `scripts/deploy-api.sh`).
- The Figma Starter plan limits design reads (about 6 per month on some accounts). The previous owner's account read ~35 frames without trouble; if reads fail, ask for PNG exports of the frames in `docs/v2/PHASE0_AUDIT.md`'s node list.

## 11. Figma node IDs (file `kmYlp9f09qqYhHwaVReJLW`)

Final flow `2026:1422`. Screens: splash `1423`, welcome `1434` `1464` `1501`, onboarding `1547` (money) `1584` (work) `1624` (pockets) `1693` (goal) `1738` (currency) `1799` (month), home `1970` (full source `2017:1242`), snap `2104`, reading `2140`, match `2184`, healthy `2223`, wishlist `2273`, PayLater `2352` `2417` `2517` `2584` `2665`, not healthy `3029`, nudge `3208`, chat `3354`, 07e `3734`. Negatives: N1 `1864`, N2 `1901`, N3 `2841`, N4 `2903`, N5 `2940`, N6 `2877`, N7 `2979`, N8 `3800` (dropped), N9 `3129`, N10 `3079`, N11 `2707`. All prefixed `2026:`.

## 12. Product decisions made along the way (so you do not re-ask)

- Replace v1 in place on a new branch; multi-currency with USD default; English and Indonesian.
- Math lives on the server, tested there; the web only displays.
- Future Me = pocket-aware reflection chat, **no alternative products**; entry points: Home robot, the Reality card in all three states, and the nudge.
- Pocket remaining = budget − actual purchases; the wishlist does not count. PayLater reduces the pocket by the installment each month (option A).
- Data source for products: only what Gemini reads from the photo or page; no price catalog; price not visible means the user types it (N5).
