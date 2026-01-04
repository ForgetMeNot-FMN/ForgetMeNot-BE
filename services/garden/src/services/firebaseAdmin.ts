import dotenv from "dotenv";
dotenv.config();
import admin from "firebase-admin";
// Import getFirestore from the specific firestore sub-module
import { getFirestore } from 'firebase-admin/firestore'; // <--- This is the key change!
import { envs } from "../utils/const";

if (!admin.apps.length) {
  const serviceAccountJson = envs.FIREBASE_SERVICE_ACCOUNT;

  if (!serviceAccountJson) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT env not set");
  }

  const serviceAccount = JSON.parse(serviceAccountJson);
  serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    // You might also want to set databaseURL here if you're using Realtime Database,
    // but for Firestore, it's handled by the admin.firestore() call.
  });
}

export const firestore = getFirestore(admin.app(), "fmn-database");