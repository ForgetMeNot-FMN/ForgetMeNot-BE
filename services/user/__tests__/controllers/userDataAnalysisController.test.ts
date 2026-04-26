jest.mock('../../src/services/userDataAnalysisService', () => ({
  userDataAnalysisService: {
    getUserDataAnalysis: jest.fn(),
  },
}));

import { Response } from 'express';
import { getUserDataAnalysisHandler } from '../../src/controllers/userDataAnalysisController';
import { AuthRequest } from '../../src/middlewares/authMiddleware';
import { userDataAnalysisService } from '../../src/services/userDataAnalysisService';

const mockService = userDataAnalysisService as jest.Mocked<typeof userDataAnalysisService>;

function makeResponse() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };

  return res as unknown as Response & {
    status: jest.Mock;
    json: jest.Mock;
  };
}

function makeRequest(overrides: Partial<AuthRequest> = {}) {
  return {
    params: { userId: 'user-1' },
    query: { period: 'weekly' },
    user: {
      userId: 'user-1',
      email: 'alice@example.com',
      username: 'alice',
      authProvider: 'google.com',
    },
    ...overrides,
  } as AuthRequest;
}

describe('userDataAnalysisController', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 403 when token user does not match params user', async () => {
    const req = makeRequest({
      user: {
        userId: 'user-2',
        email: 'alice@example.com',
        username: 'alice',
        authProvider: 'google.com',
      },
    });
    const res = makeResponse();

    await getUserDataAnalysisHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Forbidden' });
    expect(mockService.getUserDataAnalysis).not.toHaveBeenCalled();
  });

  it('accepts backend JWT payloads that identify the user by sub', async () => {
    const payload = {
      userId: 'user-1',
      period: 'weekly',
      timezone: 'Europe/Istanbul',
      range: { start: '2026-04-19T09:30:00.000Z', end: '2026-04-26T09:30:00.000Z' },
      summary: {
        awards: { earned: 0, byType: {} },
        tasks: { completed: 0 },
        habits: { completed: 0, uniqueCompletedHabits: 0 },
        gamification: {
          earnedCoins: 0,
          earnedWater: 0,
          bySource: {
            tasks: { coins: 0, water: 0 },
            habits: { coins: 0, water: 0 },
          },
          currentBalance: { coins: 0, water: 0 },
        },
        flowers: {
          purchasedSeeds: 0,
          grownFlowers: 0,
          deadFlowers: 0,
          aliveFlowers: 0,
        },
      },
      series: [],
    };
    mockService.getUserDataAnalysis.mockResolvedValue(payload as any);
    const req = makeRequest({
      user: {
        sub: 'user-1',
        email: 'alice@example.com',
        provider: 'google.com',
      } as any,
    });
    const res = makeResponse();

    await getUserDataAnalysisHandler(req, res);

    expect(mockService.getUserDataAnalysis).toHaveBeenCalledWith('user-1', {
      period: 'weekly',
    });
    expect(res.json).toHaveBeenCalledWith({ success: true, data: payload });
  });

  it('returns 400 for invalid period', async () => {
    const req = makeRequest({ query: { period: 'daily' } });
    const res = makeResponse();

    await getUserDataAnalysisHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'period must be one of weekly, monthly, yearly',
    });
  });

  it('returns 200 with the analysis payload', async () => {
    const payload = {
      userId: 'user-1',
      period: 'weekly',
      timezone: 'Europe/Istanbul',
      range: { start: '2026-04-19T21:00:00.000Z', end: '2026-04-26T20:59:59.999Z' },
      summary: {
        awards: { earned: 0, byType: {} },
        tasks: { completed: 0 },
        habits: { completed: 0, uniqueCompletedHabits: 0 },
        gamification: {
          earnedCoins: 0,
          earnedWater: 0,
          bySource: {
            tasks: { coins: 0, water: 0 },
            habits: { coins: 0, water: 0 },
          },
          currentBalance: { coins: 0, water: 0 },
        },
        flowers: {
          purchasedSeeds: 0,
          grownFlowers: 0,
          deadFlowers: 0,
          aliveFlowers: 0,
        },
      },
      series: [],
    };
    mockService.getUserDataAnalysis.mockResolvedValue(payload as any);

    const req = makeRequest({
      query: {
        period: 'weekly',
      },
    });
    const res = makeResponse();

    await getUserDataAnalysisHandler(req, res);

    expect(mockService.getUserDataAnalysis).toHaveBeenCalledWith('user-1', {
      period: 'weekly',
    });
    expect(res.json).toHaveBeenCalledWith({ success: true, data: payload });
  });
});
