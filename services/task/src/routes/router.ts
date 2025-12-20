import { Router } from "express";
import {
  getTasksHandler,
  getTaskHandler,
  createTaskHandler,
  deleteTaskHandler,
} from "../controllers/taskController";

const router = Router();

// Get all tasks of a user
router.get("/:userId", getTasksHandler);

// Get a single task
router.get("/task/:taskId", getTaskHandler); // Task id olduğu için user id eklemeye gerek yok

// Create task
router.post("/:userId", createTaskHandler);

// Delete task
router.delete("/:taskId", deleteTaskHandler);

export default router;
