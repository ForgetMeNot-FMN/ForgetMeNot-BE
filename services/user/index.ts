import dotenv from "dotenv";
dotenv.config({ path: "/temp/.env" });
import express from "express";
import userRouter from "./src/routes/router";
import cors from "cors";
import { globalRateLimit } from "./src/middlewares/rateLimitMiddleware";
import { envs } from "./src/utils/const";

const app = express();
app.set("trust proxy", 1);

app.use(cors());
app.use(globalRateLimit);
app.use(express.json());

app.use("/users", userRouter);

const PORT = envs.PORT || 8080;

app.listen(PORT, () => {
  console.log(`User service running on port ${PORT}`);
});
