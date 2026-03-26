import dotenv from "dotenv";
dotenv.config({ path: "/temp/.env" });
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { envs } from "../utils/const";

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(envs.FIREBASE_SERVICE_ACCOUNT);
  serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export const firestore = getFirestore(admin.app(), "fmn-database");
