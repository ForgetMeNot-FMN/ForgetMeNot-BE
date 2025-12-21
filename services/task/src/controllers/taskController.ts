import { Request, Response } from "express";
import { taskService } from "../services/taskService";

export async function getTasksHandler(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const tasks = await taskService.getTasks(userId);
    return res.json({ success: true, data: tasks });
  } catch (err: any) {
    return res.status(404).json({ success: false, message: err.message });
  }
}

export async function getTaskHandler(req: Request, res: Response) {
  try {
    const { taskId } = req.params;
    const task = await taskService.getTask(taskId);
    return res.json({ success: true, data: task });
  } catch (err: any) {
    return res.status(404).json({ success: false, message: err.message });
  }
}

export async function createTaskHandler(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const body = req.body;

    const task = await taskService.createTask(userId, body);

    return res.status(201).json({ success: true, data: task });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

export async function deleteTaskHandler(req: Request, res: Response) {
  try {
    const { taskId } = req.params;

    await taskService.deleteTask(taskId);

    return res.json({
      success: true,
      message: "Task deleted successfully",
    });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

export async function completeTaskHandler(req: Request, res: Response) {
  try {
    const { taskId, userId } = req.params;

    const result = await taskService.completeTask(taskId, userId);

    return res.json({ success: true, data: result });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
}


 export async function getTodayCompletedTasksHandler(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const tasks = await taskService.getTodayCompletedTasks(userId);

    return res.json({ success: true, data: tasks });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

export async function getTodayUncompletedTasksHandler(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const tasks = await taskService.getTodayUncompletedDueTasks(userId);

    return res.json({ success: true, data: tasks });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
}


export async function getTodayStatsHandler(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const stats = await taskService.getTodayStats(userId);

    return res.json({ success: true, data: stats });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
}


export async function getOverallStatsHandler(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const stats = await taskService.getOverallStats(userId);

    return res.json({ success: true, data: stats });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
}


