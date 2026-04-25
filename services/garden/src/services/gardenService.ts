import { gardenRepository } from "./gardenRepository";
import { flowerRepository } from "./flowerRepository";
import { logger } from "../utils/logger";
import { computeStreak } from "./flowerService";
import dayjs from "dayjs";
import { Flower } from "../models/flowerModel";
import { flowerDefinitionRepository } from "./flowerDefinitions/flowerDefinitionRepository";
import { resolveLocalizedText, SupportedLocale } from "../utils/localization";

class GardenService {
  private serializeFlowerForResponse(flower: Flower) {
    const {
      flowerNameTranslations,
      isCustomName,
      ...publicFlower
    } = flower;

    return publicFlower;
  }

  private async localizeFlower(flower: Flower, locale: SupportedLocale) {
    if (flower.isCustomName) {
      return flower;
    }

    if (flower.flowerNameTranslations) {
      return {
        ...flower,
        flowerName: resolveLocalizedText(
          flower.flowerNameTranslations,
          locale,
          flower.flowerName
        ),
      };
    }

    const definition = await flowerDefinitionRepository.getByKey(flower.type);

    if (!definition) {
      return flower;
    }

    const localizedName = resolveLocalizedText(
      definition.displayNameTranslations ?? definition.displayName,
      locale,
      definition.displayName
    );

    const knownNames = new Set(
      [
        definition.displayName,
        definition.displayNameTranslations?.en,
        definition.displayNameTranslations?.tr,
      ].filter(Boolean)
    );

    if (!knownNames.has(flower.flowerName)) {
      return flower;
    }

    return {
      ...flower,
      flowerName: localizedName,
    };
  }

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

    // ğŸ” LAZY RESET
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

  async getGardenView(userId: string, locale: SupportedLocale = "en") {
    const garden = await this.getGarden(userId);
    const flowers = await flowerRepository.getAll(userId);

    const activeFlowerRaw =
      flowers.find(
        f => f.isAlive && f.location === "GARDEN"
      ) ?? null;

    const inventoryFlowersRaw =
      flowers.filter(
        f => f.isAlive && f.location === "INVENTORY"
      );

    const activeFlower = activeFlowerRaw
      ? this.serializeFlowerForResponse(
          await this.localizeFlower(activeFlowerRaw, locale)
        )
      : null;

    const inventoryFlowers = await Promise.all(
      inventoryFlowersRaw.map(async (flower) =>
        this.serializeFlowerForResponse(
          await this.localizeFlower(flower, locale)
        )
      )
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
