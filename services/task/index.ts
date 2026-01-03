import dotenv from "dotenv";
dotenv.config({ path: "/temp/.env" });
import express from "express";
import taskRouter from "./src/routes/router";
import cors from "cors";
import { envs } from "./src/utils/const";

const app = express();
app.set("trust proxy", 1);

app.use(cors());
app.use(express.json());
app.use("/task", taskRouter);

const PORT = envs.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Task service running on port ${PORT}`);
});
