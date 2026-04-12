
jest.mock('../../src/services/flowerRepository', () => ({ flowerRepository: {} }));
jest.mock('../../src/services/flowerDefinitions/flowerDefinitionRepository', () => ({
  flowerDefinitionRepository: {},
}));
jest.mock('../../src/services/firebaseAdmin', () => ({
  firestore: { runTransaction: jest.fn(), collection: jest.fn() },
}));
jest.mock('../../src/services/notificationClient', () => ({
  cancelNotificationBySourceId: jest.fn(),
}));
jest.mock('../../src/utils/flowerLogger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));
jest.mock('../../src/utils/const', () => ({
  envs: {
    FIREBASE_SERVICE_ACCOUNT: '{}',
    JWT_SECRET: 'test-secret',
    PORT: '8080',
    GCP_PROJECT_ID: 'test-project',
    AWARDS_EVENTS_TOPIC: 'test-topic',
  },
}));

import { computeStreak } from '../../src/services/flowerService';

//  tests 

describe('computeStreak()', () => {
  const TODAY = '2024-06-15';
  const YESTERDAY = '2024-06-14';
  const TWO_DAYS_AGO = '2024-06-13';

  describe('same-day idempotency', () => {
    it('should return the current streak unchanged when lastWateredDate is today', () => {
      expect(computeStreak(5, TODAY, TODAY, YESTERDAY)).toBe(5);
    });

    it('should not increment the streak on subsequent waterings within the same day', () => {
      expect(computeStreak(1, TODAY, TODAY, YESTERDAY)).toBe(1);
    });
  });

  describe('consecutive-day streak building', () => {
    it('should increment the streak by 1 when lastWateredDate is yesterday', () => {
      expect(computeStreak(3, YESTERDAY, TODAY, YESTERDAY)).toBe(4);
    });

    it('should build from 0 to 1 on the first consecutive day', () => {
      expect(computeStreak(0, YESTERDAY, TODAY, YESTERDAY)).toBe(1);
    });
  });

  describe('streak reset', () => {
    it('should reset to 1 when the last watered date is older than yesterday', () => {
      expect(computeStreak(10, TWO_DAYS_AGO, TODAY, YESTERDAY)).toBe(1);
    });

    it('should reset to 1 when lastWateredDate is null (never watered)', () => {
      expect(computeStreak(0, null, TODAY, YESTERDAY)).toBe(1);
    });

    it('should reset to 1 after a long gap regardless of prior streak value', () => {
      expect(computeStreak(99, '2024-01-01', TODAY, YESTERDAY)).toBe(1);
    });
  });

  describe('edge cases', () => {
    it('should handle streak of 0 being maintained when watered today', () => {
      expect(computeStreak(0, TODAY, TODAY, YESTERDAY)).toBe(0);
    });
  });
});
