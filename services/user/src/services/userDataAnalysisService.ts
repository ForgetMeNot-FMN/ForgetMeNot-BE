import dayjs, { Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
import timezonePlugin from "dayjs/plugin/timezone";
import { userDataAnalysisRepository } from "./userDataAnalysisRepository";
import {
  AnalysisPeriod,
  AnalysisSeriesPoint,
  UserDataAnalysis,
} from "../models/userDataAnalysisModel";
import { envs } from "../utils/const";
import { logger } from "../utils/logger";

dayjs.extend(utc);
dayjs.extend(timezonePlugin);

export interface UserDataAnalysisQuery {
  period: AnalysisPeriod;
}

interface Bucket {
  label: string;
  start: Dayjs;
  end: Dayjs;
}

const DEFAULT_TIMEZONE = "Europe/Istanbul";

function getRollingPeriodRange(period: AnalysisPeriod, now: Dayjs) {
  const end = now;

  if (period === "weekly") {
    return {
      start: end.subtract(7, "day"),
      end,
    };
  }

  if (period === "monthly") {
    return {
      start: end.subtract(1, "month"),
      end,
    };
  }

  return {
    start: end.subtract(1, "year"),
    end,
  };
}

function buildBuckets(period: AnalysisPeriod, range: { start: Dayjs; end: Dayjs }): Bucket[] {
  const buckets: Bucket[] = [];

  if (period === "yearly") {
    let cursor = range.start.startOf("month");
    while (cursor.isBefore(range.end) || cursor.isSame(range.end, "month")) {
      const start = cursor;
      buckets.push({
        label: start.format("YYYY-MM"),
        start,
        end: start.endOf("month"),
      });
      cursor = cursor.add(1, "month");
    }
    return buckets;
  }

  let cursor = range.start.startOf("day");
  while (cursor.isBefore(range.end) || cursor.isSame(range.end, "day")) {
    buckets.push({
      label: cursor.format("YYYY-MM-DD"),
      start: cursor,
      end: cursor.endOf("day"),
    });
    cursor = cursor.add(1, "day");
  }

  return buckets;
}

function toBucketIndex(buckets: Bucket[], value: Date | string | null, timezone: string) {
  if (!value) return -1;

  const timestamp = typeof value === "string"
    ? dayjs.tz(value, "YYYY-MM-DD", timezone)
    : dayjs(value).tz(timezone);

  return buckets.findIndex((bucket) =>
    (timestamp.isAfter(bucket.start) || timestamp.isSame(bucket.start)) &&
    (timestamp.isBefore(bucket.end) || timestamp.isSame(bucket.end))
  );
}

class UserDataAnalysisService {
  getPeriodRangeForTest(period: AnalysisPeriod, nowIso: string, timezone = DEFAULT_TIMEZONE) {
    const now = dayjs(nowIso).tz(timezone);
    const range = getRollingPeriodRange(period, now);
    return {
      start: range.start.toISOString(),
      end: range.end.toISOString(),
    };
  }

  async getUserDataAnalysis(
    userId: string,
    query: UserDataAnalysisQuery,
  ): Promise<UserDataAnalysis> {
    const timezone = DEFAULT_TIMEZONE;
    const range = getRollingPeriodRange(query.period, dayjs().tz(timezone));
    const startDate = range.start.format("YYYY-MM-DD");
    const endDate = range.end.format("YYYY-MM-DD");

    logger.info("User data analysis range calculated", { userId, period: query.period, timezone, start: range.start.toISOString(), end: range.end.toISOString(), startDate, endDate });

    const [
      tasks,
      habitCompletions,
      awards,
      currentBalance,
      flowers,
    ] = await Promise.all([
      userDataAnalysisRepository.getCompletedTasksBetween(
        userId,
        range.start.toDate(),
        range.end.toDate(),
      ),
      userDataAnalysisRepository.getHabitCompletionsBetween(userId, startDate, endDate),
      userDataAnalysisRepository.getAwardsBetween(
        userId,
        range.start.toDate(),
        range.end.toDate(),
      ),
      userDataAnalysisRepository.getGardenBalance(userId),
      userDataAnalysisRepository.getFlowerSnapshot(userId),
    ]);

    logger.info("User data analysis source data fetched", { userId, period: query.period, taskCount: tasks.length, habitCompletionCount: habitCompletions.length, awardCount: awards.length, flowerCount: flowers.purchasedSeeds });

    const rewardedTasks = tasks.filter((task) => task.rewardGranted === true);
    const taskCoins = rewardedTasks.length * envs.TASK_REWARD_COINS;
    const taskWater = rewardedTasks.length * envs.TASK_REWARD_WATER;
    const habitCoins = habitCompletions.reduce((sum, item) => sum + item.coins, 0);
    const habitWater = habitCompletions.reduce((sum, item) => sum + item.water, 0);

    const awardsByType = awards.reduce<Record<string, number>>((acc, award) => {
      acc[award.awardType] = (acc[award.awardType] ?? 0) + 1;
      return acc;
    }, {});

    const buckets = buildBuckets(query.period, range);
    const series: AnalysisSeriesPoint[] = buckets.map((bucket) => ({
      label: bucket.label,
      start: bucket.start.toISOString(),
      end: bucket.end.toISOString(),
      tasksCompleted: 0,
      habitsCompleted: 0,
      awardsEarned: 0,
      earnedCoins: 0,
      earnedWater: 0,
    }));

    tasks.forEach((task) => {
      const index = toBucketIndex(buckets, task.completedAt, timezone);
      if (index < 0) return;
      series[index].tasksCompleted += 1;
      if (task.rewardGranted === true) {
        series[index].earnedCoins += envs.TASK_REWARD_COINS;
        series[index].earnedWater += envs.TASK_REWARD_WATER;
      }
    });

    habitCompletions.forEach((completion) => {
      const index = toBucketIndex(buckets, completion.date, timezone);
      if (index < 0) return;
      series[index].habitsCompleted += 1;
      series[index].earnedCoins += completion.coins;
      series[index].earnedWater += completion.water;
    });

    awards.forEach((award) => {
      const index = toBucketIndex(buckets, award.unlockedAt, timezone);
      if (index < 0) return;
      series[index].awardsEarned += 1;
    });

    logger.info("User data analysis completed", { userId, period: query.period, tasks: tasks.length, habits: habitCompletions.length, awards: awards.length });

    return {
      userId,
      period: query.period,
      timezone,
      range: {
        start: range.start.toISOString(),
        end: range.end.toISOString(),
      },
      summary: {
        awards: {
          earned: awards.length,
          byType: awardsByType,
        },
        tasks: {
          completed: tasks.length,
        },
        habits: {
          completed: habitCompletions.length,
          uniqueCompletedHabits: new Set(habitCompletions.map((item) => item.habitId)).size,
        },
        gamification: {
          earnedCoins: taskCoins + habitCoins,
          earnedWater: taskWater + habitWater,
          bySource: {
            tasks: { coins: taskCoins, water: taskWater },
            habits: { coins: habitCoins, water: habitWater },
          },
          currentBalance,
        },
        flowers,
      },
      series,
    };
  }
}

export const userDataAnalysisService = new UserDataAnalysisService();
