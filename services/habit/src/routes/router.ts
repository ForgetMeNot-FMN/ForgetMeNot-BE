import { Router } from "express";
import {
  createHabitHandler,
  getHabitHandler,
  getActiveHabitsHandler,
  deleteHabitHandler,
} from "../controllers/habitController";

const router = Router();

router.post("/create/:userId", createHabitHandler);
router.get("/get/:userId", getActiveHabitsHandler);
router.get("/get/:userId/habitId", getHabitHandler);
router.delete("/delete/:userId/habitId", deleteHabitHandler);

export default router;
