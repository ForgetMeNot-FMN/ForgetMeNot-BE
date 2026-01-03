import dotenv from "dotenv";
dotenv.config();
import admin from "firebase-admin";
import { getFirestore } from 'firebase-admin/firestore';

if (!admin.apps.length) {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;

  if (!serviceAccountJson) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT env not set");
  }

  const serviceAccount = JSON.parse(serviceAccountJson);
  serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export const firestore = getFirestore(admin.app(), "fmn-database");
export const firebaseAdmin = admin;