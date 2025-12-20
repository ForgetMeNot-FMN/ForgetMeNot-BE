import { flowerRepository } from "./flowerRepository";
import { flowerLogger } from "../utils/flowerLogger";
import { GrowthStage } from "../utils/enums";
import dayjs from "dayjs";
import { gardenRepository } from "./gardenRepository";

class FlowerService {
  async createFlower(userId: string, data: any) {
    if (!data?.flower_name) throw new Error("flower_name is required");
    if (!data?.type) throw new Error("flower type is required");

    const flower = await flowerRepository.create(userId, {
      flower_name: data.flower_name,
      type: data.type,

      // Create olunca otomatik ayarlanması
      growth_stage: GrowthStage.SEED,
      is_alive: true,
      water_count: 0,
      last_watered_at: null,

    });

    flowerLogger.info("Flower created", { userId, flowerId: flower.flower_id });

    return flower;
  }

  // Get Single Flower
  async getFlower(userId: string, flowerId: string) {
  const flower = await flowerRepository.getById(userId, flowerId);
  if (!flower) throw new Error("Flower not found");

  // Otomatik çiçek öldürme
  // Çiçek seed ya da sprout evresinde ve 30 günden uzun süre bakılmadıysa çalışır
  if (flower.is_alive && flower.growth_stage !== GrowthStage.BLOOM) {
    const lastActivity = flower.last_watered_at
      ? dayjs(flower.last_watered_at)
      : dayjs(flower.created_at);

    const diffDays = dayjs().diff(lastActivity, "day");

    if (diffDays >= 30) {
      await flowerRepository.update(userId, flowerId, {
        is_alive: false,
      });

      flowerLogger.warn("Flower died.", {
        userId,
        flowerId,
        days_without_water: diffDays,
        stage: flower.growth_stage,
      });

      flower.is_alive = false;
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
  return flowers.filter(f => f.growth_stage === GrowthStage.BLOOM);
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
  if (!flower.is_alive) throw new Error("Flower is dead");

  let newWaterCount = flower.water_count + 1;
  let growthStage = flower.growth_stage;

  if (newWaterCount === 3) growthStage = GrowthStage.SPROUT;
  if (newWaterCount === 7) growthStage = GrowthStage.BLOOM;

  // Flower update
  await flowerRepository.update(userId, flowerId, {
    water_count: newWaterCount,
    last_watered_at: new Date(),
    growth_stage: growthStage,
  });

  // Garden ın suyunu azaltma
  await gardenRepository.update(userId, {
    water: garden.water - 1,
  });

  flowerLogger.info("Flower watered", {
    userId,
    flowerId,
    newWaterCount,
    growthStage,
  });

  return {
    flower: {
      water_count: newWaterCount,
      growth_stage: growthStage,
      last_watered_at: new Date(),
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
    if (!flower.is_alive) throw new Error("Flower already dead");

    //  Bloom evresi kontrolü
    if (flower.growth_stage === GrowthStage.BLOOM) {
        throw new Error("Bloom flowers cannot die");
    }

    const now = dayjs();

    const lastActivity = flower.last_watered_at
        ? dayjs(flower.last_watered_at)
        : dayjs(flower.created_at);

    const diffDays = now.diff(lastActivity, "day");

    if (diffDays < 30) {
        throw new Error(
        `Flower cannot die yet. Last activity was ${diffDays} days ago`
        );
    }

    await flowerRepository.update(userId, flowerId, {
        is_alive: false,
    });

    flowerLogger.warn("Flower died after 1 month of inactivity", {
        userId,
        flowerId,
        days_without_water: diffDays,
    });
    }



  //  Delete Flower
  async deleteFlower(userId: string, flowerId: string) {
    await flowerRepository.delete(userId, flowerId);
    flowerLogger.warn("Flower deleted", { userId, flowerId });
  }
}

export const flowerService = new FlowerService();
