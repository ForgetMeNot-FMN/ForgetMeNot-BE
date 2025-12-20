import { Router } from "express";
import {
  createHabitHandler,
  getHabitHandler,
  getActiveHabitsHandler,
  deleteHabitHandler,
  completeHabitHandler,
  progressHandler,
} from "../controllers/habitController";

const router = Router();

router.post("/create/:userId", createHabitHandler);
router.get("/get/:userId", getActiveHabitsHandler);
router.get("/get/:userId/:habitId", getHabitHandler);
router.delete("/delete/:userId/:habitId", deleteHabitHandler);
router.post("/complete/:habitId", completeHabitHandler);
router.get("/progress/:habitId", progressHandler);

export default router;
