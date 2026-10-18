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
