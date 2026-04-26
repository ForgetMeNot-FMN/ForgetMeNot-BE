import { generateNotificationMessage } from '../../src/services/messageGeneratorService';
import { UserContextDTO, DailyActivitySnapshot } from '../../src/models/userContextModel';

jest.mock('../../src/services/llmService', () => ({
  callLLM: jest.fn(),
}));

jest.mock('../../src/services/promptBuilderService', () => ({
  generatePrompt: jest.fn().mockReturnValue({ systemPrompt: 'sys', userPrompt: 'usr' }),
}));

import { callLLM } from '../../src/services/llmService';

const mockedCallLLM = callLLM as jest.MockedFunction<typeof callLLM>;

function makeContext(userLanguage: 'en' | 'tr' | null = null): UserContextDTO {
  return {
    userId: 'user-1',
    profile: {
      username: 'test',
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
      activeHabitCount: 1,
      completedDaysLastNDays: 3,
      expectedDaysLastNDays: 7,
      missedDaysLastNDays: 4,
      completionRateLastNDays: 43,
      currentBestStreak: 2,
      longestBestStreak: 2,
      hasNoHabits: false,
    },
    taskStats: {
      totalTasks: 5,
      completedTasks: 3,
      dueTasksLastNDays: 5,
      completedDueTasksLastNDays: 3,
      missedTasksLastNDays: 2,
      completionRateLastNDays: 60,
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
    recentNDays: [] as DailyActivitySnapshot[],
    generatedAt: new Date().toISOString(),
    metadata: { daysConsidered: 7, sourceCollections: [] },
  };
}

describe('generateNotificationMessage() — fallback paths', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('LLM call throws', () => {
    it('should return English fallback when language is null and LLM throws', async () => {
      mockedCallLLM.mockRejectedValueOnce(new Error('network error'));

      const result = await generateNotificationMessage({
        userContext: makeContext(null),
        weeklyData: [],
        notificationType: 'REMINDER',
      });

      expect(result.fallbackUsed).toBe(true);
      expect(result.generationSource).toBe('SYSTEM');
      expect(result.title).toBe('Stay consistent');
      expect(result.body).toBe("Don't forget to stay consistent today.");
    });

    it('should return Turkish fallback when language is tr and LLM throws', async () => {
      mockedCallLLM.mockRejectedValueOnce(new Error('network error'));

      const result = await generateNotificationMessage({
        userContext: makeContext('tr'),
        weeklyData: [],
        notificationType: 'REMINDER',
      });

      expect(result.fallbackUsed).toBe(true);
      expect(result.generationSource).toBe('SYSTEM');
      expect(result.title).toBe('Tutarlı kal');
      expect(result.body).toBe('Bugün tutarlı olmayı unutma.');
    });
  });

  describe('LLM returns invalid JSON', () => {
    it('should return English fallback when language is en and JSON is invalid', async () => {
      mockedCallLLM.mockResolvedValueOnce('not-json');

      const result = await generateNotificationMessage({
        userContext: makeContext('en'),
        weeklyData: [],
        notificationType: 'PROGRESS',
      });

      expect(result.fallbackUsed).toBe(true);
      expect(result.title).toBe('Stay consistent');
    });

    it('should return Turkish fallback when language is tr and JSON is invalid', async () => {
      mockedCallLLM.mockResolvedValueOnce('geçersiz json');

      const result = await generateNotificationMessage({
        userContext: makeContext('tr'),
        weeklyData: [],
        notificationType: 'PROGRESS',
      });

      expect(result.fallbackUsed).toBe(true);
      expect(result.title).toBe('Tutarlı kal');
    });
  });

  describe('LLM returns JSON that fails schema', () => {
    it('should return Turkish fallback when language is tr and schema validation fails', async () => {
      mockedCallLLM.mockResolvedValueOnce(JSON.stringify({ title: '', body: '', tone: 'invalid' }));

      const result = await generateNotificationMessage({
        userContext: makeContext('tr'),
        weeklyData: [],
        notificationType: 'MOTIVATION',
      });

      expect(result.fallbackUsed).toBe(true);
      expect(result.title).toBe('Tutarlı kal');
    });
  });

  describe('LLM returns valid response', () => {
    it('should return LLM result with fallbackUsed=false', async () => {
      mockedCallLLM.mockResolvedValueOnce(
        JSON.stringify({ title: 'Great work', body: 'Keep it up today.', tone: 'positive' }),
      );

      const result = await generateNotificationMessage({
        userContext: makeContext('tr'),
        weeklyData: [],
        notificationType: 'PROGRESS',
      });

      expect(result.fallbackUsed).toBe(false);
      expect(result.generationSource).toBe('LLM');
      expect(result.title).toBe('Great work');
      expect(result.tone).toBe('positive');
    });
  });
});
