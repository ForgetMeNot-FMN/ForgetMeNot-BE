import dotenv from "dotenv";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { envs } from "../utils/const";

dotenv.config({ path: "/temp/.env" });

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(envs.FIREBASE_SERVICE_ACCOUNT);
  serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export const firestore = getFirestore(admin.app(), "fmn-database");
