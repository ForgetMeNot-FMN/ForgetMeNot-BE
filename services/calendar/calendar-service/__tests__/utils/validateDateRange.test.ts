jest.mock('../../src/repositories/calendarRepository', () => ({
  calendarRepository: {},
}));
jest.mock('../../src/repositories/sourceRepository', () => ({
  sourceRepository: {},
}));
jest.mock('../../src/utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));
jest.mock('../../src/utils/const', () => ({
  envs: {
    FIREBASE_SERVICE_ACCOUNT: '{}',
    JWT_SECRET: 'test-secret',
    PORT: '8080',
    GCP_PROJECT_ID: 'test-project',
    INTERNAL_SERVICE_SECRET: 'test-internal-secret',
  },
}));

import { validateDateRange } from '../../src/services/calendarService';

//  tests 

describe('validateDateRange()', () => {
  describe('happy path', () => {
    it('should resolve without error for a valid range within 31 days', async () => {
      await expect(
        validateDateRange('2024-06-01', '2024-06-20'),
      ).resolves.toBeUndefined();
    });

    it('should resolve for a range that is exactly 31 days', async () => {
      await expect(
        validateDateRange('2024-06-01', '2024-07-02'),
      ).resolves.toBeUndefined();
    });

    it('should resolve for a 1-day range', async () => {
      await expect(
        validateDateRange('2024-06-01', '2024-06-02'),
      ).resolves.toBeUndefined();
    });
  });

  describe('invalid date strings', () => {
    it('should throw for a non-date "from" string', async () => {
      await expect(validateDateRange('not-a-date', '2024-06-20')).rejects.toThrow(
        'Invalid date range',
      );
    });

    it('should throw for a non-date "to" string', async () => {
      await expect(validateDateRange('2024-06-01', 'not-a-date')).rejects.toThrow(
        'Invalid date range',
      );
    });

    it('should throw when both strings are invalid', async () => {
      await expect(validateDateRange('bad', 'also-bad')).rejects.toThrow('Invalid date range');
    });
  });

  describe('range order', () => {
    it('should throw when "from" equals "to" (non-ordered range)', async () => {
      await expect(validateDateRange('2024-06-01', '2024-06-01')).rejects.toThrow(
        'Invalid date range',
      );
    });

    it('should throw when "from" is after "to"', async () => {
      await expect(validateDateRange('2024-06-20', '2024-06-01')).rejects.toThrow(
        'Invalid date range',
      );
    });
  });

  describe('exceeds maximum range', () => {
    it('should throw when range exceeds 31 days', async () => {
      await expect(
        validateDateRange('2024-06-01', '2024-07-05'),
      ).rejects.toThrow('Date range cannot exceed 31 days');
    });

    it('should throw for a 1-year range', async () => {
      await expect(
        validateDateRange('2024-01-01', '2025-01-01'),
      ).rejects.toThrow('Date range cannot exceed 31 days');
    });
  });
});
