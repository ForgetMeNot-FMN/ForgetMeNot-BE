jest.mock('../../src/utils/const', () => ({
  envs: {
    JWT_SECRET: 'test-jwt-secret-that-is-long-enough-32+',
    FIREBASE_SERVICE_ACCOUNT: '{}',
    GARDEN_SERVICE_URL: 'http://localhost:3001',
    GOOGLE_CLIENT_ID: 'test-client-id',
    GOOGLE_CLIENT_SECRET: 'test-client-secret',
    GCP_PROJECT_ID: 'test-project',
    CALENDAR_EVENTS_TOPIC: 'test-topic',
    PORT: '8080',
  },
}));

import jwt from 'jsonwebtoken';
import { tokenService } from '../../src/services/tokenService';
import { AuthUser } from '../../src/models/authDtos';

const TEST_SECRET = 'test-jwt-secret-that-is-long-enough-32+';

const mockUser: AuthUser = {
  userId: 'user-abc-123',
  email: 'testuser@example.com',
  username: 'testuser',
  authProvider: 'google.com',
};

describe('tokenService', () => {
  describe('sign()', () => {
    it('should return a string with three JWT segments', () => {
      const token = tokenService.sign(mockUser);

      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should encode sub, email, and provider claims in the payload', () => {
      const token = tokenService.sign(mockUser);
      const decoded = jwt.decode(token) as Record<string, unknown>;

      expect(decoded.sub).toBe(mockUser.userId);
      expect(decoded.email).toBe(mockUser.email);
      expect(decoded.provider).toBe(mockUser.authProvider);
    });

    it('should set token expiration to ~1 day from now', () => {
      const before = Math.floor(Date.now() / 1000);
      const token = tokenService.sign(mockUser);
      const after = Math.floor(Date.now() / 1000);

      const decoded = jwt.decode(token) as Record<string, number>;
      const oneDaySeconds = 86400;

      expect(decoded.exp).toBeGreaterThanOrEqual(before + oneDaySeconds - 1);
      expect(decoded.exp).toBeLessThanOrEqual(after + oneDaySeconds + 1);
    });

    it('should produce unique tokens for different users', () => {
      const otherUser: AuthUser = {
        ...mockUser,
        userId: 'user-xyz-999',
        email: 'other@example.com',
      };

      expect(tokenService.sign(mockUser)).not.toBe(tokenService.sign(otherUser));
    });

    it('should produce a verifiable token using the configured secret', () => {
      const token = tokenService.sign(mockUser);

      expect(() => jwt.verify(token, TEST_SECRET)).not.toThrow();
    });
  });

  describe('verify()', () => {
    it('should return a payload with matching claims for a valid token', () => {
      const token = tokenService.sign(mockUser);
      const payload = tokenService.verify(token) as Record<string, unknown>;

      expect(payload.sub).toBe(mockUser.userId);
      expect(payload.email).toBe(mockUser.email);
      expect(payload.provider).toBe(mockUser.authProvider);
    });

    it('should throw for a token signed with a different secret', () => {
      const foreignToken = jwt.sign({ sub: 'attacker' }, 'wrong-secret');

      expect(() => tokenService.verify(foreignToken)).toThrow();
    });

    it('should throw for a structurally invalid token string', () => {
      expect(() => tokenService.verify('not.a.jwt')).toThrow();
      expect(() => tokenService.verify('')).toThrow();
    });

    it('should throw for an already-expired token', () => {
      const expiredToken = jwt.sign(
        { sub: mockUser.userId, email: mockUser.email },
        TEST_SECRET,
        { expiresIn: -1 },
      );

      expect(() => tokenService.verify(expiredToken)).toThrow(/expired/i);
    });

    it('should throw for a tampered token payload', () => {
      const token = tokenService.sign(mockUser);
      const [header, , signature] = token.split('.');

      const tamperedPayload = Buffer.from(
        JSON.stringify({ sub: 'attacker', email: 'evil@example.com' }),
      ).toString('base64url');

      expect(() =>
        tokenService.verify(`${header}.${tamperedPayload}.${signature}`),
      ).toThrow();
    });
  });
});
