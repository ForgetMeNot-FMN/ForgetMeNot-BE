import { generatePrompt } from '../../src/services/promptBuilderService';
import { UserContextDTO, DailyActivitySnapshot } from '../../src/models/userContextModel';
import { NotificationType } from '../../src/models/llmModels';


function makeContext(overrides: Partial<UserContextDTO> = {}): UserContextDTO {
  return {
    userId: 'user-1',
    profile: {
      username: 'alice',
      age: 28,
      gender: 'female',
      allowNotification: true,
      onboardingCompleted: true,
      goals: ['exercise_daily', 'read_books'],
      painPoints: ['procrastination'],
      motivationType: 'encouragement',
      tonePreference: 'friendly',
      dailyCommitment: 30,
      preferredTime: 'morning',
      selfDisciplineLevel: 3,
    },
    habitStats: {
      activeHabitCount: 3,
      completedDaysLastNDays: 5,
      expectedDaysLastNDays: 7,
      missedDaysLastNDays: 2,
      completionRateLastNDays: 70,
      currentBestStreak: 5,
      longestBestStreak: 5,
      hasNoHabits: false,
    },
    taskStats: {
      totalTasks: 8,
      completedTasks: 6,
      dueTasksLastNDays: 7,
      completedDueTasksLastNDays: 5,
      missedTasksLastNDays: 2,
      completionRateLastNDays: 71,
      completedToday: 2,
      pendingToday: 1,
    },
    notificationFeedback: {
      totalTracked: 10,
      llmGeneratedCount: 7,
      systemGeneratedCount: 3,
      unknownGeneratedCount: 0,
      clicks: 6,
      completions: 4,
      ignores: 0,
      lastInteractionAt: null,
      recentLogs: [],
      userPromptNotes: [],
    },
    recentNDays: [],
    generatedAt: new Date().toISOString(),
    metadata: { daysConsidered: 7, sourceCollections: ['habits', 'tasks'] },
    ...overrides,
  };
}

const noWeeklyData: DailyActivitySnapshot[] = [];

// tests

describe('generatePrompt()', () => {
  describe('return shape', () => {
    it('should return an object with systemPrompt and userPrompt strings', () => {
      const result = generatePrompt(makeContext(), noWeeklyData, 'REMINDER');

      expect(typeof result.systemPrompt).toBe('string');
      expect(typeof result.userPrompt).toBe('string');
      expect(result.systemPrompt.length).toBeGreaterThan(0);
      expect(result.userPrompt.length).toBeGreaterThan(0);
    });
  });

  describe('systemPrompt', () => {
    it('should instruct the model to return valid JSON in the required shape', () => {
      const { systemPrompt } = generatePrompt(makeContext(), noWeeklyData, 'REMINDER');

      expect(systemPrompt).toContain('"title"');
      expect(systemPrompt).toContain('"body"');
      expect(systemPrompt).toContain('"tone"');
    });

    it('should specify the four allowed tone values', () => {
      const { systemPrompt } = generatePrompt(makeContext(), noWeeklyData, 'REMINDER');

      expect(systemPrompt).toContain('neutral');
      expect(systemPrompt).toContain('positive');
      expect(systemPrompt).toContain('encouraging');
      expect(systemPrompt).toContain('emotional');
    });

    it('should be the same regardless of notification type', () => {
      const types: NotificationType[] = ['REMINDER', 'PROGRESS', 'MOTIVATION', 'SYSTEM'];
      const ctx = makeContext();
      const prompts = types.map(t => generatePrompt(ctx, noWeeklyData, t).systemPrompt);

      expect(new Set(prompts).size).toBe(1);
    });
  });

  describe('userPrompt — profile data', () => {
    it('should embed user goals in the prompt', () => {
      const ctx = makeContext({ profile: { ...makeContext().profile, goals: ['exercise_daily', 'read_books'] } });
      const { userPrompt } = generatePrompt(ctx, noWeeklyData, 'REMINDER');

      expect(userPrompt).toContain('exercise_daily');
      expect(userPrompt).toContain('read_books');
    });

    it('should fall back to general self-improvement when goals are empty', () => {
      const ctx = makeContext({ profile: { ...makeContext().profile, goals: [] } });
      const { userPrompt } = generatePrompt(ctx, noWeeklyData, 'REMINDER');

      expect(userPrompt).toContain('general self-improvement');
    });

    it('should embed the habit and task completion counts', () => {
      const ctx = makeContext();
      const { userPrompt } = generatePrompt(ctx, noWeeklyData, 'REMINDER');

      expect(userPrompt).toContain(String(ctx.habitStats.completedDaysLastNDays));
      expect(userPrompt).toContain(String(ctx.taskStats.completedDueTasksLastNDays));
    });
  });

  describe('userPrompt — streak line', () => {
    it('should mention streak and label it impressive for streaks >= 7', () => {
      const ctx = makeContext({ habitStats: { ...makeContext().habitStats, currentBestStreak: 10 } });
      const { userPrompt } = generatePrompt(ctx, noWeeklyData, 'MOTIVATION');

      expect(userPrompt).toContain('10 days');
      expect(userPrompt).toContain('impressive');
    });

    it('should include streak count without "impressive" for streaks between 1 and 6', () => {
      const ctx = makeContext({ habitStats: { ...makeContext().habitStats, currentBestStreak: 4 } });
      const { userPrompt } = generatePrompt(ctx, noWeeklyData, 'PROGRESS');

      expect(userPrompt).toContain('4 days');
      expect(userPrompt).not.toContain('impressive');
    });

    it('should say "No active streak" when streak is 0', () => {
      const ctx = makeContext({ habitStats: { ...makeContext().habitStats, currentBestStreak: 0 } });
      const { userPrompt } = generatePrompt(ctx, noWeeklyData, 'REMINDER');

      expect(userPrompt).toContain('No active streak');
    });
  });

  describe('userPrompt — tone instruction by type', () => {
    it('REMINDER should produce a neutral tone instruction', () => {
      const { userPrompt } = generatePrompt(makeContext(), noWeeklyData, 'REMINDER');
      expect(userPrompt).toContain('neutral');
    });

    it('PROGRESS should produce a positive tone instruction', () => {
      const { userPrompt } = generatePrompt(makeContext(), noWeeklyData, 'PROGRESS');
      expect(userPrompt).toContain('positive');
    });

    it('MOTIVATION should allow an emoji in the instruction', () => {
      const { userPrompt } = generatePrompt(makeContext(), noWeeklyData, 'MOTIVATION');
      expect(userPrompt).toContain('emoji');
    });

    it('SYSTEM should produce an informational tone instruction', () => {
      const { userPrompt } = generatePrompt(makeContext(), noWeeklyData, 'SYSTEM');
      expect(userPrompt).toContain('informational');
    });
  });

  describe('userPrompt — history section', () => {
    it('should include history notes when userPromptNotes is non-empty', () => {
      const ctx = makeContext({
        notificationFeedback: {
          ...makeContext().notificationFeedback,
          userPromptNotes: ['user ignores morning messages', 'responds well to streaks'],
        },
      });

      const { userPrompt } = generatePrompt(ctx, noWeeklyData, 'MOTIVATION');

      expect(userPrompt).toContain('History signals');
      expect(userPrompt).toContain('user ignores morning messages');
    });

    it('should not include history section when userPromptNotes is empty', () => {
      const { userPrompt } = generatePrompt(makeContext(), noWeeklyData, 'REMINDER');
      expect(userPrompt).not.toContain('History signals');
    });
  });
});
