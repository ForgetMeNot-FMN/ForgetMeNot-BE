import dotenv from "dotenv";
dotenv.config();

export const env = {
  FIREBASE_SERVICE_ACCOUNT: process.env.FIREBASE_SERVICE_ACCOUNT,
};
