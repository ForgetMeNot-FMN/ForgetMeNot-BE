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
