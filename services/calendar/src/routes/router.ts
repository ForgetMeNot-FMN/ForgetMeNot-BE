import express from "express";
import { getConflicts, getEvents } from "../controllers/calendarController";
import { authMiddleware } from "../middlewares/authMiddleware";

const router = express.Router();

router.get("/:userId/events", authMiddleware, getEvents);
router.get("/:userId/conflicts", authMiddleware, getConflicts);

export default router;