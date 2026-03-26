import dotenv from "dotenv";
dotenv.config({ path: "/temp/.env" });

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required env var: ${key}`);
  }
  return value;
}

export const envs = {
  FIREBASE_SERVICE_ACCOUNT: requireEnv("FIREBASE_SERVICE_ACCOUNT"),
  GCP_PROJECT_ID: requireEnv("GCP_PROJECT_ID"),
  GOOGLE_CLIENT_ID: requireEnv("GOOGLE_CLIENT_ID"),
  GOOGLE_CLIENT_SECRET: requireEnv("GOOGLE_CLIENT_SECRET"),
  INTERNAL_SERVICE_TOKEN: requireEnv("INTERNAL_SERVICE_TOKEN"),
  PORT: process.env.PORT || "8080",
};
