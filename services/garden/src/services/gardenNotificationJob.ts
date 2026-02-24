import dayjs from "dayjs";
import { firestore } from "./firebaseAdmin";
import { flowerDefinitionRepository } from "./flowerDefinitions/flowerDefinitionRepository";
import { createNotificationIfNotExists } from "./notificationClient";
import { flowerRepository } from "./flowerRepository";
import { logger } from "../utils/logger";

type ActiveGardenItem = {
  _id: string;
  userId: string;
  lastWatered: Date;
  lifespan: number;
  isAlive: boolean;
};

export type GardenNotificationJobResult = {
  processedGardens: number;
  activeFlowers: number;
  created: number;
  skippedExisting: number;
  userNotFound: number;
  failed: number;
  now: string;
};

export async function runGardenNotificationJob(): Promise<GardenNotificationJobResult> {
  const now = new Date();
  const gardensSnapshot = await firestore.collection("gardens").get();

  const result: GardenNotificationJobResult = {
    processedGardens: gardensSnapshot.size,
    activeFlowers: 0,
    created: 0,
    skippedExisting: 0,
    userNotFound: 0,
    failed: 0,
    now: now.toISOString(),
  };

  for (const gardenDoc of gardensSnapshot.docs) {
    const userId = gardenDoc.id;

    try {
      const activeFlower = await flowerRepository.getActiveFlowerByUserId(userId);
      if (!activeFlower) {
        continue;
      }

      const definition = await flowerDefinitionRepository.getByKey(activeFlower.type);
      if (!definition) {
        logger.warn("Flower definition not found", {
          userId,
          type: activeFlower.type,
          flowerId: activeFlower.flowerId,
        });
        continue;
      }

      const lastWatered =
        activeFlower.lastWateredAt ??
        activeFlower.plantedAt ??
        activeFlower.createdAt ??
        now;

      const gardenItem: ActiveGardenItem = {
        _id: activeFlower.flowerId,
        userId,
        lastWatered,
        lifespan: definition.lifespanDays * 24,
        isAlive: activeFlower.isAlive,
      };

      result.activeFlowers += 1;

      const hoursPassed = dayjs(now).diff(dayjs(gardenItem.lastWatered), "hour", true);

      let notificationStatus: "created" | "skipped_existing" | null = null;

      // Priority: DEAD > DYING > WATER (single notification per run)
      if (gardenItem.isAlive === false || hoursPassed >= gardenItem.lifespan) {
        notificationStatus = await createNotificationIfNotExists({
          userId: gardenItem.userId,
          sourceId: `GARDEN_DEAD_${gardenItem._id}`,
          title: "Your flower has died 💀",
        });
      } else if (hoursPassed >= gardenItem.lifespan * 0.7) {
        notificationStatus = await createNotificationIfNotExists({
          userId: gardenItem.userId,
          sourceId: `GARDEN_DYING_${gardenItem._id}`,
          title: "Your flower is wilting 😢 Water it soon!💧",
        });
      } else if (hoursPassed >= 12) {
        notificationStatus = await createNotificationIfNotExists({
          userId: gardenItem.userId,
          sourceId: `GARDEN_WATER_${gardenItem._id}`,
          title: "Time to water your flower🌱",
        });
      }

      if (notificationStatus === "created") result.created += 1;
      if (notificationStatus === "skipped_existing") result.skippedExisting += 1;

      logger.info("Garden flower evaluated", {
        userId,
        flowerId: gardenItem._id,
        isAlive: gardenItem.isAlive,
        hoursPassed,
        lifespanHours: gardenItem.lifespan,
        notificationStatus,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      if (message.includes("User not found")) {
        result.userNotFound += 1;
        logger.warn("Garden notification skipped: user not found in notification service", {
          userId,
          error: message,
        });
        continue;
      }

      result.failed += 1;
      logger.error("Garden notification job failed for user", {
        userId,
        error: message,
      });
    }
  }

  logger.info("Garden notification cron job finished", result);
  return result;
}
