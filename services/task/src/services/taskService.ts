import { taskRepository } from "./taskRepository";
import { logger } from "../utils/logger";

class TaskService {
  async getTasks(userId: string) {
    logger.debug("Get tasks request", { userId });

    const tasks = await taskRepository.getTasksByUserId(userId);

    logger.debug("Tasks fetched", { userId, count: tasks.length });

    return tasks;
  }

  async getTask(taskId: string) {
  logger.debug("Get single task request", { taskId });

  const task = await taskRepository.getTaskById(taskId);

  if (!task) {
    logger.warn("Task not found", { taskId });
    throw new Error("Task not found");
  }

  logger.debug("Task fetched", { taskId });

  return task;
    }



  async createTask(userId: string, body: any) {
  logger.info("Create task request", { userId });

  if (!body?.title) {
    logger.warn("Task title missing", { userId });
    throw new Error("Task title is required");
  }

  // duration_minutes integer olarak kalması için
  const dm = body.duration_minutes;

  if (dm !== undefined && dm !== null) {
    if (
      typeof dm !== "number" ||
      !Number.isInteger(dm) ||
      dm <= 0
    ) {
      logger.warn("Invalid duration_minutes", { userId, dm });
      throw new Error(
        "duration_minutes must be a positive integer in minutes or null"
      );
    }
  }

  const task = await taskRepository.create(userId, {
    title: body.title,
    description: body.description || "",
    duration_minutes: dm ?? null, // null ise null olarak gitmesi için
    start_time: body.start_time,
    is_active: true,
  });

  logger.info("Task created successfully", {
    userId,
    taskId: task.task_id,
  });

  return task;
}



  async deleteTask(taskId: string) {
    logger.warn("Delete task request", { taskId });

    await taskRepository.delete(taskId);

    logger.info("Task deleted", { taskId });
  }
}

export const taskService = new TaskService();
