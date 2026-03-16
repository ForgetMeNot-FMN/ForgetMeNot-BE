import { gardenRepository } from "./gardenRepository";
import { flowerRepository } from "./flowerRepository";
import { logger } from "../utils/logger";
import { computeStreak } from "./flowerService";
import dayjs from "dayjs";

class GardenService {

  async createGarden(userId: string) {
    const existing = await gardenRepository.getByUserId(userId);
    logger.info("Creating garden", { userId, existing: !!existing });
    if (existing) throw new Error("Garden already exists");
    return gardenRepository.createDefault(userId);
  }

  async getGarden(userId: string) {
    const garden = await gardenRepository.getByUserId(userId);
    if (!garden) throw new Error("Garden not found");

    const yesterday = dayjs().subtract(1, "day").format("YYYY-MM-DD");

    // 🔁 LAZY RESET
    if (garden.lastWateredDate && garden.lastWateredDate < yesterday) {
      await gardenRepository.update(userId, { streak: 0 });
      garden.streak = 0;
    }

    return garden;
  }

  async waterGarden(userId: string) {
    const garden = await this.getGarden(userId);
    if (garden.water <= 0) throw new Error("No water left");

    const today = dayjs().format("YYYY-MM-DD");
    const yesterday = dayjs().subtract(1, "day").format("YYYY-MM-DD");
    const newStreak = computeStreak(garden.streak, garden.lastWateredDate ?? null, today, yesterday);

    await gardenRepository.update(userId, {
      water: garden.water - 1,
      streak: newStreak,
      lastWateredDate: today,
      totalWateredCount: garden.totalWateredCount + 1,
    });

    logger.info("Garden watered", { userId, newStreak });

    return {
      streak: newStreak,
      waterLeft: garden.water - 1,
    };
  }

  async addWater(userId: string, amount: number) {
    const garden = await this.getGarden(userId);
    await gardenRepository.update(userId, {
      water: garden.water + amount,
    });
    return this.getGarden(userId);
  }

  async addCoins(userId: string, amount: number) {
    const garden = await this.getGarden(userId);
    await gardenRepository.update(userId, {
      coins: garden.coins + amount,
    });
    return this.getGarden(userId);
  }

  async deleteGarden(userId: string) {
    await gardenRepository.delete(userId);
  }

  async getGardenView(userId: string) {

    const garden = await this.getGarden(userId);

    const flowers = await flowerRepository.getAll(userId);

    const activeFlower =
      flowers.find(
        f => f.isAlive && f.location === "GARDEN"
      ) ?? null;

    const inventoryFlowers =
      flowers.filter(
        f => f.isAlive && f.location === "INVENTORY"
      );

    return {
      coins: garden.coins,
      water: garden.water,
      streak: garden.streak,
      activeFlower,
      inventoryFlowers,
    };
  }

}

export const gardenService = new GardenService();
