import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { config } from "./config.js";

// Uses Application Default Credentials: the Cloud Run service account in
// production, `gcloud auth application-default login` on a laptop.
const app = initializeApp({ projectId: config.projectId });

export const auth = getAuth(app);
export const db = getFirestore(app, config.firestoreDatabase);
db.settings({ ignoreUndefinedProperties: true });
