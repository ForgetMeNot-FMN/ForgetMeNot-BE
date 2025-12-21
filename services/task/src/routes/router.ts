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
  getOverallStatsHandler
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

// Complete task
router.post("/:userId/:taskId/complete", completeTaskHandler);

// Get today's completed tasks
router.get("/:userId/today/completed", getTodayCompletedTasksHandler);

// Get today's uncompleted tasks
router.get("/:userId/today/pending", getTodayUncompletedTasksHandler);

// Get today's task stats
router.get("/:userId/today/stats", getTodayStatsHandler);

// Get all task stats
router.get("/:userId/overall/stats", getOverallStatsHandler);

export default router;
