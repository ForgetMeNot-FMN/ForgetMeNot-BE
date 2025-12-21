import { taskRepository } from "./taskRepository";
import { logger } from "../utils/logger";
import { taskDTO } from "../models/taskDTO";
import { gardenClient } from "./gardenClient";
import dayjs from "dayjs";


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


  async createTask(userId: string, body: taskDTO) {
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

  if (!body.start_time)
    throw new Error("start_time is required");

  let endTime: Date | null = null;

  if (dm) {
    const start = new Date(body.start_time);
    endTime = new Date(start.getTime() + dm * 60000); // dakika → ms
  }

  const task = await taskRepository.create(userId, {
    title: body.title,
    description: body.description || "",
    duration_minutes: dm ?? null, // null ise null olarak gitmesi için
    start_time: body.start_time,
    end_time: endTime,
    is_active: true,
    is_completed: false,
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

  async completeTask(taskId: string, userId: string) {
  const task = await taskRepository.getTaskById(taskId);
  if (!task) throw new Error("Task not found");

  if (task.is_completed)
    throw new Error("Task already completed");

  await taskRepository.update(taskId, {
    is_completed: true,
    is_active: false,
    completed_at: new Date(),
  });

  logger.info("Task completed", { taskId, userId });
  await gardenClient.addReward(userId, 3, 1); // 3 Coin, 1 Water eklenmesi

  return { message: "Task completed", coinsEarned: 3, waterEarned: 1 };
}

// Bugün tamamlanan taskler
async getTodayCompletedTasks(userId: string) {
  return taskRepository.getTodayCompletedTasks(userId);
}

// Bugün bitmesi gereken ama bitmemiş taskler
async getTodayUncompletedDueTasks(userId: string) {
  return taskRepository.getTodayUncompletedDueTasks(userId);
}


// Günlük task değerleri
async getTodayStats(userId: string) {
  const todayCompleted = await taskRepository.getTodayCompletedTasks(userId);
  const todayDue = await taskRepository.getTodayUncompletedDueTasks(userId);

  const totalToday = todayCompleted.length + todayDue.length;

  const completionRate =
    totalToday === 0 ? 0 : Math.round((todayCompleted.length / totalToday) * 100);

  return {
    date: dayjs().format("YYYY-MM-DD"),
    completed_today: todayCompleted.length,
    pending_today: todayDue.length,
    completion_rate: completionRate,
  };
}

// Genel task değerleri
async getOverallStats(userId: string) {
  const tasks = await taskRepository.getTasksByUserId(userId);

  const completed = tasks.filter(t => t.is_completed).length;
  const total = tasks.length;

  const rate = total === 0 ? 0 : Math.round((completed / total) * 100);

  return {
    total_tasks: total,
    completed_tasks: completed,
    overall_completion_rate: rate,
  };
}


}

export const taskService = new TaskService();
