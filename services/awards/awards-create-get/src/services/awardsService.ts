import { awardsRepository } from "./awardsRepository";
import { logger } from "../utils/logger";
import { AwardsDTO } from "../models/awardsDTO";
import { AwardType } from "../models/awardsModel";
import { firestore } from "../services/firebaseAdmin";
import { envs } from "../utils/const";

type AwardProgress = {
  streak: number;
  flower: number;
};

type StrapiAwardDefinition = {
  key: string;
  title: string;
  awardType: AwardType;
  value: number;
  badgeImageUrl: string | null;
};

function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function toAbsoluteUrl(baseUrl: string, maybeRelative?: string): string | null {
  if (!maybeRelative) return null;
  if (maybeRelative.startsWith("http://") || maybeRelative.startsWith("https://")) {
    return maybeRelative;
  }
  return `${baseUrl.replace(/\/$/, "")}${maybeRelative.startsWith("/") ? "" : "/"}${maybeRelative}`;
}

function normalizeStrapiAward(item: any, baseUrl: string): StrapiAwardDefinition | null {
  const raw = item?.attributes ?? item;
  const key = raw?.key;
  const title = raw?.Title ?? raw?.title;
  const awardType = raw?.awardType;
  const value = Number(raw?.value);

  const badgeRaw = raw?.badgeImage?.data?.attributes ?? raw?.badgeImage?.data ?? raw?.badgeImage;
  const badgeImageUrl = toAbsoluteUrl(baseUrl, badgeRaw?.url);

  if (!key || !title || (awardType !== "streak" && awardType !== "flower") || !Number.isFinite(value)) {
    return null;
  }

  return {
    key,
    title,
    awardType,
    value,
    badgeImageUrl,
  };
}

function resolveEffectiveStreak(rawStreak: unknown, lastWateredDate: unknown): number {
  const streak = typeof rawStreak === "number" && Number.isFinite(rawStreak) ? rawStreak : 0;
  if (!lastWateredDate || typeof lastWateredDate !== "string") return streak;

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const todayStr = toLocalDateString(today);
  const yesterdayStr = toLocalDateString(yesterday);

  if (lastWateredDate < yesterdayStr && lastWateredDate !== todayStr) {
    return 0;
  }

  return streak;
}

class AwardsService {
  private async getAwardDefinitionsFromStrapi(): Promise<StrapiAwardDefinition[]> {
    if (!envs.STRAPI_BASE_URL) {
      throw new Error("STRAPI_BASE_URL env var is required for awards sync");
    }

    const baseUrl = envs.STRAPI_BASE_URL.replace(/\/$/, "");
    const url = new URL(`${baseUrl}/api/awards`);
    url.searchParams.set("pagination[pageSize]", "200");
    url.searchParams.set("sort[0]", "value:asc");
    url.searchParams.set("populate[0]", "badgeImage");

    const headers: Record<string, string> = {};
    if (envs.STRAPI_API_TOKEN) {
      headers.Authorization = `Bearer ${envs.STRAPI_API_TOKEN}`;
    }

    const response = await fetch(url.toString(), { headers });
    if (!response.ok) {
      const body = await response.text();
      logger.error("Failed to fetch awards from Strapi", { status: response.status, body });
      throw new Error(`Strapi awards fetch failed (${response.status})`);
    }

    const payload = await response.json() as any;
    const data = Array.isArray(payload?.data) ? payload.data : [];

    return data
      .map((item: any) => normalizeStrapiAward(item, baseUrl))
      .filter((item: StrapiAwardDefinition | null): item is StrapiAwardDefinition => item !== null);
  }

  async getAwards(userId: string) {
    logger.debug("Get awards request", { userId });
    return awardsRepository.getAwardsByUserId(userId);
  }

  async getAward(awardId: string) {
    logger.debug("Get single award request", { awardId });
    return awardsRepository.getAwardById(awardId);
  }

  async createAward(userId: string, body: AwardsDTO) {
    logger.info("Create award request", { userId });

    if (!body?.key) throw new Error("Award key is required");
    if (!body?.title) throw new Error("Award title is required");
    if (!body?.awardType) throw new Error("awardType is required");
    if (body.value === undefined || body.value === null) {
      throw new Error("value is required");
    }

    const award = await awardsRepository.create(userId, {
      key: body.key,
      title: body.title,
      awardType: body.awardType,
      value: Number(body.value),
      badgeImageUrl: body.badgeImageUrl ?? null,
      status: "unlocked",
      unlockedAt: new Date(),
    });

    logger.info("Award created successfully", { userId, awardId: award.awardId });
    return award;
  }

  async updateAward(awardId: string, body: Partial<AwardsDTO>) {
    logger.info("Update award request", { awardId });

    await awardsRepository.getAwardById(awardId);

    const updateData: any = {};

    if (body.key !== undefined) updateData.key = body.key;
    if (body.title !== undefined) updateData.title = body.title;
    if (body.awardType !== undefined) updateData.awardType = body.awardType;
    if (body.value !== undefined) updateData.value = Number(body.value);
    if (body.badgeImageUrl !== undefined) updateData.badgeImageUrl = body.badgeImageUrl;

    await awardsRepository.update(awardId, updateData);
    logger.info("Award updated", { awardId });

    return awardsRepository.getAwardById(awardId);
  }

  async deleteAward(awardId: string) {
    logger.warn("Delete award request", { awardId });
    await awardsRepository.delete(awardId);
    logger.info("Award deleted", { awardId });
  }

  private async getUserProgress(userId: string): Promise<AwardProgress> {
    const gardenDoc = await firestore.collection("gardens").doc(userId).get();

    if (!gardenDoc.exists) {
      return { streak: 0, flower: 0 };
    }

    const garden = gardenDoc.data() as any;
    const bloomedFlowersSnap = await firestore
      .collection("gardens")
      .doc(userId)
      .collection("flowers")
      .where("isAlive", "==", true)
      .where("growthStage", "==", "bloom")
      .get();

    return {
      streak: resolveEffectiveStreak(garden?.streak, garden?.lastWateredDate),
      flower: bloomedFlowersSnap.size,
    };
  }

  private meetsCondition(progress: AwardProgress, awardType: AwardType, value: number): boolean {
    if (awardType === "streak") {
      const met = progress.streak >= value;
      if (!met) {
        logger.debug("Streak award not met yet", {
          requiredValue: value,
          currentStreak: progress.streak,
        });
      }
      return met;
    }

    if (awardType === "flower") {
      const met = progress.flower >= value;
      if (!met) {
        logger.debug("Flower award not met yet", {
          requiredValue: value,
          currentFlowerCount: progress.flower,
        });
      }
      return met;
    }

    logger.warn("Unknown awardType in condition check", { awardType, value });
    return false;
  }

  async checkAwards(userId: string) {
    logger.info("Checking awards", { userId });

    const [definitions, progress] = await Promise.all([
      this.getAwardDefinitionsFromStrapi(),
      this.getUserProgress(userId),
    ]);

    logger.debug("Award definitions and progress loaded", {
      userId,
      definitionsCount: definitions.length,
      progress,
    });

    const unlocked = [] as any[];

    for (const def of definitions) {
      logger.debug("Evaluating award definition", {
        userId,
        key: def.key,
        awardType: def.awardType,
        value: def.value,
      });

      if (!this.meetsCondition(progress, def.awardType, def.value)) {
        logger.info("Award not earned yet", { userId, key: def.key, awardType: def.awardType, value: def.value, streak: progress.streak, flower: progress.flower });
        continue;
      }

      const existing = await awardsRepository.getAwardByUserIdAndKey(userId, def.key);
      if (existing) {
        logger.debug("Award already exists, skipping", { userId, key: def.key, awardId: existing.awardId });
        continue;
      }

      const created = await awardsRepository.create(userId, {
        key: def.key,
        title: def.title,
        awardType: def.awardType,
        value: def.value,
        badgeImageUrl: def.badgeImageUrl,
        status: "unlocked",
        unlockedAt: new Date(),
      });

      unlocked.push(created);

      logger.info("Award unlocked", { userId, awardId: created.awardId, key: created.key, awardType: created.awardType, value: created.value });
    }

    logger.info("Awards check completed", { userId, progress, unlockedCount: unlocked.length });

    const popupAwards = unlocked.map((award) => ({
      awardId: award.awardId,
      key: award.key,
      title: award.title,
      awardType: award.awardType,
      value: award.value,
      badgeImageUrl: award.badgeImageUrl ?? null,
      unlockedAt: award.unlockedAt,
    }));

    return {
      progress,
      unlockedCount: unlocked.length,
      unlocked,
      popup: {
        show: popupAwards.length > 0,
        items: popupAwards,
      },
    };
  }
}

export const awardsService = new AwardsService();


