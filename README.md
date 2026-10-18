# Tap Twice

A mobile PWA that helps people pause before they buy. Snap one product, see what it costs in hours of your work, check whether it fits your monthly budget pocket, and save it to a wishlist. Team AURANIA, Google Cloud AI Builder Cup 2026.

> **v2 (branch `feat/web-v2`).** Pockets, a wishlist per pocket, "Check the stuff" (one product per scan) and **Future Me** (a pocket-aware reflection chat) replace the v1 cart-screenshot flow. Decisions, phase-by-phase notes, assumptions and open design items are in [`docs/v2/PHASE0_AUDIT.md`](docs/v2/PHASE0_AUDIT.md). The design source is the Figma file "Tap Twice (Copy)", section "Final flow — v2". The deployed Cloud Run service still serves the v1 API until `scripts/deploy-api.sh` is run from this branch.

| Part | Where | Notes |
|---|---|---|
| Web | `web/` (React, Vite, Tailwind, PWA) → Firebase Hosting | Mobile first, 390 px design, English and Bahasa Indonesia |
| API | `api/` (Node, Hono, TypeScript) → Cloud Run `tap-twice-api` | All money math lives here |
| AI | Vertex AI, `gemini-3.5-flash-lite` | Reads products, writes the Reality card paragraph, runs Future Me. No API keys: the service account calls Vertex AI |
| Data | Firestore database `tap-twice-db` | Only the API reads and writes it; client rules deny everything |
| Auth | Firebase anonymous auth | The API verifies the ID token on every request |

## How it works

- **Money math is server-side, pure and tested.** [`api/src/calc.ts`](api/src/calc.ts) holds the rules (leftover, hourly rate, work hours, pocket budget and remaining, Healthy / Not healthy / Pocket empty, wishlist percentages, the 100% check). [`api/src/summary.ts`](api/src/summary.ts) builds the numbers each screen shows, [`api/src/purchase.ts`](api/src/purchase.ts) the purchase schedule (pay in full takes the price this month; PayLater takes an installment each month), and [`api/src/cost.ts`](api/src/cost.ts) the PayLater cost. The web only displays what the API returns.
- **The AI never calculates.** The server hands Gemini ready-made, formatted numbers and the prompts forbid recomputing them, recommending other products or giving financial advice ([`api/src/ai.ts`](api/src/ai.ts)).
- **One AI interface in the web.** Screens use `web/src/services/ai` (`AiService`). `MockAiService` is the default and what the tests use; `GeminiAiService` calls the API when `VITE_AI_PROVIDER=gemini`.
- **Sample data** (the Figma numbers made consistent: income 3,200, expenses 2,100, pockets 330 / 220 / 275 / 275) lives in [`api/src/seed.ts`](api/src/seed.ts).

## API

All under `/api`; every route needs `Authorization: Bearer <Firebase ID token>` except `GET /api/health`.

| Method | Path | What it does |
|---|---|---|
| GET / PUT | `/profile` | Read / save the profile (income, expenses, work days, pockets, goal). The server rejects expenses ≥ income and pockets that do not add up to 100% |
| DELETE | `/me` | Delete all of this user's data |
| POST | `/preview/budget` | Onboarding sliders: leftover, per-pocket budgets, the 100% check, "over by" |
| GET | `/summary` | Home and Wishlist numbers |
| POST | `/check` | The Reality card for `{ name, price, pocketId }`, including a duplicate-wishlist hint |
| POST / DELETE | `/wishlist`, `/wishlist/:id` | Wishlist items, each in a pocket |
| POST | `/purchases` | "Log it": pay in full or PayLater; removes the wishlist item |
| POST | `/paylater/cost` | PayLater numbers for a price (no side effects) |
| POST | `/ai/analyze` | A photo, screenshot or link → product, pocket match and price. 422 `not_a_product` |
| POST | `/ai/reflect` | The Reality card paragraph |
| POST | `/ai/future-me` | Future Me chat, server-sent events `text`, `done`, `error` |

The three `/ai` routes are limited per user (see [`api/src/rateLimit.ts`](api/src/rateLimit.ts)); too many requests get `429 rate_limited` with `Retry-After`.

## Run locally

```bash
# API (needs `gcloud auth application-default login` once, for Vertex AI and Firestore)
cd api
cp .env.example .env
npm install
npm run dev          # http://localhost:8080
npm test

# Web
cd web
cp .env.example .env.local   # then edit; for the local API use .env.development.local with VITE_API_URL=http://localhost:8080
npm install
npm run dev          # http://localhost:5173 (the API only allows this dev origin)
npm test
npm run build
```

With `DEV_AUTH_BYPASS=1` in `api/.env` you can call the local API with an `x-dev-uid: test` header instead of a token. This never works on Cloud Run. The local API talks to the project's real Firestore, so use a throwaway user; in development builds Home has "Add the 5 sample wishlist items", "Spend … in Fashion" and "Reset my data" buttons.

Dev page with every shared component and the AI mock scenarios (offline, not a product, no price, camera denied, Future Me unreachable): `/dev/components`.

## Deploy

```bash
scripts/setup-gcp.sh        # once: APIs, Firestore, service account + roles
scripts/deploy-api.sh       # deploy the API; scales to zero, $0 when idle
scripts/deploy-api.sh 1     # demo day: keep 1 instance warm (billed while idle)
scripts/deploy-api.sh 0     # afterwards: back to zero
cd web && npm run build && cd .. && firebase deploy --only hosting --project tap-twice-aurania
```

Deploying the API from this branch replaces the v1 routes, so deploy the web at the same time. v1 profiles are not migrated: a stored v1 profile counts as "no profile" and the person goes through onboarding again.

## Keeping costs near zero

- Cloud Run scales to zero and is capped at 3 instances; the AI routes are rate limited per user and per instance.
- Gemini Flash-Lite costs about a cent for a product check plus a Future Me chat. `GEMINI_MODEL` and `GEMINI_EXTRACT_MODEL` can swap the model.
- Firestore `tap-twice-db` is the project's free-tier database.
- Photos and screenshots are resized in the browser, processed in memory and never stored; request bodies are never logged.

## Older docs

[`docs/frontend/`](docs/frontend) describes v1 (cart screenshots, rupiah only, joy budget) and is kept for history.
