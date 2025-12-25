import dotenv from "dotenv";
dotenv.config({ path: "/temp/.env" });
import express from "express";
import habitRouter from "./src/routes/router";
import cors from "cors";
import { globalRateLimit } from "./src/middlewares/rateLimitMiddleware";
const app = express();
app.use(cors());

app.use(express.json());
app.use(globalRateLimit);
app.use("/habit", habitRouter);

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Habit service running on port ${PORT}`);
});
