import { habitRepository } from "./habitRepository";
import { logger } from "../utils/logger";
import { Habit, habitDTO } from "../models/habitModel";
import { v4 as uuidv4 } from "uuid";

class HabitService {
  async createHabit(userId: string, habitData: habitDTO): Promise<Habit> {
    console.log("Creating habit for user:", userId, "with data:", habitData);
    const habit: Habit = removeUndefined({
      id: uuidv4(),
      userId,
      title: habitData.title,
      description: habitData.description,
      startDate: habitData.startDate,
      schedule: habitData.schedule,
      type: habitData.type,
      targetValue: habitData.targetValue,
      status: "active",
      currentStreak: 0,
      longestStreak: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log("Habit object to be created:", habit);
    await habitRepository.create(habit);
    return habit;
  }

  async getActiveHabits(userId: string) {
    logger.debug("Get active habits request", { userId });

    const habits = await habitRepository.findActiveByUser(userId);
    if (!habits || habits.length === 0) {
      logger.warn("Habit not found", { userId });
      throw new Error("Habit not found");
    }

    logger.debug("Habit fetched", { userId });

    return habits;
  }

  async getHabit(userId: string, habitId: string) {
    logger.debug("Get habit request", { userId });

    const habit = await habitRepository.findById(habitId, userId);
    if (!habit) {
      logger.warn("Habit not found", { userId });
      throw new Error("Habit not found");
    }

    logger.debug("Habit fetched", { userId });

    return habit;
  }

  async deleteHabit(userId: string, habitId: string) {
    logger.warn("Delete habit request", { userId });

    const deletedHabit = await habitRepository.delete(userId, habitId);

    logger.info("Habit deleted", { userId });
    return deletedHabit;
  }
}

function removeUndefined<T extends object>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => v !== undefined)
  ) as T;
}

export const habitService = new HabitService();
