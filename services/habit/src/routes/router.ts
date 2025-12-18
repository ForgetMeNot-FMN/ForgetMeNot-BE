import { Router } from "express";
import {
  createHabitHandler,
  getHabitHandler,
  getActiveHabitsHandler,
  deleteHabitHandler,
} from "../controllers/habitController";

const router = Router();

router.post("/:userId", createHabitHandler);
router.get("/:userId", getActiveHabitsHandler);
router.get("/:userId/habitId", getHabitHandler);
router.delete("/:userId/habitId", deleteHabitHandler);

export default router;
