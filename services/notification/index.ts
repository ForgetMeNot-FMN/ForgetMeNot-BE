import dotenv from "dotenv";
dotenv.config({ path: "/temp/.env" });
import express from "express";
import notificationRouter from "./src/routes/router";
import cors from "cors";

const app = express();
app.use(cors());

app.use(express.json());

app.use("/notifications", notificationRouter);

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Notification service running on port ${PORT}`);
});
