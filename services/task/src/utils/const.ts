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
  NOTIFICATION_SERVICE_URL: requireEnv("NOTIFICATION_SERVICE_URL"),
  TASK_REWARD_COINS: Number(process.env.TASK_REWARD_COINS || 5),
  TASK_REWARD_WATER: Number(process.env.TASK_REWARD_WATER || 1),
};
