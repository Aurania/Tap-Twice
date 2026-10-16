#!/usr/bin/env bash
# One-time Google Cloud setup for Tap Twice. Safe to re-run.
# Needs: `gcloud auth login` done, and billing enabled on the project.
set -euo pipefail

PROJECT=tap-twice-aurania
REGION=asia-southeast2
SA_NAME=tap-twice-api
SA="$SA_NAME@$PROJECT.iam.gserviceaccount.com"

gcloud config set project "$PROJECT"

echo "→ Enabling APIs"
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  aiplatform.googleapis.com \
  firestore.googleapis.com \
  identitytoolkit.googleapis.com

echo "→ Firestore (Native mode, Jakarta). Only the first database in a project gets the free tier."
gcloud firestore databases describe --database=tap-twice-db >/dev/null 2>&1 \
  || gcloud firestore databases create --database=tap-twice-db --location="$REGION" --type=firestore-native

echo "→ Service account for Cloud Run (only Vertex AI + Firestore access)"
gcloud iam service-accounts describe "$SA" >/dev/null 2>&1 \
  || gcloud iam service-accounts create "$SA_NAME" --display-name="Tap Twice API"
for role in roles/aiplatform.user roles/datastore.user; do
  gcloud projects add-iam-policy-binding "$PROJECT" --member="serviceAccount:$SA" --role="$role" --condition=None >/dev/null
done

echo "Done."
