import { notificationFallbackService } from '../../src/services/notificationFallbackService';
import { UserContextDTO } from '../../src/models/userContextModel';
import { NotificationDecisionResult, NotificationReasonData } from '../../src/models/decisionModel';

function makeReason(overrides: Partial<NotificationReasonData> = {}): NotificationReasonData {
  return {
    trigger: 'steady_state',
    intensity: 'LOW',
    avgRate: 60,
    habitRate: 60,
    taskRate: 60,
    streak: 2,
    missedDays: 1,
    focusArea: 'balanced',
    hasAnyPlannedToday: false,
    hadRecentActivity: true,
    today: { habitCompleted: 0, taskCompleted: 0 },
    motivationType: null,
    ...overrides,
  };
}

function makeDecision(
  type: NotificationDecisionResult['type'] = 'ENCOURAGEMENT',
  reasonOverrides: Partial<NotificationReasonData> = {},
): NotificationDecisionResult {
  return {
    type,
    reason: JSON.stringify(makeReason(reasonOverrides)),
  };
}

function makeContext(userLanguage: 'en' | 'tr' | null = null): UserContextDTO {
  return {
    userId: 'user-1',
    profile: {
      username: null,
      age: null,
      gender: null,
      userLanguage,
      allowNotification: true,
      onboardingCompleted: true,
      goals: [],
      painPoints: [],
      motivationType: null,
      tonePreference: null,
      dailyCommitment: null,
      preferredTime: null,
      selfDisciplineLevel: null,
    },
    habitStats: {
      activeHabitCount: 2,
      completedDaysLastNDays: 4,
      expectedDaysLastNDays: 7,
      missedDaysLastNDays: 3,
      completionRateLastNDays: 57,
      currentBestStreak: 2,
      longestBestStreak: 5,
      hasNoHabits: false,
    },
    taskStats: {
      totalTasks: 6,
      completedTasks: 4,
      dueTasksLastNDays: 6,
      completedDueTasksLastNDays: 4,
      missedTasksLastNDays: 2,
      completionRateLastNDays: 67,
      completedToday: 1,
      pendingToday: 1,
    },
    notificationFeedback: {
      totalTracked: 0,
      llmGeneratedCount: 0,
      systemGeneratedCount: 0,
      unknownGeneratedCount: 0,
      clicks: 0,
      completions: 0,
      ignores: 0,
      lastInteractionAt: null,
      recentLogs: [],
      userPromptNotes: [],
    },
    recentNDays: [],
    generatedAt: new Date().toISOString(),
    metadata: { daysConsidered: 7, sourceCollections: [] },
  };
}

describe('notificationFallbackService.generateMessage() — Turkish titles', () => {
  const triggers = [
    { trigger: 'streak_break', type: 'WARNING', intensity: 'HIGH', expected: 'Seriniz durdu' },
    { trigger: 'streak_break', type: 'WARNING', intensity: 'LOW', expected: 'Bugün küçük bir ara' },
    { trigger: 'severe_drop', type: 'WARNING', intensity: 'HIGH', expected: 'Temponu sıfırlayalım' },
    { trigger: 'severe_drop', type: 'WARNING', intensity: 'LOW', expected: 'Sıfırlama zamanı' },
    { trigger: 'no_activity_today', type: 'WARNING', intensity: 'MEDIUM', expected: 'Bugün hâlâ açık' },
    { trigger: 'low_engagement', type: 'WARNING', intensity: 'MEDIUM', expected: 'Rutinine yakın kal' },
    { trigger: 'high_performance', type: 'CELEBRATION', intensity: 'HIGH', expected: 'Güzel bir gidişatın var' },
    { trigger: 'strong_daily_progress', type: 'CELEBRATION', intensity: 'MEDIUM', expected: 'Bugün sağlam ilerleme' },
    { trigger: 'daily_progress', type: 'CELEBRATION', intensity: 'LOW', expected: 'Bugün güzel gidiyor' },
    { trigger: 'steady_state', type: 'ENCOURAGEMENT', intensity: 'LOW', expected: 'Temponu sabit tut' },
    { trigger: 'steady_state', type: 'WARNING', intensity: 'LOW', expected: 'Küçük bir sıfırlama' },
    { trigger: 'steady_state', type: 'CELEBRATION', intensity: 'LOW', expected: 'Devam ettir bunu' },
  ] as const;

  triggers.forEach(({ trigger, type, intensity, expected }) => {
    it(`trigger=${trigger} type=${type} intensity=${intensity} → "${expected}"`, () => {
      const ctx = makeContext('tr');
      const decision = makeDecision(type, { trigger, intensity, streak: 5 });
      const result = notificationFallbackService.generateMessage(ctx, decision);

      expect(result.title).toBe(expected);
    });
  });

  it('high_streak with streak >= 14 should include streak count in title', () => {
    const ctx = makeContext('tr');
    const decision = makeDecision('CELEBRATION', { trigger: 'high_streak', intensity: 'HIGH', streak: 21 });
    const result = notificationFallbackService.generateMessage(ctx, decision);

    expect(result.title).toBe('21 günlük seri');
  });

  it('high_streak with streak < 14 should return generic title', () => {
    const ctx = makeContext('tr');
    const decision = makeDecision('CELEBRATION', { trigger: 'high_streak', intensity: 'HIGH', streak: 10 });
    const result = notificationFallbackService.generateMessage(ctx, decision);

    expect(result.title).toBe('Seriniz harika görünüyor');
  });
});

describe('notificationFallbackService.generateMessage() — English titles', () => {
  it('streak_break HIGH → "Your streak paused"', () => {
    const ctx = makeContext('en');
    const decision = makeDecision('WARNING', { trigger: 'streak_break', intensity: 'HIGH', streak: 5 });
    const result = notificationFallbackService.generateMessage(ctx, decision);

    expect(result.title).toBe('Your streak paused');
  });

  it('steady_state ENCOURAGEMENT → "Keep your pace steady"', () => {
    const ctx = makeContext(null);
    const decision = makeDecision('ENCOURAGEMENT', { trigger: 'steady_state', intensity: 'LOW', streak: 1 });
    const result = notificationFallbackService.generateMessage(ctx, decision);

    expect(result.title).toBe('Keep your pace steady');
  });
});

describe('notificationFallbackService.generateMessage() — Turkish body language', () => {
  it('streak_break body for TR user should contain Turkish text', () => {
    const ctx = makeContext('tr');
    const decision = makeDecision('WARNING', { trigger: 'streak_break', intensity: 'HIGH', streak: 7 });
    const result = notificationFallbackService.generateMessage(ctx, decision);

    expect(result.body.length).toBeGreaterThan(0);
    expect(result.body).not.toMatch(/\b(the|your|streak|today|step)\b/i);
  });

  it('severe_drop body for TR user should contain Turkish text', () => {
    const ctx = makeContext('tr');
    const decision = makeDecision('WARNING', { trigger: 'severe_drop', intensity: 'HIGH', streak: 0 });
    const result = notificationFallbackService.generateMessage(ctx, decision);

    expect(result.body.length).toBeGreaterThan(0);
  });

  it('high_performance body for EN user should contain English text', () => {
    const ctx = makeContext('en');
    const decision = makeDecision('CELEBRATION', { trigger: 'high_performance', intensity: 'HIGH', streak: 5 });
    const result = notificationFallbackService.generateMessage(ctx, decision);

    expect(result.body.length).toBeGreaterThan(0);
  });
});

describe('notificationFallbackService.generateMessage() — result shape', () => {
  it('should always return title, body, and strategy', () => {
    const ctx = makeContext('tr');
    const decision = makeDecision('ENCOURAGEMENT', { trigger: 'steady_state', intensity: 'LOW', streak: 1 });
    const result = notificationFallbackService.generateMessage(ctx, decision);

    expect(typeof result.title).toBe('string');
    expect(typeof result.body).toBe('string');
    expect(typeof result.message).toBe('string');
    expect(result.strategy).toBeDefined();
    expect(result.strategy.branch).toBeTruthy();
  });

  it('title should never exceed 42 characters', () => {
    const ctx = makeContext('tr');
    const decision = makeDecision('CELEBRATION', { trigger: 'high_streak', intensity: 'HIGH', streak: 100 });
    const result = notificationFallbackService.generateMessage(ctx, decision);

    expect(result.title.length).toBeLessThanOrEqual(42);
  });

  it('body should never exceed 118 characters', () => {
    const ctx = makeContext('tr');
    const decision = makeDecision('WARNING', { trigger: 'severe_drop', intensity: 'HIGH', streak: 0 });
    const result = notificationFallbackService.generateMessage(ctx, decision);

    expect(result.body.length).toBeLessThanOrEqual(118);
  });
});
