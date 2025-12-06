import express from "express";
import userRouter from "./src/routes/router";
import cors from "cors";
const app = express();
app.use(cors());

app.use(express.json())

app.use("/users", userRouter);

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`User service running on port ${PORT}`);
});
