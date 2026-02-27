import { taskRepository } from "./taskRepository";
import { logger } from "../utils/logger";
import { taskDTO } from "../models/taskDTO";
import { normalizeDateOnly, normalizeDateTime } from "../utils/dateParser";
import dayjs from "dayjs";
import { notificationClient } from "../clients/notificationClient";
import { envs } from "../utils/const";

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

    const dm = body.durationMinutes;

    if (dm !== undefined && dm !== null) {
      if (typeof dm !== "number" || !Number.isInteger(dm) || dm <= 0) {
        logger.warn("Invalid durationMinutes", { userId, dm });
        throw new Error(
          "durationMinutes must be a positive integer in minutes or null",
        );
      }
    }

    if (!body.startTime) {
      throw new Error("startTime is required");
    }

    const startTime = normalizeDateTime(body.startTime);
    const endTime = body.endTime ? normalizeDateTime(body.endTime) : null;

    const startDate = normalizeDateOnly(body.startDate);
    const endDate = normalizeDateOnly(body.endDate);

  // Duration varsa endTime'ın otomatik hesaplanması
    let finalEndTime = endTime;

    if (dm && startTime && !endTime) {
      finalEndTime = new Date(startTime.getTime() + dm * 60000);
    }

    const task = await taskRepository.create(userId, {
      title: body.title,
      description: body.description || "",
      durationMinutes: dm ?? null,
      startTime,
      endTime,
      startDate: body.startDate ?? null,
      endDate: body.endDate ?? null,
      locationTrigger: body.locationTrigger ?? null,
      isActive: true,
      isCompleted: false,
      rewardGranted: false,
      rewardGrantedAt: null,
    });

    logger.info("Task created successfully", {
      userId,
      taskId: task.taskId,
    });

    logger.info("Checking notification settings for new task", {
      userId,
      taskId: task.taskId,
      notificationEnabled: body.notificationEnabled,
      notificationTime: body.notificationTime,
    });
    if (!body.notificationEnabled) {
      return task;
    }

    const notificationTime = body.notificationTime
      ? normalizeDateTime(body.notificationTime)
      : startTime;

    if (!notificationTime) {
      logger.warn("Notification time is missing, skipping notification", {
        userId,
        taskId: task.taskId,
      });
      return task;
    }

    if (notificationTime < new Date()) {
      logger.warn(
        "Notification time is in the past, skipping notification creation",
        {
          userId,
          taskId: task.taskId,
          notificationTime: notificationTime.toISOString(),
        },
      );
      return task;
    }

    try {
      await notificationClient.createNotification({
        userId,
        title: task.title,
        scheduledAt: notificationTime,
        taskId: task.taskId,
      });

      logger.info("Task notification created", {
        userId,
        notificationTime: notificationTime.toISOString(),
      });
    } catch (err) {
      logger.error("Failed to create task notification", {
        userId,
        taskId: task.taskId,
        err,
        errorMessage: err instanceof Error ? err.message : "Unknown error",
      });
    }
    return task;
  }

  

  async deleteTask(taskId: string) {
    logger.warn("Delete task request", { taskId });

    await taskRepository.delete(taskId);
    logger.info("Task deleted", { taskId });

    const notificationId =
      await taskRepository.getNotificationIdByTaskId(taskId);
    await notificationClient.cancelTaskNotifications(notificationId);
    logger.info("Related task notifications cancelled", { taskId });
  }

  async updateTask(taskId: string, body: Partial<taskDTO>) {
    logger.info("Update task request", { taskId });

    const task = await taskRepository.getTaskById(taskId);
    if (!task) throw new Error("Task not found");

    const updateData: any = {};

    if (body.title !== undefined) updateData.title = body.title;

    if (body.description !== undefined)
      updateData.description = body.description;

    if (body.startDate !== undefined)
      updateData.startDate = normalizeDateOnly(body.startDate);

    if (body.endDate !== undefined)
      updateData.endDate = normalizeDateOnly(body.endDate);

    if (body.startTime !== undefined)
      updateData.startTime = normalizeDateTime(body.startTime);

    if (body.endTime !== undefined)
      updateData.endTime = normalizeDateTime(body.endTime);

    if (body.locationTrigger !== undefined)
      updateData.locationTrigger = body.locationTrigger;

    let duration = body.durationMinutes ?? task.durationMinutes;

    let startTime =
      body.startTime !== undefined
      ? (typeof body.startTime === "string"
          ? new Date(body.startTime)
          : body.startTime)
        : task.startTime;

    if (duration && startTime) {
      updateData.durationMinutes = duration;
      updateData.startTime = startTime;
      updateData.endTime = new Date(startTime.getTime() + duration * 60000);
    }

    await taskRepository.update(taskId, updateData);

    logger.info("Task updated", { taskId });

    return {
      ...task,
      ...updateData,
    };
  }


  async completeTask(taskId: string, userId: string) {
    const rewardCoins = envs.TASK_REWARD_COINS;
    const rewardWater = envs.TASK_REWARD_WATER;

    const result = await taskRepository.completeTaskWithReward(
      taskId,
      userId,
      rewardCoins,
      rewardWater,
    );

    logger.info("Task completed", { taskId, userId, result });
    await notificationClient.cancelTaskNotifications(taskId);
    logger.info("Related task notifications stopped", { taskId });
    return result;
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
      totalToday === 0
        ? 0
        : Math.round((todayCompleted.length / totalToday) * 100);

    return {
      date: dayjs().format("YYYY-MM-DD"),
      completedToday: todayCompleted.length,
      pendingToday: todayDue.length,
      completionRate: completionRate,
    };
  }

// Genel task değerleri
  async getOverallStats(userId: string) {
    const tasks = await taskRepository.getTasksByUserId(userId);

    const completed = tasks.filter((t) => t.isCompleted).length;
    const total = tasks.length;

    const rate = total === 0 ? 0 : Math.round((completed / total) * 100);

    return {
      totalTasks: total,
      completedTasks: completed,
      overallCompletionRate: rate,
    };
  }
}

export const taskService = new TaskService();
