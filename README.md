# Tap Twice

A mobile PWA that helps young Indonesians pause before they tap "pay". Team AURANIA, Google Cloud AI Builder Cup 2026.

| Part | Where | Notes |
|---|---|---|
| API | `api/` → Cloud Run `tap-twice-api` (asia-southeast2) | Node + Hono + TypeScript |
| AI | Vertex AI, `gemini-3.5-flash-lite`, `global` endpoint | No API keys; the `tap-twice-api` service account calls Vertex AI |
| Data | Firestore database `tap-twice-db` (Jakarta) | Only the API reads/writes it; client rules deny everything |
| Auth | Firebase anonymous auth | API verifies the Firebase ID token on every request |
| Web | `web/` → Firebase Hosting | Not built yet |

Live API: https://tap-twice-api-973641804480.asia-southeast2.run.app/api/health

## API endpoints

All under `/api`, all need `Authorization: Bearer <Firebase ID token>` except `/api/health`.

| Method | Path | What it does |
|---|---|---|
| GET / PUT | `/profile` | Read / save the onboarding profile |
| DELETE | `/me` | Delete all of this user's data |
| POST | `/extract` | `{ mimeType, data (base64) }` → Gemini reads the cart screenshot |
| POST | `/reflect` | `{ cart, paylater? }` → reality card numbers + 2-sentence reflection |
| POST | `/cost` | `{ cart, paylater? }` → reality card numbers only (no AI), for live paylater edits |
| POST | `/future-me` | `{ cart, paylater?, messages }` → server-sent events: `tool`, `text`, `done`, `error` |
| GET / POST / DELETE | `/wishlist`, `/wishlist/:id` | Save for later |
| GET / POST | `/decisions` | Buy / Save decisions this month, and joy budget left |

All money math lives in [`api/src/cost.ts`](api/src/cost.ts) and is tested in `cost.test.ts`. Gemini never calculates numbers.

## Run locally

```bash
cd api
cp .env.example .env
npm install
gcloud auth application-default login   # once, so the API can reach Vertex AI and Firestore
npm run dev                              # http://localhost:8080
npm test
```

With `DEV_AUTH_BYPASS=1` in `.env`, you can call the local API with an `x-dev-uid: test` header instead of a Firebase token. This never works on Cloud Run.

## Deploy

```bash
scripts/setup-gcp.sh        # once: APIs, Firestore, service account + roles
scripts/deploy-api.sh       # deploy; scales to zero, $0 when idle
scripts/deploy-api.sh 1     # demo/judging day: keep 1 instance warm (billed while idle)
scripts/deploy-api.sh 0     # afterwards: back to zero
```

## Keeping costs near zero

- Cloud Run scales to zero and is capped at 3 instances.
- Gemini 3.5 Flash-Lite ($0.30 / $2.50 per 1M input / output tokens) costs about a cent for a full Cart Check plus Future Me chat. `gemini-3.1-flash-lite` ($0.25 / $1.50) is cheaper and a drop-in swap via `GEMINI_MODEL`; the team chose 3.5 Flash-Lite. `GEMINI_EXTRACT_MODEL` overrides the model for extraction only.
- Firestore `tap-twice-db` is the project's free-tier database.
- Screenshots are processed in memory and never stored; request bodies are never logged.
