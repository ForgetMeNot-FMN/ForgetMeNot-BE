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
  JWT_SECRET: requireEnv("JWT_SECRET"),
  PORT: process.env.PORT || "8080",
};
