import dotenv from "dotenv";
dotenv.config({ path: "/temp/.env" });
import express from "express";
import taskRouter from "./src/routes/router";
import cors from "cors";

const app = express();
app.use(cors());

app.use(express.json());

app.use("/task", taskRouter);

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Task service running on port ${PORT}`);
});
