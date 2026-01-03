import { Router } from "express";
import {
  getTasksHandler,
  getTaskHandler,
  createTaskHandler,
  deleteTaskHandler,
  completeTaskHandler,
  getTodayCompletedTasksHandler,
  getTodayUncompletedTasksHandler,
  getTodayStatsHandler,
  getOverallStatsHandler,
  updateTaskHandler
} from "../controllers/taskController";
import { authMiddleware } from "../middlewares/authMiddleware";

const router = Router();

// Get all tasks of a user
router.get("/user/:userId", authMiddleware, getTasksHandler);

// Get a single task
router.get("/:taskId", authMiddleware, getTaskHandler); // Task id olduğu için user id eklemeye gerek yok

// Create task
router.post("/:userId", authMiddleware, createTaskHandler);

// Delete task
router.delete("/:taskId", authMiddleware, deleteTaskHandler);

// Update task
router.patch("/:taskId", authMiddleware, updateTaskHandler);

// Complete task
router.post("/:userId/:taskId/complete", authMiddleware, completeTaskHandler);

// Get today's completed tasks
router.get("/:userId/today/completed", authMiddleware, getTodayCompletedTasksHandler);

// Get today's uncompleted tasks
router.get("/:userId/today/pending", getTodayUncompletedTasksHandler);

// Get today's task stats
router.get("/:userId/today/stats",authMiddleware, getTodayStatsHandler);

// Get all task stats
router.get("/:userId/overall/stats",authMiddleware, getOverallStatsHandler);

export default router;
