import express from "express";
import {
  getConflicts,
  getEvents,
  resolveConflictHandler,
} from "../controllers/calendarController";
import { authMiddleware } from "../middlewares/authMiddleware";

const router = express.Router();

router.get("/:userId/events", authMiddleware, getEvents);
router.get("/:userId/conflicts", authMiddleware, getConflicts);
router.post("/:userId/conflicts/resolve", authMiddleware, resolveConflictHandler);

export default router;
