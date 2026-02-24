import dotenv from "dotenv";
dotenv.config({ path: "/temp/.env" });
import express from "express";
import gardenRouter from "./src/routes/router";
import cronRouter from "./src/routes/cronRouter";
import cors from "cors";
import { globalRateLimit } from "./src/middlewares/rateLimitMiddleware";
import { envs } from "./src/utils/const";

const app = express();
app.set("trust proxy", 1);

app.use(cors());
app.use(globalRateLimit);
app.use(express.json());

app.use("/cron", cronRouter);
app.use("/gardens", gardenRouter);

const PORT = envs.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Garden service running on port ${PORT}`);
});
