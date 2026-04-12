import { normalizeDateOnly, normalizeDateTime } from '../../src/utils/dateParser';

//  normalizeDateOnly 

describe('normalizeDateOnly()', () => {
  describe('happy path', () => {
    it('should format a valid JS Date to YYYY-MM-DD', () => {
      const date = new Date('2024-06-15T10:30:00.000Z');
      const result = normalizeDateOnly(date);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should format an ISO date string to YYYY-MM-DD', () => {
      expect(normalizeDateOnly('2024-03-25')).toBe('2024-03-25');
    });

    it('should format a full ISO datetime string to date-only', () => {
      expect(normalizeDateOnly('2024-12-01')).toBe('2024-12-01');
    });

    it('should accept a datetime string and strip the time part', () => {
      const result = normalizeDateOnly('2024-07-04T00:00:00.000Z');
      expect(result).toMatch(/^2024-07-0[34]$/); // UTC vs local offset
    });
  });

  describe('null / missing input', () => {
    it('should return null for null', () => {
      expect(normalizeDateOnly(null)).toBeNull();
    });

    it('should return null for undefined', () => {
      expect(normalizeDateOnly(undefined)).toBeNull();
    });

    it('should return null for an empty string', () => {
      expect(normalizeDateOnly('')).toBeNull();
    });

    it('should return null for 0 (falsy number)', () => {
      expect(normalizeDateOnly(0)).toBeNull();
    });
  });

  describe('invalid input', () => {
    it('should throw for a non-date string', () => {
      expect(() => normalizeDateOnly('not-a-date')).toThrow('Invalid date format');
    });

    it('should throw for a random object', () => {
      expect(() => normalizeDateOnly({ year: 2024 })).toThrow('Invalid date format');
    });

    it('should throw for an invalid Date object (NaN)', () => {
      expect(() => normalizeDateOnly(new Date('invalid'))).toThrow('Invalid date format');
    });

    it('should throw for a plain number (non-zero)', () => {
      expect(() => normalizeDateOnly(12345)).toThrow('Invalid date format');
    });
  });
});

//  normalizeDateTime 

describe('normalizeDateTime()', () => {
  describe('happy path', () => {
    it('should return the same Date object when given a valid Date', () => {
      const input = new Date('2024-06-15T10:30:00.000Z');
      const result = normalizeDateTime(input);
      expect(result).toBeInstanceOf(Date);
      expect(result!.getTime()).toBe(input.getTime());
    });

    it('should parse an ISO string and return a Date', () => {
      const result = normalizeDateTime('2024-06-15T10:30:00.000Z');
      expect(result).toBeInstanceOf(Date);
      expect(result!.toISOString()).toBe('2024-06-15T10:30:00.000Z');
    });

    it('should parse a date-only string and return a valid Date', () => {
      const result = normalizeDateTime('2024-01-01');
      expect(result).toBeInstanceOf(Date);
      expect(isNaN(result!.getTime())).toBe(false);
    });

    it('should preserve millisecond precision', () => {
      const iso = '2024-06-15T10:30:45.123Z';
      const result = normalizeDateTime(iso);
      expect(result!.getMilliseconds()).toBe(123);
    });
  });

  describe('null / missing input', () => {
    it('should return null for null', () => {
      expect(normalizeDateTime(null)).toBeNull();
    });

    it('should return null for undefined', () => {
      expect(normalizeDateTime(undefined)).toBeNull();
    });

    it('should return null for an empty string', () => {
      expect(normalizeDateTime('')).toBeNull();
    });
  });

  describe('invalid input', () => {
    it('should throw for a non-date string', () => {
      expect(() => normalizeDateTime('not-a-date')).toThrow('Invalid datetime format');
    });

    it('should throw for an invalid Date object (NaN)', () => {
      expect(() => normalizeDateTime(new Date('bad'))).toThrow('Invalid datetime format');
    });

    it('should throw for a plain object', () => {
      expect(() => normalizeDateTime({ ts: 1234 })).toThrow('Invalid datetime format');
    });
  });
});
