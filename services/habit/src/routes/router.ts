import { Router } from "express";
import {
  createHabitHandler,
  getHabitHandler,
  getActiveHabitsHandler,
  deleteHabitHandler,
  completeHabitHandler,
  progressHandler,
} from "../controllers/habitController";
import { authMiddleware } from "../middlewares/authMiddleware";

const router = Router();

router.post("/create/:userId",authMiddleware, createHabitHandler);
router.get("/get/:userId", authMiddleware, getActiveHabitsHandler);
router.get("/get/:userId/:habitId", authMiddleware, getHabitHandler);
router.delete("/delete/:userId/:habitId", authMiddleware, deleteHabitHandler);
router.post("/complete/:habitId", authMiddleware, completeHabitHandler);
router.get("/progress/:habitId", authMiddleware, progressHandler);

export default router;
