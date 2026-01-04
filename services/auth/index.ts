import dotenv from "dotenv";
dotenv.config({ path: "/temp/.env" });
import express from "express";
import cors from "cors";
import authRoutes from "./src/routes/router";
import { logger } from "./src/utils/logger";
import { globalRateLimit } from "./src/middleware/rateLimitMiddleware";
import { envs } from "./src/utils/const";

const app = express();
app.set("trust proxy", 1);

app.use(cors());
app.use(express.json());
app.use(globalRateLimit);

const PORT = envs.PORT || 8080;

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "auth", env: PORT });
});

app.use("/auth", authRoutes);

app.listen(PORT, () => {
  logger.info(`Auth service listening on port ${PORT}`);
});

export default app;
