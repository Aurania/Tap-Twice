# Tap Twice screens: what to build

Design: Figma file `EBxd7b9Wc8YsmIF9mO0sY6`. Read it through the Figma MCP connector.
- **"User flow · End to end"** (node `75:50`): all screens with arrows and if/else diamonds. Start here for navigation.
- **"UI · Hi-fi v2"** (node `29:50`): the source frames. The **Node** column below points to these; use `get_design_context` / `get_screenshot` on them.

Money values in the design are shown in USD for the judges. **The app shows rupiah**, because the backend works in IDR (see `BACKEND_GAPS.md` #1). Copy stays the same.

Legend: **Route** = React Router path. **Sheet** = bottom sheet over the previous screen (not a route).

## 0. Boot

| Frame | Node | Route | What it does |
|---|---|---|---|
| 00a Splash · Tap 1, 00b Splash · Tap 2 | 47:199, 47:210 | `/` | Blue screen, dot then ring ripples out, wordmark "Tap Twice", tagline "Tap once. Think twice." Runs while `signInAnonymously()` and `GET /api/profile` load (max ~1.5 s). `profile === null` → `/welcome`. Else → `/home`. Also make the inline HTML version in `index.html` so it shows before React loads. |

## 1. Welcome (first time only)

| Frame | Node | Route | Notes |
|---|---|---|---|
| W1 Welcome · Pause | 29:51 | `/welcome/1` | Blue. EN \| ID switch top-right (sets UI language, saved later in profile). Swipe or Next. |
| W2 Welcome · Snap | 29:88 | `/welcome/2` | "Skip" → W4. |
| W3 Welcome · Future you | 29:128 | `/welcome/3` | Avatar uses the Tap Twice mark (no nickname yet) + yellow sparkle badge. Chat bubbles are illustration only. |
| W4 Get started | 29:166 | `/welcome/4` | Navy. "Get started" → onboarding. |

## 2. Onboarding (→ `PUT /api/profile` at the end)

| Frame | Node | Route / sheet | Notes |
|---|---|---|---|
| 01a Onboarding · Money | 30:165 | `/onboarding/money` | Back button + 3-step progress + EN \| ID. Fields: nickname (optional, max 20, counter "5/20"), currency (fixed to IDR for now, see gaps #1), monthly take-home income, work pattern presets (9–5 Mon–Fri = 8×5, Shifts / 6 days = 8×6, It varies) + hours/day + days/week. |
| 01a·s Pick currency | 67:486 | sheet | Hidden while the backend is IDR-only (gaps #1). |
| 01a·b Income skipped | 67:554 | state of 01a | Only if Afan makes income optional (gaps #3). Otherwise hide "I'd rather not say". |
| 01b Onboarding · Goal | 30:209 | `/onboarding/goal` | Segmented "A specific goal \| Just spend less". Goal name, target, saved so far, by when (month picker sheet), monthly joy budget (prefill 10% of income, editable). "Skip for now". |
| 01b·s Pick a month | 67:605 | sheet | Month list. |
| 01b·b Just spend less | 67:668 | state of 01b | Only if the backend accepts no goal (gaps #3). Otherwise hide the segment and "Skip for now". |
| 01c Onboarding · Avoid interest | 30:253 | `/onboarding/interest` | "Yes, flag them" / "No, show everything". Then `PUT /api/profile` → `/home`. |

## 3. Home

| Frame | Node | Route | Notes |
|---|---|---|---|
| 02 Home | 30:60 | `/home` | "Hey {nickname} 👋" (or "Hey you 👋"), Heading/Greeting 32px, wraps, never truncated. Held off this month (sum of wishlist items saved this month), goal card with progress ring (`savedAmount / targetAmount`), stats "Joy budget left" (`GET /api/decisions` → `joyBudgetLeft`) and "Held off". Cart Check card → pick sheet. Bookmark → Saved. Gear → Settings. |
| 02b Home · No goal | 66:452 | `/home` (state) | Only with gaps #3. |
| 03a Pick a screenshot | 60:199 | sheet | "Choose a screenshot" (`<input type="file" accept="image/*">`) and "Take a photo" (`capture="environment"`). Cancel. |

## 4. Cart Check

| Frame | Node | Route / sheet | API | Notes |
|---|---|---|---|---|
| 03 Cart Check · Reading | 30:116 | `/check/reading` | `POST /api/extract` | Navy. Screenshot card with scan line, steps tick in sequence ("Reading prices", "Spotting paylater terms…", "Doing the math"). |
| 03b Not a cart | 60:280 | `/check/not-a-cart` | — | When `extraction.is_cart === false`. Checklist "A good screenshot shows…". "Try another screenshot" → pick sheet. |
| 03c Couldn't read it | 60:320 | `/check/error` | — | `502 extraction_failed` or network error. "Try again" re-sends the same image. |
| 03d Currency not supported | 60:359 | — | — | Replaced by "type the rupiah total" on 04d when `idr === null` (gaps #5). |
| 04 Confirm items | 30:272 | `/check/confirm` | — | Uses `idr` (rupiah). Screenshot preview + "Rescan". Rows: items, shipping, voucher (discounts), total. Low confidence (`confidence === "low"`) → orange row + "Double-check this one". Total = `idr.total ?? Σ quantity × unit_price`. "Looks right" → reality card. |
| 04b Edit item / 04c Add item | 62:255, 62:330 | sheets | — | Edit name, price, quantity; remove; add. |
| 04d Different currency | 62:406 | `/check/confirm` (state) | — | When `fx !== null`: show "£50.02 ≈ Rp1.188.975" and "1 GBP = Rp23.770 · ECB, 2026-10-15" (gaps #5). When `idr === null`: show the input "What will your card charge? (IDR)". |
| 05 Reality card | 31:100 | `/check/reality` | `POST /api/reflect` once | Blue hero: "This cart costs you" + big hours (`cost.hoursOfWork`, count-up) "hours of your work". Stickers: "+{cost.goal.delayDays} days to the {goal}" and the total. Reflection (`reflection`, hide if null). Stats: Joy budget (`cost.joy.leftAfter`), With PayLater (extra cost, when paylater). "Paying with PayLater?" teaser → 06a. Actions: Buy it (→ 05e), Save (→ 08a), Future Me (→ 07). |
| 05b / 05c / 05d | 64:281, 64:338, 64:395 | states | — | No goal / no income / unconverted currency variants. 05d is not needed (backend converts). 05b, 05c only with gaps #3. Goal reached (`delayDays === null`) → hide the goal sticker. |
| 05e How are you paying? | 64:456 | sheet | `POST /api/decisions` | Pay in full (default, first) / PayLater (with "Contains interest" chip if the user chose to avoid interest). "Log it" → `{ action: "buy", title, total, paylater? }` → 05f. |
| 05f Bought · Logged | 64:542 | `/check/logged` | — | Blue celebration. Amount, "Logged. Enjoy it!", joy-budget chip ("Rp… over October's joy budget" only if over, never shaming). Back to home / Check another cart. |

## 5. Paylater

| Frame | Node | Route / sheet | API | Notes |
|---|---|---|---|---|
| 06a Which paylater? | 103:623 | sheet | — | List from `web/src/data/paylater-providers.ID.json` + Others. Pre-select the provider read from the screenshot (`idr.installment.provider`, fuzzy match on name). Footer "Typical rates checked N days ago · Sources". |
| 06b Pick your plan | 103:754 | sheet | `POST /api/cost` per tenor | 3 / 6 / 12 months (or the provider's `tenorsMonths`). Each row: monthly installment and "includes Rp… in interest & fees" from the API. Rate source priority in `BACKEND_GAPS.md` #6. "Edit" → 06c. "See the real cost" → 06. |
| 06c Enter your plan | 103:874 | sheet | — | Others, or Edit: name (optional), months (3/6/12/Other), monthly payment, one-time fee. |
| 06 Paylater · Real cost | 31:198 | `/check/paylater` | `POST /api/cost` | "Same jacket. +{extraCostPct}% if you pay later." Source line "{Provider} · {n} months · from your screenshot · Change". Bars and option rows: Pay in full (selected, first) vs PayLater. Chips: "Contains interest", "Debt-free: Rp…/week × n". Late-payment notice (SLIK OJK). Save for later / Back to my cart. |

## 6. Future Me

| Frame | Node | Route | API | Notes |
|---|---|---|---|---|
| 07 Future Me · Chat | 32:169 | `/check/future-me` | `POST /api/future-me` (SSE) | Header: avatar (nickname initial, or the mark) + yellow sparkle badge, "Future {nickname}" (or "Future you"), "Built around your goals". Bubbles hug content, max width 280. `tool` event → "checking your numbers…". Quick-reply chips (static, see `BACKEND_GAPS.md` #8). Input + "AI can make mistakes. Double-check the numbers." Large Buy it / Save for later always visible. |
| 07b Reply | 65:407 | state | — | Next turn. |
| 07c End of chat | 65:472 | state | — | `done.turnsLeft === 0` or `400 conversation_over`: hide chips and input, show "Chat ended · 6 of 6 replies. Time to decide." |
| 07d Support | 65:538 | state | — | When the server returns the debt-stress support reply (OJK 157). "Call OJK 157" → `tel:157`. |
| 07e Can't reach | 65:618 | state | — | `error` event or network error: inline bubble + "Try again". |

## 7. Saved for later

| Frame | Node | Route | API | Notes |
|---|---|---|---|---|
| 08a Just saved | 85:649 | `/saved` (with toast) | `POST /api/wishlist` + `POST /api/decisions {action:"save"}` | Toast "Saved! We'll check in with you in a week 🫶", fades after 3 s. |
| 08 Saved for later | 32:240 | `/saved` | `GET /api/wishlist` | Held-off hero (sum), list with emoji tile, price, "⏳ N days left" (7 days from `createdAt`), chevron → 08c. |
| 08c Saved item | 66:558 | sheet | — | Keep waiting / Remove from list. |
| 08b Item removed | 66:507 | `/saved` (toast) | `DELETE /api/wishlist/:id` | Toast with Undo (re-POST the item). |
| 09 Empty | 32:301 | `/saved` (empty) | — | "Nothing saved yet 🫶" + "Check a cart". |

## 8. Settings

| Frame | Node | Route | API | Notes |
|---|---|---|---|---|
| 10 Settings | 68:504 | `/settings` | `PUT /api/profile` | Rows: Nickname, Income, Work pattern, Goal, Joy budget (open the matching onboarding screen in edit mode), Avoid interest toggle, Language EN \| ID. |
| 10b Reset everything? | 68:587 | sheet | `DELETE /api/me` | Then sign out of the anonymous user and go to `/`. |

## 9. Not part of the app

- `00 Scenario switcher (prototype only)`: Figma-only tool for testing edge cases.
- Section "5 · Long nickname variants" on the flow page: test cases. Check them in the browser with a 20-character nickname.
