import express from "express";
import {
  getConflicts,
  getEvents,
  projectHabitEventsHandler,
  resolveConflictHandler,
} from "../controllers/calendarController";
import { authMiddleware } from "../middlewares/authMiddleware";
import { internalAuthMiddleware } from "../middlewares/internalAuthMiddleware";

const router = express.Router();

router.post("/internal/project-habits", internalAuthMiddleware, projectHabitEventsHandler);
router.get("/:userId/events", authMiddleware, getEvents);
router.get("/:userId/conflicts", authMiddleware, getConflicts);
router.post("/:userId/conflicts/resolve", authMiddleware, resolveConflictHandler);

export default router;
