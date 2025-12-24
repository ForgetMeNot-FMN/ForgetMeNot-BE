import { flowerRepository } from "./flowerRepository";
import { logger } from "../utils/flowerLogger";
import { GrowthStage } from "../utils/enums";
import dayjs from "dayjs";
import { gardenRepository } from "./gardenRepository";

class FlowerService {
  async createFlower(userId: string, data: any) {
    if (!data?.flowerName) throw new Error("flowerName is required");
    if (!data?.type) throw new Error("flower type is required");

    const flower = await flowerRepository.create(userId, {
      flowerName: data.flowerName,
      type: data.type,

      // Create olunca otomatik ayarlanması
      growthStage: GrowthStage.SEED,
      isAlive: true,
      waterCount: 0,
      lastWateredAt: null,

    });

    logger.info("Flower created", { userId, flowerId: flower.flowerId });

    return flower;
  }

  // Get Single Flower
  async getFlower(userId: string, flowerId: string) {
  const flower = await flowerRepository.getById(userId, flowerId);
  if (!flower) throw new Error("Flower not found");

  // Otomatik çiçek öldürme
  // Çiçek seed ya da sprout evresinde ve 30 günden uzun süre bakılmadıysa çalışır
  if (flower.isAlive && flower.growthStage !== GrowthStage.BLOOM) {
    const lastActivity = flower.lastWateredAt
      ? dayjs(flower.lastWateredAt)
      : dayjs(flower.createdAt);

    const diffDays = dayjs().diff(lastActivity, "day");

    if (diffDays >= 30) {
      await flowerRepository.update(userId, flowerId, {
        isAlive: false,
      });

      logger.warn("Flower died.", {
        userId,
        flowerId,
        daysWithoutWater: diffDays,
        stage: flower.growthStage,
      });

      flower.isAlive = false;
    }
  }

  return flower;
}


  // Get All Flowers
  async getAllFlowers(userId: string) {
    return flowerRepository.getAll(userId);
  }

  // Get All Flowers that are bloomed
  async getAllBloomedFlowers(userId: string) {
  const flowers = await flowerRepository.getAll(userId);
  return flowers.filter(f => f.growthStage === GrowthStage.BLOOM);
}

  // Water Flower
  async waterFlower(userId: string, flowerId: string) {
  // Garden'da su var mı kontrolü
  const garden = await gardenRepository.getByUserId(userId);
  if (!garden) throw new Error("Garden not found");

  if (garden.water <= 0) {
    throw new Error("No water left to water flower");
  }

  const flower = await this.getFlower(userId, flowerId);
  if (!flower.isAlive) throw new Error("Flower is dead");

  let newWaterCount = flower.waterCount + 1;
  let growthStage = flower.growthStage;

  if (newWaterCount === 3) growthStage = GrowthStage.SPROUT;
  if (newWaterCount === 7) growthStage = GrowthStage.BLOOM;

  // Flower update
  await flowerRepository.update(userId, flowerId, {
    waterCount: newWaterCount,
    lastWateredAt: new Date(),
    growthStage: growthStage,
  });

  // Garden ın suyunu azaltma
  await gardenRepository.update(userId, {
    water: garden.water - 1,
  });

  logger.info("Flower watered", {
    userId,
    flowerId,
    newWaterCount,
    growthStage,
  });

  return {
    flower: {
      waterCount: newWaterCount,
      growthStage: growthStage,
      lastWateredAt: new Date(),
    },
    garden: {
      waterLeft: garden.water - 1,
    }
  };
}


  //  Kill Flower 
  // (Kontrol için ya da ileride Cloud Function/Scheduler kullanma ihtimalimiz için)
  async killFlower(userId: string, flowerId: string) {
    const flower = await this.getFlower(userId, flowerId);
    if (!flower) throw new Error("Flower not found");
    if (!flower.isAlive) throw new Error("Flower already dead");

    //  Bloom evresi kontrolü
    if (flower.growthStage === GrowthStage.BLOOM) {
        throw new Error("Bloom flowers cannot die");
    }

    const now = dayjs();

    const lastActivity = flower.lastWateredAt
        ? dayjs(flower.lastWateredAt)
        : dayjs(flower.createdAt);

    const diffDays = now.diff(lastActivity, "day");

    if (diffDays < 30) {
        throw new Error(
        `Flower cannot die yet. Last activity was ${diffDays} days ago`
        );
    }

    await flowerRepository.update(userId, flowerId, {
        isAlive: false,
    });

    logger.warn("Flower died after 1 month of inactivity", {
        userId,
        flowerId,
        daysWithoutWater: diffDays,
    });
    }



  //  Delete Flower
  async deleteFlower(userId: string, flowerId: string) {
    await flowerRepository.delete(userId, flowerId);
    logger.warn("Flower deleted", { userId, flowerId });
  }
}

export const flowerService = new FlowerService();
