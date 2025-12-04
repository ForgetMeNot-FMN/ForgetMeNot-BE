import express from "express";
import bodyParser from "body-parser";
import admin from "firebase-admin";
import router from "./src/routes/router";

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});

const app = express();
app.use(bodyParser.json());
app.use(router);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Auth service running on port ${PORT}`);
});
