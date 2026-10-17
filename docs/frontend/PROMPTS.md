# Prompts for Claude Code, phase by phase

Paste one phase at a time. Wait until Claude Code says it's done and you've checked the result in the browser before pasting the next one. Each phase ends with a commit.

---

## Phase 0: Read and plan (no code yet)

```
Read web/CLAUDE.md, REPO_CONTEXT.md, api/src/schemas.ts, docs/frontend/SCREENS.md and docs/frontend/BACKEND_GAPS.md. Then use the Figma connector on file EBxd7b9Wc8YsmIF9mO0sY6: read the page "User flow · End to end" (node 75:50) to understand navigation and the if/else branches, and look at three source frames on "UI · Hi-fi v2": 02 Home (30:60), 05 Reality card (31:100), 07 Future Me · Chat (32:169).
Then give me, in plain language, a short plan: folder structure, routes, shared components, and anything in the docs that looks contradictory or missing. Don't write code yet.
```

## Phase 1: Scaffold

```
Phase 1. Create the web/ app as described in web/CLAUDE.md: Vite + React + TypeScript (strict), Tailwind v4 using web/src/styles/tokens.css, React Router, vite-plugin-pwa (name "Tap Twice", theme and background #3D5AFE), lucide-react, Firebase auth only (anonymous sign-in, config from web/.env.local).
Add: the typed API client in web/src/api/ for every endpoint in REPO_CONTEXT.md (with 401 re-auth + retry once, and 409 no_profile → /welcome), the i18n setup (EN + ID), and the shared UI components listed in web/CLAUDE.md, each shown on a /dev/components page so I can compare them with Figma.
Run npm run build, start the dev server on port 5173, and check that GET /api/health and anonymous sign-in work. Then commit on branch feat/web.
```

Check: open http://localhost:5173/dev/components. Buttons, chips, sheets and rows should look like the Figma components.

## Phase 2: Happy path (the demo flow)

```
Phase 2. Build the happy path, matching the Figma frames (node IDs in docs/frontend/SCREENS.md): splash (also as inline HTML in index.html) → welcome W1–W4 → onboarding 01a, 01b, 01c (with the month sheet) → PUT /api/profile → Home → pick-screenshot sheet → Reading (POST /api/extract with the resize helper) → Confirm items (edit/add sheets) → Reality card (POST /api/reflect) → "How are you paying?" sheet → Logged; and Save → Saved with the toast (POST /api/wishlist + POST /api/decisions).
Follow BACKEND_GAPS.md for currency, work pattern, and hidden optional fields. Show rupiah. Never compute money in the frontend.
Test the whole flow with a real cart screenshot, fix anything that breaks, run npm run build, then commit.
```

Check: do the full flow with a real Shopee/Tokopedia cart screenshot (there are some in the Drive folder "03 Test Screenshots"). Compare every screen with its Figma frame.

## Phase 3: Paylater and Future Me

```
Phase 3. Build the paylater flow (sheets 06a, 06b, 06c and screen 06) using web/src/data/paylater-providers.ID.json and the rate-source priority in BACKEND_GAPS.md #6, with one POST /api/cost per tenor on the plan sheet (debounced). Then build Future Me (07, 07b, 07c, 07e) with the SSE reader from REPO_CONTEXT.md: streaming text, "checking your numbers…" on tool events, static quick-reply chips, max 6 turns, end-of-chat state, error + try again, avatar with nickname initial and sparkle badge.
Test with a screenshot that has paylater terms and a 6-turn chat, run npm run build, then commit.
```

## Phase 4: Edge cases, Saved, Settings

```
Phase 4. Build: not-a-cart (03b), couldn't-read (03c), foreign currency on Confirm (fx line) and the "type the rupiah total" state when idr is null (04d), Saved list with countdown, item sheet, remove + undo toast, empty state (08, 08b, 08c, 09), Settings with edit + Avoid-interest toggle + EN | ID (10), Reset everything (10b → DELETE /api/me → back to /). Complete the Bahasa Indonesia strings for every screen.
Test each edge case from the table in REPO_CONTEXT.md ("Edge cases the UI must handle"), test a 20-character nickname on Home and Future Me, run npm run build, then commit.
```

## Phase 5: Polish, PWA, deploy

```
Phase 5. Polish motion (splash taps, Reading steps, count-up on the big number, sheets sliding up, reduced-motion respected), check every screen against its Figma frame at 390 px wide, add PWA icons from the two-taps mark, and make sure Lighthouse PWA and accessibility checks pass. Then build and deploy to Firebase Hosting (firebase deploy --only hosting --project tap-twice-aurania), open https://tap-twice-aurania.web.app on a phone and run the demo flow end to end. Commit and open a pull request from feat/web to main.
```

---

## Useful one-liners

- Compare with the design: `Compare the screen at /check/reality with Figma node 31:100 (get_screenshot) and fix any differences in spacing, type and color.`
- Something broke: paste the error message and say `Find the cause and fix it, then run npm run build.`
- Before stopping for the day: `Commit everything on feat/web with a clear message and push.`
