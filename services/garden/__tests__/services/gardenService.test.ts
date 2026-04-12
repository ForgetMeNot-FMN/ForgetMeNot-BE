jest.mock('../../src/utils/const', () => ({
  envs: {
    FIREBASE_SERVICE_ACCOUNT: '{}',
    JWT_SECRET: 'test-secret',
    PORT: '8080',
    GCP_PROJECT_ID: 'test-project',
    AWARDS_EVENTS_TOPIC: 'test-topic',
  },
}));
jest.mock('../../src/utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));
jest.mock('../../src/services/gardenRepository', () => ({
  gardenRepository: {
    getByUserId: jest.fn(),
    createDefault: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));
jest.mock('../../src/services/flowerRepository', () => ({
  flowerRepository: { getAll: jest.fn() },
}));
jest.mock('../../src/services/flowerService', () => ({
  computeStreak: jest.fn(),
  flowerService: {},
}));

import { gardenService } from '../../src/services/gardenService';
import { gardenRepository } from '../../src/services/gardenRepository';
import { flowerRepository } from '../../src/services/flowerRepository';
import { computeStreak } from '../../src/services/flowerService';

const mockGardenRepo = gardenRepository as jest.Mocked<typeof gardenRepository>;
const mockFlowerRepo = flowerRepository as jest.Mocked<typeof flowerRepository>;
const mockComputeStreak = computeStreak as jest.MockedFunction<typeof computeStreak>;

const USER_ID = 'user-123';

function makeGarden(overrides = {}) {
  return {
    userId: USER_ID,
    coins: 100,
    water: 5,
    streak: 3,
    lastWateredDate: null,
    totalWateredCount: 10,
    totalFlowers: 0,
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('gardenService', () => {
  beforeEach(() => jest.clearAllMocks());

  //  createGarden 

  describe('createGarden()', () => {
    it('should create and return a new garden when one does not exist', async () => {
      mockGardenRepo.getByUserId.mockResolvedValue(null);
      mockGardenRepo.createDefault.mockResolvedValue(makeGarden());

      const result = await gardenService.createGarden(USER_ID);

      expect(mockGardenRepo.createDefault).toHaveBeenCalledWith(USER_ID);
      expect(result).toMatchObject({ userId: USER_ID });
    });

    it('should throw when a garden already exists for the user', async () => {
      mockGardenRepo.getByUserId.mockResolvedValue(makeGarden());

      await expect(gardenService.createGarden(USER_ID)).rejects.toThrow(
        'Garden already exists',
      );
      expect(mockGardenRepo.createDefault).not.toHaveBeenCalled();
    });
  });

  //  getGarden 

  describe('getGarden()', () => {
    it('should return the garden when it exists', async () => {
      const garden = makeGarden();
      mockGardenRepo.getByUserId.mockResolvedValue(garden);

      const result = await gardenService.getGarden(USER_ID);

      expect(result).toMatchObject({ userId: USER_ID, coins: 100 });
    });

    it('should throw when the garden does not exist', async () => {
      mockGardenRepo.getByUserId.mockResolvedValue(null);

      await expect(gardenService.getGarden(USER_ID)).rejects.toThrow('Garden not found');
    });

    it('should reset streak to 0 when last watered date is before yesterday', async () => {
      const staleGarden = makeGarden({ lastWateredDate: '2020-01-01', streak: 7 });
      mockGardenRepo.getByUserId.mockResolvedValue(staleGarden);
      mockGardenRepo.update.mockResolvedValue(undefined);

      const result = await gardenService.getGarden(USER_ID);

      expect(mockGardenRepo.update).toHaveBeenCalledWith(USER_ID, { streak: 0 });
      expect(result.streak).toBe(0);
    });

    it('should not reset streak when lastWateredDate is null', async () => {
      const garden = makeGarden({ lastWateredDate: null });
      mockGardenRepo.getByUserId.mockResolvedValue(garden);

      await gardenService.getGarden(USER_ID);

      expect(mockGardenRepo.update).not.toHaveBeenCalled();
    });
  });

  //  waterGarden 

  describe('waterGarden()', () => {
    it('should decrement water and update streak, then return new state', async () => {
      const garden = makeGarden({ water: 3, streak: 4 });
      mockGardenRepo.getByUserId.mockResolvedValue(garden);
      mockComputeStreak.mockReturnValue(5);
      mockGardenRepo.update.mockResolvedValue(undefined);

      const result = await gardenService.waterGarden(USER_ID);

      expect(mockGardenRepo.update).toHaveBeenCalledWith(
        USER_ID,
        expect.objectContaining({ water: 2, streak: 5 }),
      );
      expect(result.waterLeft).toBe(2);
      expect(result.streak).toBe(5);
    });

    it('should throw when water is 0', async () => {
      mockGardenRepo.getByUserId.mockResolvedValue(makeGarden({ water: 0 }));

      await expect(gardenService.waterGarden(USER_ID)).rejects.toThrow('No water left');
      expect(mockGardenRepo.update).not.toHaveBeenCalled();
    });
  });

  //  addWater 

  describe('addWater()', () => {
    it('should add the specified amount to the current water supply', async () => {
      const garden = makeGarden({ water: 2 });
      mockGardenRepo.getByUserId.mockResolvedValue(garden);
      mockGardenRepo.update.mockResolvedValue(undefined);

      await gardenService.addWater(USER_ID, 3);

      expect(mockGardenRepo.update).toHaveBeenCalledWith(USER_ID, { water: 5 });
    });
  });

  //  addCoins 

  describe('addCoins()', () => {
    it('should add the specified amount to the current coin balance', async () => {
      const garden = makeGarden({ coins: 50 });
      mockGardenRepo.getByUserId.mockResolvedValue(garden);
      mockGardenRepo.update.mockResolvedValue(undefined);

      await gardenService.addCoins(USER_ID, 25);

      expect(mockGardenRepo.update).toHaveBeenCalledWith(USER_ID, { coins: 75 });
    });
  });

  //  deleteGarden 

  describe('deleteGarden()', () => {
    it('should delegate deletion to the repository', async () => {
      mockGardenRepo.delete.mockResolvedValue(undefined);

      await gardenService.deleteGarden(USER_ID);

      expect(mockGardenRepo.delete).toHaveBeenCalledWith(USER_ID);
    });
  });

  //  getGardenView 

  describe('getGardenView()', () => {
    it('should return coins, water, streak, activeFlower, and inventoryFlowers', async () => {
      const garden = makeGarden({ coins: 200, water: 4, streak: 6 });
      mockGardenRepo.getByUserId.mockResolvedValue(garden);

      const flowers = [
        { flowerId: 'f1', isAlive: true, location: 'GARDEN' },
        { flowerId: 'f2', isAlive: true, location: 'INVENTORY' },
        { flowerId: 'f3', isAlive: false, location: 'INVENTORY' },
      ];
      mockFlowerRepo.getAll.mockResolvedValue(flowers as any);

      const result = await gardenService.getGardenView(USER_ID);

      expect(result.coins).toBe(200);
      expect(result.water).toBe(4);
      expect(result.streak).toBe(6);
      expect(result.activeFlower).toMatchObject({ flowerId: 'f1' });
      expect(result.inventoryFlowers).toHaveLength(1);
      expect(result.inventoryFlowers[0].flowerId).toBe('f2');
    });

    it('should set activeFlower to null when no flower is planted in the garden', async () => {
      mockGardenRepo.getByUserId.mockResolvedValue(makeGarden());
      mockFlowerRepo.getAll.mockResolvedValue([
        { flowerId: 'f1', isAlive: true, location: 'INVENTORY' },
      ] as any);

      const result = await gardenService.getGardenView(USER_ID);

      expect(result.activeFlower).toBeNull();
    });
  });
});
