import { gardenRepository } from "./gardenRepository";
import { logger } from "../utils/logger";

class GardenService {
  async createGarden(userId: string) {
    logger.info("Create garden request", { userId });

    const existing = await gardenRepository.getByUserId(userId);
    if (existing) {
      logger.warn("Garden already exists", { userId });
      throw new Error("Garden already exists");
    }

    const created = await gardenRepository.createDefault(userId);

    logger.info("Garden created successfully", { userId });

    return created;
  }

  async getGarden(userId: string) {
    logger.debug("Get garden request", { userId });

    const garden = await gardenRepository.getByUserId(userId);
    if (!garden) {
      logger.warn("Garden not found", { userId });
      throw new Error("Garden not found");
    }

    logger.debug("Garden fetched", { userId });

    return garden;
  }

  async addWater(userId: string, amount: number) {
    logger.info("Add water request", { userId, amount });

    const garden = await this.getGarden(userId);

    await gardenRepository.update(userId, {
      water: garden.water + amount,
      total_watered_count: garden.total_watered_count + amount,
    });

    logger.info("Water added", { userId, newWater: garden.water + amount });

    return this.getGarden(userId);
  }

  async addCoins(userId: string, amount: number) {
    logger.info("Add coins request", { userId, amount });

    const garden = await this.getGarden(userId);

    await gardenRepository.update(userId, {
      coins: garden.coins + amount,
    });

    logger.info("Coins added", { userId, newCoins: garden.coins + amount });

    return this.getGarden(userId);
  }

  async increaseStreak(userId: string) {
    logger.info("Increase streak request", { userId });

    const garden = await this.getGarden(userId);

    await gardenRepository.update(userId, {
      streak: garden.streak + 1,
    });

    logger.info("Streak increased", { userId, newStreak: garden.streak + 1 });

    return this.getGarden(userId);
  }

  async deleteGarden(userId: string) {
    logger.warn("Delete garden request", { userId });

    await gardenRepository.delete(userId);

    logger.info("Garden deleted", { userId });
  }
}

export const gardenService = new GardenService();
