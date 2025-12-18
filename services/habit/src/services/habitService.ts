import { habitRepository } from "./habitRepository";
import { logger } from "../utils/logger";
import { Habit } from "../models/habitModel";

class HabitService {
  async createHabit(userId: string, habitData: Partial<Habit>) {
    logger.info("Create habit request", { userId });

    const existing = await habitRepository.findById(habitData.id, userId);
    if (existing) {
      logger.warn("Habit already exists", { userId });
      throw new Error("Habit already exists");
    }

    const created = await habitRepository.create(habitData as Habit);

    logger.info("Habit created successfully", { userId });

    return created;
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

  async deleteHabit(userId: string, habitData: Partial<Habit>) {
    logger.warn("Delete habit request", { userId });

    await habitRepository.delete(userId, habitData.id);

    logger.info("Habit deleted", { userId });
  }
}

export const habitService = new HabitService();
