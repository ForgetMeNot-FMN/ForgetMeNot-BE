import express from "express";
import userRouter from "./src/routes/router";
import cors from "cors";
import { globalRateLimit } from "./src/middlewares/rateLimitMiddleware";
const app = express();
app.use(cors());
app.use(globalRateLimit);
app.use(express.json());

app.use("/users", userRouter);

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`User service running on port ${PORT}`);
});
