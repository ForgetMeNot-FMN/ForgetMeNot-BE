import { notificationDecisionService } from '../../src/services/notificationDecisionService';
import { UserContextDTO } from '../../src/models/userContextModel';
import { NotificationReasonData } from '../../src/models/decisionModel';

function makeContext(overrides: Partial<UserContextDTO> = {}): UserContextDTO {
  return {
    userId: 'user-123',
    profile: {
      username: 'test',
      age: null,
      gender: null,
      allowNotification: true,
      onboardingCompleted: true,
      goals: ['be_consistent'],
      painPoints: ['procrastination'],
      motivationType: 'reminder',
      tonePreference: 'motivational',
      dailyCommitment: 20,
      preferredTime: 'evening',
      selfDisciplineLevel: 3,
    },
    habitStats: {
      activeHabitCount: 2,
      completedDaysLastNDays: 5,
      expectedDaysLastNDays: 7,
      missedDaysLastNDays: 2,
      completionRateLastNDays: 70,
      currentBestStreak: 3,
      longestBestStreak: 3,
      hasNoHabits: false,
    },
    taskStats: {
      totalTasks: 10,
      completedTasks: 7,
      dueTasksLastNDays: 7,
      completedDueTasksLastNDays: 5,
      missedTasksLastNDays: 2,
      completionRateLastNDays: 70,
      completedToday: 1,
      pendingToday: 1,
    },
    notificationFeedback: {
      totalTracked: 5,
      llmGeneratedCount: 3,
      systemGeneratedCount: 2,
      unknownGeneratedCount: 0,
      clicks: 3,
      completions: 2,
      ignores: 0,
      lastInteractionAt: null,
      recentLogs: [],
      userPromptNotes: [],
    },
    recentNDays: [
      { date: '2024-01-01', habitCompleted: 1, habitExpected: 1, taskCompleted: 1, taskDue: 1 },
      { date: '2024-01-02', habitCompleted: 1, habitExpected: 1, taskCompleted: 1, taskDue: 1 },
      { date: '2024-01-03', habitCompleted: 1, habitExpected: 1, taskCompleted: 1, taskDue: 1 },
    ],
    generatedAt: new Date().toISOString(),
    metadata: { daysConsidered: 7, sourceCollections: ['habits', 'tasks'] },
    ...overrides,
  };
}

function parseReason(reason: string): NotificationReasonData {
  return JSON.parse(reason) as NotificationReasonData;
}

//  tests

describe('notificationDecisionService.decide()', () => {
  describe('WARNING — streak_break', () => {
    it('should return WARNING/streak_break when streak drops to 0 after a long history', () => {
      const ctx = makeContext({
        habitStats: {
          ...makeContext().habitStats,
          currentBestStreak: 0,
          longestBestStreak: 7,
        },
        recentNDays: [
          { date: '2024-01-01', habitCompleted: 1, habitExpected: 1, taskCompleted: 1, taskDue: 1 },
          { date: '2024-01-02', habitCompleted: 1, habitExpected: 1, taskCompleted: 1, taskDue: 1 },
          { date: '2024-01-03', habitCompleted: 0, habitExpected: 1, taskCompleted: 0, taskDue: 1 },
        ],
      });

      const result = notificationDecisionService.decide(ctx);
      const reason = parseReason(result.reason);

      expect(result.type).toBe('WARNING');
      expect(reason.trigger).toBe('streak_break');
      expect(reason.intensity).toBe('HIGH');
    });
  });

  describe('WARNING — severe_drop', () => {
    it('should return WARNING/severe_drop when avg rate falls below 30', () => {
      const ctx = makeContext({
        habitStats: { ...makeContext().habitStats, completionRateLastNDays: 20, missedDaysLastNDays: 1 },
        taskStats: { ...makeContext().taskStats, completionRateLastNDays: 25 },
      });

      const result = notificationDecisionService.decide(ctx);
      const reason = parseReason(result.reason);

      expect(result.type).toBe('WARNING');
      expect(reason.trigger).toBe('severe_drop');
      expect(reason.intensity).toBe('HIGH');
    });

    it('should return WARNING/severe_drop when missed days >= 5', () => {
      const ctx = makeContext({
        habitStats: { ...makeContext().habitStats, missedDaysLastNDays: 5 },
      });

      const result = notificationDecisionService.decide(ctx);
      const reason = parseReason(result.reason);

      expect(result.type).toBe('WARNING');
      expect(reason.trigger).toBe('severe_drop');
    });
  });

  describe('WARNING — no_activity_today', () => {
    it('should warn when planned activity exists today but nothing was done', () => {
      const ctx = makeContext({
        habitStats: { ...makeContext().habitStats, currentBestStreak: 2, longestBestStreak: 2 },
        taskStats: { ...makeContext().taskStats, completionRateLastNDays: 60 },
        recentNDays: [
          { date: '2024-01-01', habitCompleted: 1, habitExpected: 1, taskCompleted: 1, taskDue: 1 },
          // Today: has planned items but 0 completed
          { date: '2024-01-02', habitCompleted: 0, habitExpected: 1, taskCompleted: 0, taskDue: 1 },
        ],
      });

      const result = notificationDecisionService.decide(ctx);
      const reason = parseReason(result.reason);

      expect(result.type).toBe('WARNING');
      expect(reason.trigger).toBe('no_activity_today');
      expect(reason.intensity).toBe('MEDIUM');
    });
  });

  describe('WARNING — low_engagement', () => {
    it('should return low_engagement warning when avg rate is between 30 and 50', () => {
      const ctx = makeContext({
        habitStats: { ...makeContext().habitStats, completionRateLastNDays: 40, missedDaysLastNDays: 2 },
        taskStats: { ...makeContext().taskStats, completionRateLastNDays: 35 },
        recentNDays: [
          { date: '2024-01-01', habitCompleted: 1, habitExpected: 1, taskCompleted: 1, taskDue: 1 },
          // Today: no activity but nothing planned either so no no_activity_today trigger
          { date: '2024-01-02', habitCompleted: 0, habitExpected: 0, taskCompleted: 0, taskDue: 0 },
        ],
      });

      const result = notificationDecisionService.decide(ctx);
      const reason = parseReason(result.reason);

      expect(result.type).toBe('WARNING');
      expect(reason.trigger).toBe('low_engagement');
      expect(reason.intensity).toBe('MEDIUM');
    });
  });

  describe('CELEBRATION — high_streak', () => {
    it('should celebrate when streak is >= 7 and user made progress today', () => {
      const ctx = makeContext({
        habitStats: {
          ...makeContext().habitStats,
          currentBestStreak: 10,
          longestBestStreak: 10,
          completionRateLastNDays: 85,
        },
        taskStats: { ...makeContext().taskStats, completionRateLastNDays: 85 },
        recentNDays: [
          { date: '2024-01-01', habitCompleted: 1, habitExpected: 1, taskCompleted: 1, taskDue: 1 },
          { date: '2024-01-02', habitCompleted: 1, habitExpected: 1, taskCompleted: 1, taskDue: 1 },
        ],
      });

      const result = notificationDecisionService.decide(ctx);
      const reason = parseReason(result.reason);

      expect(result.type).toBe('CELEBRATION');
      expect(reason.trigger).toBe('high_streak');
      expect(reason.intensity).toBe('HIGH');
    });
  });

  describe('CELEBRATION — high_performance', () => {
    it('should celebrate high performance when avg rate >= 80 and progress made today', () => {
      const ctx = makeContext({
        habitStats: {
          ...makeContext().habitStats,
          currentBestStreak: 3,
          longestBestStreak: 3,
          completionRateLastNDays: 85,
        },
        taskStats: { ...makeContext().taskStats, completionRateLastNDays: 85 },
        recentNDays: [
          { date: '2024-01-01', habitCompleted: 1, habitExpected: 1, taskCompleted: 1, taskDue: 1 },
          { date: '2024-01-02', habitCompleted: 1, habitExpected: 1, taskCompleted: 1, taskDue: 1 },
        ],
      });

      const result = notificationDecisionService.decide(ctx);
      const reason = parseReason(result.reason);

      expect(result.type).toBe('CELEBRATION');
      expect(reason.trigger).toBe('high_performance');
    });

    it('should celebrate high performance even when nothing is planned today', () => {
      const ctx = makeContext({
        habitStats: {
          ...makeContext().habitStats,
          currentBestStreak: 3,
          longestBestStreak: 3,
          completionRateLastNDays: 90,
        },
        taskStats: { ...makeContext().taskStats, completionRateLastNDays: 90 },
        recentNDays: [
          { date: '2024-01-01', habitCompleted: 1, habitExpected: 1, taskCompleted: 1, taskDue: 1 },
          { date: '2024-01-02', habitCompleted: 0, habitExpected: 0, taskCompleted: 0, taskDue: 0 },
        ],
      });

      const result = notificationDecisionService.decide(ctx);
      const reason = parseReason(result.reason);

      expect(result.type).toBe('CELEBRATION');
      expect(reason.trigger).toBe('high_performance');
    });
  });

  describe('CELEBRATION — strong_daily_progress', () => {
    it('should celebrate when user completed >= 2 items today', () => {
      const ctx = makeContext({
        habitStats: { ...makeContext().habitStats, currentBestStreak: 2, completionRateLastNDays: 60 },
        taskStats: { ...makeContext().taskStats, completionRateLastNDays: 60 },
        recentNDays: [
          { date: '2024-01-01', habitCompleted: 1, habitExpected: 1, taskCompleted: 1, taskDue: 1 },
          // Today: 2 total = strong progress
          { date: '2024-01-02', habitCompleted: 1, habitExpected: 1, taskCompleted: 1, taskDue: 1 },
        ],
      });

      const result = notificationDecisionService.decide(ctx);
      const reason = parseReason(result.reason);

      expect(result.type).toBe('CELEBRATION');
      expect(reason.trigger).toBe('strong_daily_progress');
      expect(reason.intensity).toBe('MEDIUM');
    });
  });

  describe('ENCOURAGEMENT — steady_state', () => {
    it('should default to steady_state encouragement when no other condition triggers', () => {
      const ctx = makeContext({
        habitStats: { ...makeContext().habitStats, currentBestStreak: 1, completionRateLastNDays: 55, missedDaysLastNDays: 1 },
        taskStats: { ...makeContext().taskStats, completionRateLastNDays: 55 },
        recentNDays: [
          // Today: nothing planned, nothing done so no warnings, no celebrations
          { date: '2024-01-01', habitCompleted: 0, habitExpected: 0, taskCompleted: 0, taskDue: 0 },
        ],
      });

      const result = notificationDecisionService.decide(ctx);
      const reason = parseReason(result.reason);

      expect(result.type).toBe('ENCOURAGEMENT');
      expect(reason.trigger).toBe('steady_state');
      expect(reason.intensity).toBe('LOW');
    });
  });

  describe('reason payload', () => {
    it('should always include all required fields in the reason JSON', () => {
      const ctx = makeContext();
      const result = notificationDecisionService.decide(ctx);
      const reason = parseReason(result.reason);

      expect(reason).toHaveProperty('trigger');
      expect(reason).toHaveProperty('intensity');
      expect(reason).toHaveProperty('avgRate');
      expect(reason).toHaveProperty('habitRate');
      expect(reason).toHaveProperty('taskRate');
      expect(reason).toHaveProperty('streak');
      expect(reason).toHaveProperty('missedDays');
      expect(reason).toHaveProperty('focusArea');
      expect(reason).toHaveProperty('today');
      expect(reason).toHaveProperty('motivationType');
    });

    it('should set focusArea to both_low when both rates are below 40', () => {
      const ctx = makeContext({
        habitStats: { ...makeContext().habitStats, completionRateLastNDays: 30, missedDaysLastNDays: 4 },
        taskStats: { ...makeContext().taskStats, completionRateLastNDays: 30 },
      });

      const result = notificationDecisionService.decide(ctx);
      const reason = parseReason(result.reason);

      expect(reason.focusArea).toBe('both_low');
    });

    it('should set focusArea to habit when only habit rate is low', () => {
      const ctx = makeContext({
        habitStats: { ...makeContext().habitStats, completionRateLastNDays: 30 },
        taskStats: { ...makeContext().taskStats, completionRateLastNDays: 70 },
        recentNDays: [
          { date: '2024-01-01', habitCompleted: 0, habitExpected: 0, taskCompleted: 0, taskDue: 0 },
        ],
      });

      const result = notificationDecisionService.decide(ctx);
      const reason = parseReason(result.reason);

      expect(reason.focusArea).toBe('habit');
    });

    it('should handle empty recentNDays array without throwing', () => {
      const ctx = makeContext({ recentNDays: [] });
      expect(() => notificationDecisionService.decide(ctx)).not.toThrow();
    });
  });
});
