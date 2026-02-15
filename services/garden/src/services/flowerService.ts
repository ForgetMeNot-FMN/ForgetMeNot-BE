import { flowerRepository } from "./flowerRepository";
import { logger } from "../utils/flowerLogger";
import { GrowthStage } from "../utils/enums";
import dayjs from "dayjs";
import { flowerDefinitionRepository } from "./flowerDefinitions/flowerDefinitionRepository";
import { firestore } from "./firebaseAdmin";

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
      plantedAt: null,
      location: "INVENTORY",
    });

    logger.info("Flower created", { userId, flowerId: flower.flowerId });

    return flower;
  }

  // Get Flower
  async getFlower(userId: string, flowerId: string) {
    const flower = await flowerRepository.getById(userId, flowerId);
    if (!flower) throw new Error("Flower not found");

    if (
      flower.isAlive &&
      flower.location === "GARDEN" &&
      flower.growthStage !== GrowthStage.BLOOM &&
      flower.plantedAt
    ) {
      const definition =
        await flowerDefinitionRepository.getByKey(flower.type);

      if (definition) {
        const lifespanDays = definition.lifespanDays;

        const lastActivity =
          flower.lastWateredAt
            ? dayjs(flower.lastWateredAt)
            : dayjs(flower.plantedAt);

        const diffDays = dayjs().diff(lastActivity, "day");

        if (diffDays >= lifespanDays) {
          await flowerRepository.update(userId, flowerId, {
            isAlive: false,
          });

          logger.warn("Flower died.", {
            userId,
            flowerId,
            daysWithoutWater: diffDays,
          });

          flower.isAlive = false;
        }
      }
    }

    return flower;
  }

  // Get All Flowers
  async getAllFlowers(userId: string) {
    const flowers = await flowerRepository.getAll(userId);
    return flowers.filter(f => f.isAlive);
  }

  // Sadece bloomed çiçekler
  async getAllBloomedFlowers(userId: string) {
    const flowers = await flowerRepository.getAll(userId);
    return flowers.filter(
      f => f.growthStage === GrowthStage.BLOOM && f.isAlive
    );
  }

  // Water Flower
  async waterFlower(userId: string, flowerId: string) {

    const COOLDOWN_HOURS = 12; // 12 saatte 1 sulama max

    return await firestore.runTransaction(async (tx) => {

      const now = new Date();

      const gardenRef = firestore.collection("gardens").doc(userId);
      const flowerRef = gardenRef.collection("flowers").doc(flowerId);

      const gardenSnap = await tx.get(gardenRef);
      if (!gardenSnap.exists)
        throw new Error("Garden not found");

      const flowerSnap = await tx.get(flowerRef);
      if (!flowerSnap.exists)
        throw new Error("Flower not found");

      const garden = gardenSnap.data()!;
      const flower = flowerSnap.data()!;

      if (garden.water <= 0)
        throw new Error("No water left");

      if (!flower.isAlive)
        throw new Error("Flower is dead");

      if (flower.location !== "GARDEN")
        throw new Error("Flower is not planted");

      if (flower.growthStage === GrowthStage.BLOOM)
        throw new Error("Flower already bloomed");

      // 12 saat cooldown
      if (flower.lastWateredAt) {
        const lastWateredAt = flower.lastWateredAt.toDate();

        const diffHours = dayjs(now).diff(
          dayjs(lastWateredAt),
          "hour"
        );

        if (diffHours < COOLDOWN_HOURS) {
          throw new Error(
            `Flower was watered recently. Try again in ${COOLDOWN_HOURS - diffHours} hours`
          );
        }
      }

      const definition =
        await flowerDefinitionRepository.getByKey(flower.type);

      if (!definition)
        throw new Error("Flower definition not found");

      const newWaterCount = flower.waterCount + 1;
      let growthStage = flower.growthStage;

      if (newWaterCount === definition.growth.seedToSprout)
        growthStage = GrowthStage.SPROUT;

      if (newWaterCount === definition.growth.sproutToBloom)
        growthStage = GrowthStage.BLOOM;

      tx.update(flowerRef, {
        waterCount: newWaterCount,
        lastWateredAt: now,
        growthStage,
        updatedAt: now,
      });

      tx.update(gardenRef, {
        water: garden.water - 1,
        updatedAt: now,
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
          growthStage,
          lastWateredAt: now,
        },
        garden: {
          waterLeft: garden.water - 1,
        }
      };
    });
  }

  //  Kill Flower 
  async killFlower(userId: string, flowerId: string) {
    const flower = await this.getFlower(userId, flowerId);
    if (!flower) throw new Error("Flower not found");
    if (!flower.isAlive) throw new Error("Flower already dead");

    if (flower.growthStage === GrowthStage.BLOOM)
      throw new Error("Bloom flowers cannot die");

    if (flower.location !== "GARDEN")
      throw new Error("Flower is not in garden");

    const definition =
      await flowerDefinitionRepository.getByKey(flower.type);

    if (!definition)
      throw new Error("Flower definition not found");

    const lifespanDays = definition.lifespanDays;

    const lastActivity =
      flower.lastWateredAt
        ? dayjs(flower.lastWateredAt)
        : dayjs(flower.plantedAt);

    const diffDays = dayjs().diff(lastActivity, "day");

    if (diffDays < lifespanDays)
      throw new Error(
        `Flower cannot die yet. Last activity was ${diffDays} days ago`
      );

    await flowerRepository.update(userId, flowerId, {
      isAlive: false,
    });

    logger.warn("Flower force killed", {
      userId,
      flowerId,
      daysWithoutWater: diffDays,
    });
  }

  // Delete
  async deleteFlower(userId: string, flowerId: string) {

    return await firestore.runTransaction(async (tx) => {

      const gardenRef = firestore.collection("gardens").doc(userId);
      const flowerRef = gardenRef
        .collection("flowers")
        .doc(flowerId);

      const gardenSnap = await tx.get(gardenRef);
      if (!gardenSnap.exists)
        throw new Error("Garden not found");

      const flowerSnap = await tx.get(flowerRef);
      if (!flowerSnap.exists)
        throw new Error("Flower not found");

      const garden = gardenSnap.data();

      tx.delete(flowerRef);

      const newTotal =
        garden.totalFlowers > 0
          ? garden.totalFlowers - 1
          : 0;

      tx.update(gardenRef, {
        totalFlowers: newTotal,
        updatedAt: new Date(),
      });

      logger.warn("Flower deleted", {
        userId,
        flowerId,
        totalFlowersAfterDelete: newTotal,
      });

      return {
        success: true,
        totalFlowers: newTotal
      };
    });
  }

  // Plant Flower
  async plantFlower(userId: string, flowerId: string) {

    return await firestore.runTransaction(async (tx) => {

      const now = new Date();

      const gardenRef = firestore.collection("gardens").doc(userId);
      const flowersRef = gardenRef.collection("flowers");
      // Planted'ın sadece 1 çiçek olması
      const plantedQuery = await tx.get(
        flowersRef
          .where("location", "==", "GARDEN")
          .where("isAlive", "==", true)
          .limit(1)
      );

      if (!plantedQuery.empty) {
        throw new Error("Only one flower can be planted at a time");
      }

      const flowerRef = flowersRef.doc(flowerId);
      const flowerSnap = await tx.get(flowerRef);

      if (!flowerSnap.exists)
        throw new Error("Flower not found");

      const flower = flowerSnap.data()!;

      if (!flower.isAlive)
        throw new Error("Flower is dead");

      if (flower.plantedAt)
        throw new Error("Flower already planted");

      tx.update(flowerRef, {
        plantedAt: now,
        updatedAt: now,
        location: "GARDEN",
      });

      logger.info("Flower planted", {
        userId,
        flowerId,
      });

      return {
        flowerId,
        plantedAt: now,
      };
    });
  }

  // Bloom olmuş olan çiçeği inventory e ekleme
  async moveToInventory(userId: string, flowerId: string) {
      return await firestore.runTransaction(async (tx) => {
      const flowerRef =
        firestore.collection("gardens")
          .doc(userId)
          .collection("flowers")
          .doc(flowerId);

      const snap = await tx.get(flowerRef);
      if (!snap.exists)
        throw new Error("Flower not found");

      const flower = snap.data()!;

      if (flower.location !== "GARDEN")
        throw new Error("Flower is not in garden");

      if (flower.growthStage !== GrowthStage.BLOOM)
        throw new Error("Only bloomed flowers can be moved");

      tx.update(flowerRef, {
        location: "INVENTORY",
        plantedAt: null,
        updatedAt: new Date(),
      });

      logger.info("Flower moved to inventory", {
        userId,
        flowerId,
      });

      return { success: true };
    });
  }

  // Inventory'deki çiçekler
  async getInventoryFlowers(userId: string) {
    const flowers = await flowerRepository.getAll(userId);

    return flowers.filter(f =>
      f.isAlive &&
      f.location === "INVENTORY"
    );
  }

  // Bahçede dikili olan çiçek
  async getActiveGardenFlower(userId: string) {
    const flowers = await flowerRepository.getAll(userId);

    return (
      flowers.find(f =>
        f.isAlive &&
        f.location === "GARDEN"
      ) ?? null
    );
  }

}
export const flowerService = new FlowerService();
