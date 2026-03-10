import express from "express";
import { getEvents } from "../controllers/calendarController";
import { authMiddleware } from "../middlewares/authMiddleware";

const router = express.Router();

router.get("/:userId/events", authMiddleware, getEvents);

export default router;