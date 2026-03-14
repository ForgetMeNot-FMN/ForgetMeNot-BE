import admin from "firebase-admin";
import { envs } from "./utils/const";

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(envs.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export const firestore = admin.firestore();
