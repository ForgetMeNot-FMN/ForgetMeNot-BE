jest.mock('../../src/utils/const', () => ({
  envs: {
    FIREBASE_SERVICE_ACCOUNT: '{}',
    JWT_SECRET: 'test-secret',
    PORT: '8080',
    TASK_REWARD_COINS: 5,
    TASK_REWARD_WATER: 1,
  },
}));

jest.mock('../../src/services/userDataAnalysisRepository', () => ({
  userDataAnalysisRepository: {
    getCompletedTasksBetween: jest.fn(),
    getHabitCompletionsBetween: jest.fn(),
    getAwardsBetween: jest.fn(),
    getGardenBalance: jest.fn(),
    getFlowerSnapshot: jest.fn(),
  },
}));

import { userDataAnalysisService } from '../../src/services/userDataAnalysisService';
import { userDataAnalysisRepository } from '../../src/services/userDataAnalysisRepository';

const mockRepo = userDataAnalysisRepository as jest.Mocked<typeof userDataAnalysisRepository>;

describe('userDataAnalysisService', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-04-26T09:30:00.000Z'));
    jest.clearAllMocks();
    mockRepo.getCompletedTasksBetween.mockResolvedValue([]);
    mockRepo.getHabitCompletionsBetween.mockResolvedValue([]);
    mockRepo.getAwardsBetween.mockResolvedValue([]);
    mockRepo.getGardenBalance.mockResolvedValue({ coins: 0, water: 0 });
    mockRepo.getFlowerSnapshot.mockResolvedValue({
      purchasedSeeds: 0,
      grownFlowers: 0,
      deadFlowers: 0,
      aliveFlowers: 0,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('period boundaries', () => {
    it('calculates weekly bounds from now back seven days', () => {
      const range = userDataAnalysisService.getPeriodRangeForTest(
        'weekly',
        '2026-04-26T09:30:00.000Z',
        'Europe/Istanbul',
      );

      expect(range.start).toBe('2026-04-19T09:30:00.000Z');
      expect(range.end).toBe('2026-04-26T09:30:00.000Z');
    });

    it('calculates monthly bounds from now back one month', () => {
      const range = userDataAnalysisService.getPeriodRangeForTest(
        'monthly',
        '2026-04-26T09:30:00.000Z',
        'Europe/Istanbul',
      );

      expect(range.start).toBe('2026-03-26T09:30:00.000Z');
      expect(range.end).toBe('2026-04-26T09:30:00.000Z');
    });

    it('calculates yearly bounds from now back one year', () => {
      const range = userDataAnalysisService.getPeriodRangeForTest(
        'yearly',
        '2026-04-26T09:30:00.000Z',
        'Europe/Istanbul',
      );

      expect(range.start).toBe('2025-04-26T09:30:00.000Z');
      expect(range.end).toBe('2026-04-26T09:30:00.000Z');
    });
  });

  it('aggregates summary totals and series buckets', async () => {
    mockRepo.getCompletedTasksBetween.mockResolvedValue([
      {
        taskId: 'task-1',
        completedAt: new Date('2026-04-21T09:00:00.000Z'),
        rewardGranted: true,
      },
      {
        taskId: 'task-2',
        completedAt: new Date('2026-04-22T09:00:00.000Z'),
        rewardGranted: false,
      },
    ]);
    mockRepo.getHabitCompletionsBetween.mockResolvedValue([
      {
        id: 'habit-1_2026-04-21',
        habitId: 'habit-1',
        date: '2026-04-21',
        coins: 3,
        water: 2,
      },
      {
        id: 'habit-2_2026-04-22',
        habitId: 'habit-2',
        date: '2026-04-22',
        coins: 4,
        water: 1,
      },
    ]);
    mockRepo.getAwardsBetween.mockResolvedValue([
      {
        awardId: 'award-1',
        awardType: 'streak',
        unlockedAt: new Date('2026-04-21T10:00:00.000Z'),
      },
      {
        awardId: 'award-2',
        awardType: 'flower',
        unlockedAt: new Date('2026-04-22T10:00:00.000Z'),
      },
    ]);
    mockRepo.getGardenBalance.mockResolvedValue({ coins: 42, water: 8 });
    mockRepo.getFlowerSnapshot.mockResolvedValue({
      purchasedSeeds: 5,
      grownFlowers: 2,
      deadFlowers: 1,
      aliveFlowers: 4,
    });

    const result = await userDataAnalysisService.getUserDataAnalysis('user-1', {
      period: 'weekly',
    });

    expect(result.summary).toEqual({
      awards: {
        earned: 2,
        byType: { streak: 1, flower: 1 },
      },
      tasks: {
        completed: 2,
      },
      habits: {
        completed: 2,
        uniqueCompletedHabits: 2,
      },
      gamification: {
        earnedCoins: 12,
        earnedWater: 4,
        bySource: {
          tasks: { coins: 5, water: 1 },
          habits: { coins: 7, water: 3 },
        },
        currentBalance: { coins: 42, water: 8 },
      },
      flowers: {
        purchasedSeeds: 5,
        grownFlowers: 2,
        deadFlowers: 1,
        aliveFlowers: 4,
      },
    });

    expect(result.series).toHaveLength(8);
    expect(result.series[2]).toMatchObject({
      label: '2026-04-21',
      tasksCompleted: 1,
      habitsCompleted: 1,
      awardsEarned: 1,
      earnedCoins: 8,
      earnedWater: 3,
    });
    expect(result.series[3]).toMatchObject({
      label: '2026-04-22',
      tasksCompleted: 1,
      habitsCompleted: 1,
      awardsEarned: 1,
      earnedCoins: 4,
      earnedWater: 1,
    });
  });

  it('returns one bucket per day for monthly reports', async () => {
    const result = await userDataAnalysisService.getUserDataAnalysis('user-1', {
      period: 'monthly',
    });

    expect(result.series).toHaveLength(32);
    expect(result.series[0].label).toBe('2026-03-26');
    expect(result.series[31].label).toBe('2026-04-26');
  });

  it('returns rolling monthly buckets for yearly reports', async () => {
    const result = await userDataAnalysisService.getUserDataAnalysis('user-1', {
      period: 'yearly',
    });

    expect(result.series).toHaveLength(13);
    expect(result.series[0].label).toBe('2025-04');
    expect(result.series[12].label).toBe('2026-04');
  });
});
