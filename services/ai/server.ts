import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import aiRouter from "./src/routes/router";
import { globalRateLimit } from "./src/middlewares/rateLimitMiddleware";
import { envs } from "./src/utils/const";

dotenv.config({ path: "/temp/.env" });

const app = express();

app.use(cors());
app.use(express.json());
app.use(globalRateLimit);

app.use("/ai", aiRouter);

app.listen(envs.PORT, () => {
  console.log(`AI service running on port ${envs.PORT}`);
});
