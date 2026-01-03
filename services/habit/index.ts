import dotenv from "dotenv";
dotenv.config({ path: "/temp/.env" });
import express from "express";
import habitRouter from "./src/routes/router";
import cors from "cors";
import { globalRateLimit } from "./src/middlewares/rateLimitMiddleware";
import { envs } from "./src/utils/const";

const app = express();
app.use(cors());
app.set("trust proxy", 1);

app.use(express.json());
app.use(globalRateLimit);
app.use("/habit", habitRouter);

const PORT = envs.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Habit service running on port ${PORT}`);
});
