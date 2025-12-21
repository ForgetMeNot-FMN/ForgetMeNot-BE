import express from "express";
import cors from "cors";
import authRoutes from "./src/routes/router";
import { envs } from "./src/utils/const";
import { logger } from "./src/utils/logger";
import { globalRateLimit } from "./src/middleware/rateLimitMiddleware";

const app = express();

app.use(cors());
app.use(express.json());
app.use(globalRateLimit);

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "auth", env: envs.PORT });
});

app.use("/auth", authRoutes);

app.listen(envs.PORT, () => {
  logger.info(`Auth service listening on port ${envs.PORT}`);
});

export default app;
