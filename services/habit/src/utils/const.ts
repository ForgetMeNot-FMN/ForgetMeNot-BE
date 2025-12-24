import dotenv from "dotenv";
dotenv.config({ path: "/temp/.env" });

export const env = {
  FIREBASE_SERVICE_ACCOUNT: process.env.FIREBASE_SERVICE_ACCOUNT,
};
