# Phase 0 audit: v1 → v2

Branch `feat/web-v2`. Baseline before changes: `api` 13/13 tests pass, `web` builds (23 PWA precache entries). `web` has **no test runner yet**.

Source of truth for v2: `tap-twice-v2-handoff.md` + decisions in the chat (below).

## Decisions recorded

| Topic | Decision |
|---|---|
| Base | Replace v1 in place on this branch; reuse infrastructure. |
| Currency | Multi-currency; default USD; 8 currencies from the picker (USD, IDR, INR, SGD, EUR, GBP, JPY, AUD). All math in the profile currency. |
| Language | EN and ID both ship (existing i18n). |
| Future Me | Pocket-aware reflection chat. **No alternative/cheaper/local product suggestions.** N8 is dropped (10 negative cases remain: N1–N7, N9–N11). |
| Future Me entry points | Home floating robot; Reality card in all states (Healthy / Not healthy / Pocket empty), next to Add to wishlist / Not now. The md says Future Me was removed from the Reality card; this decision overrides it. Exact placement = design TODO. |
| Pocket remaining | `pocketBudget(month) − actual purchases in that pocket`. Wishlist items do **not** reduce it. |
| Pocket empty vs Not healthy | `remaining = 0` → Pocket empty (takes priority); `price > remaining > 0` → Not healthy; else Healthy. |
| Product/price data | No external source. Gemini vision reads the photo; price missing → N5 (manual entry). |

## Keep (reuse as is)

- `api/`: Hono app shell, `auth.ts` (Firebase token check), `config.ts`, `firebase.ts`, `gemini.ts`, `fx.ts` (+ test), `cost.ts` (+ test, **paylater math only**), deploy scripts, Firestore deny-all rules.
- `web/`: Vite/Tailwind/PWA setup, `auth/firebase.ts`, `api/client.ts` (401 retry, 409 handler, SSE reader), `i18n/I18nProvider`, `RootLayout`, `Splash`, `Welcome` (copy to review), `lib/` (`cx`, `dates`, `format`, `storage`, `upload`, `useCountUp`, `paylater`), `ui/` (BottomSheet, Button, Chip, ChoiceChip, CircleButton, Notice, OptionRow, ProgressRing, StatCard, Sticker, TextField, Toast, Toggle, Ripple, Mark, ScreenHeader, LanguageSwitch, Disclaimer, icons), PWA icons.
- `features/check/Paylater*`, `PaySheet`: reused in phase 8, re-entry from wishlist.

## Replace (same file, new v2 behavior)

| File | Change |
|---|---|
| `styles/tokens.css` | Add pocket colors, robot colors, success/danger (+tints), primary tint as tokens. Existing tokens already match the md for primary, surface, text, border. |
| `api/src/schemas.ts` | `Profile` v2: currency, monthlyIncome, monthlyExpenses, workDays[], hoursPerDay, pockets[{id,name,pct,color}], goal. `joyBudget`/`hoursPerWeek` removed. New `Product`, `WishlistItem{pocketId}`, `Purchase{pocketId}`. |
| `api/src/store.ts` | Wishlist per pocket; purchases (for pocket-remaining); remove joy-budget decisions. |
| `api/src/extract.ts` | Single product + price read + pocket guess + confidence (replaces cart extraction). |
| `api/src/futureMe.ts` | Pocket-aware reflection prompt; context = profile, pockets, wishlist, optional checked product. Drop cart tools. |
| `web/src/api/types.ts`, `api/index.ts` | Follow the new schemas. |
| `state/ProfileProvider.tsx` | v2 profile; keeps load/save. |
| `features/onboarding/*` | MoneyStep (income + expenses + currency), WorkTime, Pockets, Goal. `InterestStep` removed. |
| `features/home/Home.tsx` | v2 Home (goal card, pockets grid, Check the stuff, Saved wishlist, floating robot). |
| `features/saved/Saved.tsx` | Wishlist grouped by pocket. |
| `features/check/Reading|Reality|Confirm` | Snap → Reading → Match → Reality. |
| `features/futureMe/FutureMe.tsx`, `ui/Chat.tsx` | Chat sheet with robot avatar. |
| `features/settings/Settings.tsx` | v2 profile editing, reset. |

## Drop

- `api`: `/api/cost` and `/api/reflect` cart-based routes (paylater cost stays), `/api/decisions` joy-budget logic, cart `Extraction` schema, `reflect.ts`.
- `web`: `Confirm`, `ItemSheets`, `ExtractProblem`, `Logged`, `ScreenshotPicker`, `CartCheckProvider` (rewritten as a product-check state), `InterestStep`, `dev-fixtures/cart-*.html`.

## New (by phase)

1. `domain/calc.ts` + vitest (web): `leftover`, `hourlyRate`, `workHours`, `pctOfIncome`, `realityStatus`, `pocketBudget`, `pocketRemaining`, `pocketWishlistPct`, `totalWishlistPct`, `allocationTotal`/`isAllocationValid`; seed data module with one consistent Fashion figure.
2. `ui/`: `FutureMeRobot` (SVG), `PercentRing` (multi-segment), `ScrollPicker`, `PocketCard`, `Verdict`, `Dialog`, `EmptyState`.
3. `services/ai/`: `AiService` interface (`identifyProduct`, `readPrice`, `futureMeChat`), `MockAiService` (with dev flags for each error), `GeminiAiService` stub.
4. Negative-case state machine hooks, one per N1–N7, N9–N11.

## Risks and open items

- **Money math location.** `web/CLAUDE.md` says "never compute money in the frontend". The v2 brief requires pure, unit-tested calculation functions for the client-side flows (allocation ring, pocket %, status). I will put them in one `domain/calc.ts` and update that rule in `web/CLAUDE.md`. The API keeps `cost.ts` for paylater only. Say so if you want the math server-side instead.
- **Test runner.** Adding `vitest` to `web/` in phase 1.
- **Existing data.** v1 profiles in Firestore have a different shape. Treat v1 profiles as "no profile" (user re-onboards) rather than migrating. Confirm if needed.
- **Figma.** Access approved for file `kmYlp9f09qqYhHwaVReJLW`; reads are limited (Starter plan), so I check only key frames per phase.
- **Design TODOs (md §12, not implemented silently):** goal screen redesign (#2), robot covering "Check a product" (#4), 6-month projection (#6), Figma prototype (#1), Future Me entry placement on Reality card.

## Phase 1–3 log

- **Math lives on the server** (decision after phase 0): `api/src/calc.ts` (pure rules) and `api/src/summary.ts` (Home, Wishlist and Reality numbers), both unit-tested with the consistent seed. The web only formats and displays. `web/CLAUDE.md` rule 1 stays.
- **Figma check (robot `2026:3354`, Healthy `2026:2223`):** robot matches. Verdict card was rebuilt to the frame: tinted card, check badge, label row, status-colored bar. Finding: "73% after this buy" is measured against the pocket **budget** (`(remaining − price) / budget`), not what was left. `remainingAfterPct` now takes the budget.
- **API after phase 3:** `GET/PUT /api/profile` (N1 and N2 are validated here), `DELETE /api/me`, `GET /api/summary`, `POST /api/check` (includes the N10 duplicate id), `POST /api/wishlist`, `DELETE /api/wishlist/:id`, `POST /api/purchases`. Removed: cart extract, reflect, cost, decisions, Future Me v1, `fx.ts`, `scripts/test-api.mjs`. The README API table is out of date until phase 10.
- **v1 profiles** are treated as "no profile" (re-onboard), no migration.
- **Web:** `api/v2.ts` (types and client, sits beside v1 until the v1 screens are replaced), `services/ai/` (`AiService`, `MockAiService` with a scenario switch for N4, N5, N6 and 07e, `GeminiAiService` stub that fails loudly). `vitest` added to `web/`.
- **Mock limits:** English copy only; the mock's price is always $89.90 (sample data).

### Open items to decide

1. **How a purchase is recorded: DECIDED.** Completing the wishlist item's "How are you paying?" flow (05e) records it and removes the item. Pay in full reduces the pocket by the full price in that month. **PayLater reduces the pocket by the monthly installment in each month of the tenor** (option A). The server will store an installment plan (monthly amount, tenor, start month) and sum the active installments per month. `POST /api/purchases` and `pocketRemaining` get this in phase 8; until then purchases are single-month amounts.
2. **"This month" timezone** is UTC for now (v1 used Jakarta). Per-profile timezone is not in the handoff.
3. **PayLater rounding:** `paylaterCost` still defaults to whole units; phase 8 passes the currency's decimals.
4. **Pocket empty card** color/layout (`2026:2979`) is checked in phase 6; red until then.

## Phase 4 log: onboarding

- **Screens** (all checked against Figma `2026:1547/1584/1624/1738/1799/1864/1901`): Money & income (currency sheet, N1), Work time (day chips, hours picker), Pocket allocation (sliders, N2), Goal (v1 layout, month/year picker). Saving sends the whole profile to `PUT /api/profile`.
- **Server numbers on the sliders:** `POST /api/preview/budget` returns leftover, per-pocket budgets, the 100% check and the "over by" amount. The web only adds up percentages for the ring. `useBudgetPreview` debounces it.
- **Removed from the web (restore from git history when needed):** v1 check flow, PayLater screens and `lib/paylater.ts`, Future Me, Saved, Settings, `CartCheckProvider`, `lib/money.ts`, `lib/upload.ts`. PayLater files come back in phase 8.
- **Header progress** has 4 steps (Figma shows 3 segments for the first three screens; the goal screen was not redesigned).
- **Design TODOs found:** under-100% allocation state, removing a custom pocket, custom pocket name rules and colour, "no work day selected", goal screen redesign (#2), Welcome 1–3 copy still talks about carts and rupiah.
- **Home is a minimal placeholder** (goal and pockets from `/api/summary`, plus a dev-only reset button) until phase 5.
- **Run it locally:** start the API (`cd api && npm run dev`, needs `gcloud auth application-default login`; it uses the project's Firestore) and put `VITE_API_URL=http://localhost:8080` in `web/.env.development.local` (git-ignored) before `npm run dev` in `web/`. The deployed Cloud Run API is still v1 until it is redeployed.

### Phase 4 follow-up checks (browser, local API)

- **Currency sheet:** lists all 8, searches by code, currency name and country ("japan" finds JPY), shows "No currency found", picking IDR switches the prefix to "Rp" and clears the amounts.
- **ID language:** all four steps translated; Indonesian separators ("5.600.000", decimals with a comma); N1 reads "Pengeluaran Rp 600.000 lebih tinggi dari penghasilan…".
- **Custom pocket sheet:** empty name and duplicates (case-insensitive) are blocked with a message; added pocket starts at 0%; "Remove" works.
- **Bugs found and fixed:** the big "Left to allocate" number was clipped for long amounts (now shrinks by length); switching language after typing amounts misread them ("3,200" as 3.2), now converted on language change.
- **Not changed:** the "no work day" hint is plain text (design TODO).

### Welcome 1–3 (checked against Figma `2026:1434/1464/1501`)

- Figma's final-flow Welcome screens are still the v1 screens with only the robot badge on Welcome 3 and a $ sample price; the cart/paylater copy is still in the frames. **The v2 copy here is mine, not from Figma** (EN and ID): sample product $89.90 running shoes = 5 hours, fits Fashion, matching the rest of the app. Welcome 3 uses the vector robot (30px) instead of the sparkle badge. Welcome 4 ("Your money. Your call.") is not in the v2 flow list; kept, with "Your photos are never stored".
- The Future Me chat avatar in `ui/Chat.tsx` still uses the sparkle badge; it becomes the robot in phase 7.

## Phase 5 log: Home and wishlist

- **Checked against Figma** `2017:1242` (full Home), `2026:1970`, `2026:2273` (Wishlist), `2026:2707` (N11), `2026:3129` (N9), `2026:3208` (robot tooltip). Home empty (N11) and the filled Home, the Wishlist and N9 match the frames.
- **Server:** wishlist items carry an optional `emoji` (the design shows one per item; the identify step provides it); the summary has `roomiestPocketId` for "Your Fashion pocket has room".
- **Assumptions to confirm (design TODOs):**
  - "Has room" = the pocket with the most left this month; the subtitle for other states is my wording (only the empty and "has room" lines are designed).
  - Figma's subtitle says "4 things" but its own sample wishlist has 5 items; the app counts the real items.
  - Home lists the 4 most recent items; Wishlist lists each pocket oldest first (as Figma). Pockets without items are not shown on Wishlist.
  - The floating robot's tooltip is always visible and covers part of the Check card (handoff §12 #4).
- **Left out because the target screen is not designed:** the goal card's chevron destination (§12 #6, only drawn), "Edit" next to Your pockets, the Settings button. Wishlist rows are not tappable until phase 8; "Check a product" and the robot show a placeholder toast until phases 6 and 7.
- **Dev only:** Home has "Add the 5 sample wishlist items" and "Reset my data" buttons (not in production builds).

## Phase 6 log: Check a product

- **Screens, all checked against Figma** (`2026:2104` Snap, `2140` Reading, `2184` Match, `2223` Healthy, `3029` Not healthy, `2979` Pocket empty, `2841` N3, `2903` N4, `2940` N5, `2877` N6, `3079` N10): Snap, Reading (three real steps: identify, read price, fetch the pocket numbers), Match (edit price, change pocket, custom pocket, rescan), Reality (three verdicts), Problem (N4, N6). Not-healthy and empty numbers matched the frames to the cent (−$37.90, $52 left, "until Nov 1", 14 days).
- **Server:** `/api/check` now also returns `overBy`, `refillDate`, `daysUntilRefill`, `duplicateAddedAt`; "left after buying" can be negative (Figma −$37.90) and is $0 for an already-empty pocket. 74 API tests.
- **AI service:** new `reflect()` for the Reality card paragraph (mock builds it from the server's numbers); `camera_denied` dev scenario for N3.
- **N3 is real:** "Take a photo" asks the browser's camera permission state first; blocked → N3. A web page cannot open the system Settings, so "Open Settings" re-asks for the camera and, if still blocked, shows a hint toast.
- **Entry for Future Me on the Reality card** (your decision): an "Ask Future Me" link under the two buttons. Placement is mine; it shows a placeholder toast until phase 7.
- **Copy I wrote (not in Figma):** the hero says "This costs you" (Figma: "These shoes cost you", which needs a product noun), "Looking at your product" (Figma: "your shoes"), pocket descriptions for Gadgets, Entertainment and Travel ("Everyday style stuff" is Figma's for Fashion), N10 body in ID.
- **Assumptions:** "Check my reality" sits right under the content as in Figma; the product photo is only shown in memory during Reading; the price from the AI is treated as already in the profile currency.
- **Dev only:** Home has "Spend $278/$330 in Fashion" buttons to reach Not healthy and Pocket empty.
