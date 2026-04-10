import dotenv from "dotenv";
dotenv.config({ path: "/temp/.env" });
import express from "express";
import cors from "cors";
import syncJobRouter from "./src/routes/router";
import { envs } from "./src/utils/const";

const app = express();
app.use(cors());
app.use(express.json());
app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "calendar-sync-job" });
});
app.use("/calendar-sync-job", syncJobRouter);

const PORT = envs.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Calendar sync job running on port ${PORT}`);
});
