# Tap Twice web app: instructions for Claude Code

You are building the **frontend PWA** in `web/` of the Tap Twice monorepo. The backend in `api/` is already built and deployed. Read this file fully before writing code, then read:

1. `REPO_CONTEXT.md` (repo root): what is built, the live API, edge cases. **The API section there and `api/src/schemas.ts` are the authority for every request and response.**
2. `docs/frontend/SCREENS.md`: every screen, its route, its Figma node ID, and the API calls it makes.
3. `docs/frontend/BACKEND_GAPS.md`: where the design and the backend differ, and what the frontend does about each one. Follow it exactly.
4. **Figma (read it directly through the Figma MCP connector):** file key `EBxd7b9Wc8YsmIF9mO0sY6`.
   - Page **"User flow · End to end"** (node `75:50`): every screen laid out with arrows and if/else decision diamonds, in lanes (1 Entry & onboarding, 2 Cart Check, 3 Decide/Future Me/Saved, 3b Paylater, 4 Settings, 5 Long nickname variants). Read this first to understand navigation and branching.
   - Page **"UI · Hi-fi v2"** (node `29:50`): the source frames. Use the node IDs in `docs/frontend/SCREENS.md` with `get_design_context` / `get_screenshot` to build each screen. The frames on the flow page are copies of these.
   - Page **"Foundations"** (node `19:50`): variables, text styles, components. Already exported to `web/src/styles/tokens.css`; use that file, don't re-derive tokens.
   Match the design closely. When Figma generates code, treat it as a reference and rebuild it with our tokens and components (no absolute positioning, no inline hex colors).

Ignore any older "API contract v0.x" zip or mock server from the design phase. It is superseded by the real API.

## Stack (decided, don't change)

- React + Vite + TypeScript (strict)
- Tailwind CSS (v4, tokens from `web/src/styles/tokens.css`)
- React Router for routes
- `vite-plugin-pwa` (manifest, icons, `display: "standalone"`, theme color `#3D5AFE`, background color `#3D5AFE`)
- Firebase JS SDK, **auth only** (`signInAnonymously`). Never use Firestore from the browser.
- No other UI kit. Build small components from the design tokens.
- Fonts: Bricolage Grotesque (headlines, big numbers) and Inter (UI), from Google Fonts.

## Non-negotiable rules

1. **Never compute money in the frontend.** Every number on the reality card, paylater screens, and Future Me comes from the API (`/api/reflect`, `/api/cost`). Formatting and summing a list for display (e.g. total held off this month) is fine. The one allowed calculation is the paylater rate derivation described in `REPO_CONTEXT.md` ("Paylater inputs").
2. **The browser never calls Gemini or Firestore.** Everything goes through `VITE_API_URL` + `/api/...` with `Authorization: Bearer <Firebase ID token>`. Get a fresh token per request with `auth.currentUser.getIdToken()`.
3. **Screenshots are never stored.** Resize to ~1600 px long edge, JPEG 0.8, send once as base64, discard (helper in `REPO_CONTEXT.md`).
4. **Never shame the user.** Copy is warm, short, Gen Z. Buying inside the joy budget is a good outcome. The app never blocks a purchase.
5. **Persistent disclaimer** where the design shows it: "Tap Twice shows costs and reflections, not financial advice."
6. **Paying in full is always shown first.** Paylater is never the default.
7. **Long nicknames are never truncated.** Greeting uses the `Heading/Greeting` style (32px) and wraps; nickname input max 20 characters with a counter.
8. Mobile first: design width 390 px. Center the app in a max-width 430 px column on desktop.
9. Accessibility: real `<button>`s, labels on inputs, visible focus, `prefers-reduced-motion` respected.

## Design tokens

Use only the tokens in `web/src/styles/tokens.css` (they mirror the Figma variables `color/*`, `spacing/*`, `radius/*` and the text styles). Never hardcode a hex color in a component.

Text styles (Figma name → use for):

| Style | Font | Size / line height | Use |
|---|---|---|---|
| Display/Hero | Bricolage ExtraBold | 52 / 100% | Big numbers (hours of work), welcome headlines |
| Heading/Greeting | Bricolage ExtraBold | 32 / 110% | "Hey Sarah 👋" on Home |
| Heading/H1 | Bricolage ExtraBold | 26 / 112% | Screen titles |
| Heading/H2 | Bricolage Bold | 20 / 120% | Sheet titles, card titles |
| Display/Number | Bricolage ExtraBold | 22 / 120% | Stat values |
| Body/Large | Inter SemiBold | 16 / 135% | Input values, buttons |
| Body/Default | Inter Regular | 15 / 140% | Body copy |
| Body/Strong | Inter SemiBold | 15 / 140% | Row titles |
| Body/Small | Inter Regular | 13 / 140% | Helper text |
| Caption | Inter Medium | 12 / 130% | Labels, footnotes |
| Link | Inter SemiBold | 14 / 135% | Text links (color `link`) |

Components seen in the design (build once, reuse): Button (Primary / Secondary, Large 54px tall / Small 37px, pill), Circle button (40 / 56), Chip (Soft / Highlight), Option row (selectable card), Stat card, Notice/Warning, Bottom sheet (white, top radius 28, grabber, dimmed navy scrim 55%), Toast, Sticker (rotated pill on the reality card), Mark "two taps" (dot + ring), ripple art (concentric rings).

Icons: 24px line icons, 2px stroke, round caps (Lucide style). Use `lucide-react` with `strokeWidth={2}`: back, chevron-right, bookmark, settings, shopping-bag, sparkles, wallet, calendar, leaf, camera, image, alert-circle, refresh-cw, check, plus, x, trash-2, life-buoy.

## Motion

Keep it subtle (150–300 ms, ease-out). Splash: two taps (dot, then ring ripples out) ~1.5 s total, only while loading. Reading screen: steps tick in sequence. Big number on the reality card counts up. Sheets slide up. Respect reduced motion.

## Project conventions

- `web/src/api/` typed client. Copy types from `api/src/schemas.ts` (or import with a path alias); one function per endpoint; handles 401 (re-auth + retry once) and 409 `no_profile` (redirect to onboarding).
- `web/src/i18n/` EN + ID strings. Default English. Every user-facing string goes through it.
- `web/src/features/<area>/` for screens; `web/src/ui/` for shared components.
- State: React state + context. No Redux.
- Format money with `Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 })`.

## How to work

- Work in the phases in `docs/frontend/PROMPTS.md`. Finish and verify one phase before the next.
- After each phase: `npm run build` must pass with no TypeScript errors; run the dev server on port 5173 (the API only allows that dev origin), open it in the Browser pane, and compare each screen with its Figma frame (`get_screenshot` on the node ID).
- Commit on branch `feat/web` with clear messages. Never commit `.env*` files.
- If the design and the backend disagree, follow `docs/frontend/BACKEND_GAPS.md`. If something is not covered there, ask before inventing.
