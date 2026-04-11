import dotenv from "dotenv";
dotenv.config({ path: "/temp/.env" });
import express from "express";
import aiRouter from "./src/routes/router";
import cors from "cors";
import { envs } from "./src/utils/const";

const app = express();
app.set("trust proxy", 1);

app.use(cors());
app.use(express.json());
app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "ai" });
});
app.use("/ai", aiRouter);

const PORT = envs.PORT || 8080;

app.listen(PORT, () => {
  console.log(`AI service running on port ${PORT}`);
});
