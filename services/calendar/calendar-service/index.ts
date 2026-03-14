import dotenv from "dotenv";
dotenv.config({ path: "/temp/.env" });
import express from "express";
import calendarRouter from "./src/routes/router";
import cors from "cors";
import { envs } from "./src/utils/const";

const app = express();
app.use(cors());

app.use(express.json());

app.use("/calendar", calendarRouter);

const PORT = envs.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Calendar service running on port ${PORT}`);
});
