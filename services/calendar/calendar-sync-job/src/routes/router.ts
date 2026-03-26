import express from "express";
import { runSyncJob } from "../controllers/syncJobController";
import { internalAuthMiddleware } from "../middlewares/internalAuthMiddleware";

const router = express.Router();

router.post("/internal/run", internalAuthMiddleware, runSyncJob);

export default router;
