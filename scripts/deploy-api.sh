#!/usr/bin/env bash
# Build and deploy the API to Cloud Run. Usage: scripts/deploy-api.sh [min-instances]
#   scripts/deploy-api.sh      # normal: scales to zero, costs nothing when idle
#   scripts/deploy-api.sh 1    # demo/judging day: no cold starts (billed while idle)
set -euo pipefail

PROJECT=tap-twice-aurania
REGION=asia-southeast2
MIN_INSTANCES=${1:-0}
ORIGINS="https://$PROJECT.web.app,https://$PROJECT.firebaseapp.com,http://localhost:5173"

cd "$(dirname "$0")/../api"

# max-instances caps the bill if something loops or the URL gets hammered.
gcloud run deploy tap-twice-api \
  --project="$PROJECT" \
  --region="$REGION" \
  --source=. \
  --service-account="tap-twice-api@$PROJECT.iam.gserviceaccount.com" \
  --no-invoker-iam-check \
  --min-instances="$MIN_INSTANCES" \
  --max-instances=3 \
  --cpu=1 \
  --memory=512Mi \
  --concurrency=40 \
  --timeout=120 \
  --set-env-vars="^@^GOOGLE_CLOUD_PROJECT=$PROJECT@GEMINI_LOCATION=global@GEMINI_MODEL=gemini-3.5-flash-lite@FIRESTORE_DATABASE=tap-twice-db@ALLOWED_ORIGINS=$ORIGINS"
