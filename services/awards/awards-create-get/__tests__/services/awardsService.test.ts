jest.mock('../../src/utils/const', () => ({
  envs: {
    FIREBASE_SERVICE_ACCOUNT: '{}',
    JWT_SECRET: 'test-secret',
    PORT: '8080',
    STRAPI_BASE_URL: 'http://strapi.internal',
    STRAPI_API_TOKEN: 'strapi-token',
    INTERNAL_SERVICE_TOKEN: 'internal-token',
  },
}));
jest.mock('../../src/utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));
jest.mock('../../src/services/awardsRepository', () => ({
  awardsRepository: {
    getAwardsByUserId: jest.fn(),
    getAwardById: jest.fn(),
    getAwardByUserIdAndKey: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));
jest.mock('../../src/services/firebaseAdmin', () => ({
  firestore: { collection: jest.fn() },
}));

import { awardsService } from '../../src/services/awardsService';
import { awardsRepository } from '../../src/services/awardsRepository';
import { firestore } from '../../src/services/firebaseAdmin';
import { AwardsDTO } from '../../src/models/awardsDTO';

const mockRepo = awardsRepository as jest.Mocked<typeof awardsRepository>;
const mockFirestore = firestore as unknown as { collection: jest.Mock };


const USER_ID = 'user-abc';
const AWARD_ID = 'award-123';

function makeAward(overrides = {}) {
  return {
    awardId: AWARD_ID,
    userId: USER_ID,
    key: 'streak_7',
    title: '7-day streak',
    awardType: 'streak' as const,
    value: 7,
    badgeImageUrl: null,
    status: 'unlocked' as const,
    unlockedAt: new Date(),
    createdAt: new Date(),
    ...overrides,
  };
}

function makeDto(overrides: Partial<AwardsDTO> = {}): AwardsDTO {
  return {
    key: 'streak_7',
    title: '7-day streak',
    awardType: 'streak',
    value: 7,
    badgeImageUrl: null,
    ...overrides,
  };
}

//  tests 

describe('awardsService', () => {
  beforeEach(() => jest.clearAllMocks());

  //  getAwards 

  describe('getAwards()', () => {
    it('should delegate to repository and return the result', async () => {
      const awards = [makeAward()];
      mockRepo.getAwardsByUserId.mockResolvedValue(awards);

      const result = await awardsService.getAwards(USER_ID);

      expect(mockRepo.getAwardsByUserId).toHaveBeenCalledWith(USER_ID);
      expect(result).toEqual(awards);
    });
  });

  //  getAward 

  describe('getAward()', () => {
    it('should return the award when found', async () => {
      const award = makeAward();
      mockRepo.getAwardById.mockResolvedValue(award);

      const result = await awardsService.getAward(AWARD_ID);

      expect(mockRepo.getAwardById).toHaveBeenCalledWith(AWARD_ID);
      expect(result).toEqual(award);
    });
  });

  //  createAward 

  describe('createAward()', () => {
    it('should create and return the award for valid input', async () => {
      const award = makeAward();
      mockRepo.create.mockResolvedValue(award);

      const result = await awardsService.createAward(USER_ID, makeDto());

      expect(mockRepo.create).toHaveBeenCalledWith(
        USER_ID,
        expect.objectContaining({ key: 'streak_7', status: 'unlocked' }),
      );
      expect(result).toMatchObject({ awardId: AWARD_ID });
    });

    it('should throw when key is missing', async () => {
      await expect(
        awardsService.createAward(USER_ID, makeDto({ key: '' })),
      ).rejects.toThrow('Award key is required');
    });

    it('should throw when title is missing', async () => {
      await expect(
        awardsService.createAward(USER_ID, makeDto({ title: '' })),
      ).rejects.toThrow('Award title is required');
    });

    it('should throw when awardType is missing', async () => {
      await expect(
        awardsService.createAward(USER_ID, { ...makeDto(), awardType: '' as any }),
      ).rejects.toThrow('awardType is required');
    });

    it('should throw when value is null', async () => {
      await expect(
        awardsService.createAward(USER_ID, { ...makeDto(), value: null as any }),
      ).rejects.toThrow('value is required');
    });
  });

  //  updateAward 

  describe('updateAward()', () => {
    it('should update only provided fields and return the refreshed award', async () => {
      const existing = makeAward();
      const updated = makeAward({ title: 'Updated Title' });
      mockRepo.getAwardById
        .mockResolvedValueOnce(existing)  // pre-check
        .mockResolvedValueOnce(updated);  // post-update fetch
      mockRepo.update.mockResolvedValue(undefined);

      const result = await awardsService.updateAward(AWARD_ID, { title: 'Updated Title' });

      expect(mockRepo.update).toHaveBeenCalledWith(
        AWARD_ID,
        expect.objectContaining({ title: 'Updated Title' }),
      );
      expect(result).toMatchObject({ title: 'Updated Title' });
    });

    it('should coerce value to a number', async () => {
      mockRepo.getAwardById.mockResolvedValue(makeAward());
      mockRepo.update.mockResolvedValue(undefined);

      await awardsService.updateAward(AWARD_ID, { value: '14' as any });

      const updateArgs = mockRepo.update.mock.calls[0][1];
      expect(typeof updateArgs.value).toBe('number');
      expect(updateArgs.value).toBe(14);
    });
  });

  //  deleteAward 

  describe('deleteAward()', () => {
    it('should delegate deletion to the repository', async () => {
      mockRepo.delete.mockResolvedValue(undefined);

      await awardsService.deleteAward(AWARD_ID);

      expect(mockRepo.delete).toHaveBeenCalledWith(AWARD_ID);
    });
  });

  //  checkAwards 

  describe('checkAwards()', () => {
    function stubFirestoreForUser(streak: number, flowerCount: number) {
      const mockFlowersSnap = { size: flowerCount };
      const mockFlowersQuery = { where: jest.fn().mockReturnThis(), get: jest.fn().mockResolvedValue(mockFlowersSnap) };
      const mockDocRef = {
        get: jest.fn().mockResolvedValue({ exists: true, data: () => ({ streak, lastWateredDate: new Date().toISOString().slice(0, 10) }) }),
        collection: jest.fn().mockReturnValue(mockFlowersQuery),
      };
      mockFirestore.collection.mockReturnValue({ doc: jest.fn().mockReturnValue(mockDocRef) } as any);
    }

    function stubStrapiResponse(definitions: any[]) {
      (global.fetch as jest.Mock) = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: definitions }),
      } as any);
    }

    it('should unlock an award when the user meets the condition and has no existing award', async () => {
      stubFirestoreForUser(10, 0);
      stubStrapiResponse([{ key: 'streak_7', Title: '7-day streak', awardType: 'streak', value: 7, badgeImage: null }]);
      mockRepo.getAwardByUserIdAndKey.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue(makeAward());

      const result = await awardsService.checkAwards(USER_ID);

      expect(result.unlockedCount).toBe(1);
      expect(result.popup.show).toBe(true);
      expect(result.popup.items[0].key).toBe('streak_7');
    });

    it('should skip an award the user already has', async () => {
      stubFirestoreForUser(10, 0);
      stubStrapiResponse([{ key: 'streak_7', Title: '7-day streak', awardType: 'streak', value: 7, badgeImage: null }]);
      mockRepo.getAwardByUserIdAndKey.mockResolvedValue(makeAward());

      const result = await awardsService.checkAwards(USER_ID);

      expect(result.unlockedCount).toBe(0);
      expect(mockRepo.create).not.toHaveBeenCalled();
    });

    it('should not unlock an award when the user has not met the condition', async () => {
      stubFirestoreForUser(3, 0); // streak=3 < required 7
      stubStrapiResponse([{ key: 'streak_7', Title: '7-day streak', awardType: 'streak', value: 7, badgeImage: null }]);

      const result = await awardsService.checkAwards(USER_ID);

      expect(result.unlockedCount).toBe(0);
      expect(result.popup.show).toBe(false);
      expect(mockRepo.create).not.toHaveBeenCalled();
    });

    it('should return streak 0 when no garden exists for the user', async () => {
      const mockDocRef = { get: jest.fn().mockResolvedValue({ exists: false }) };
      mockFirestore.collection.mockReturnValue({ doc: jest.fn().mockReturnValue(mockDocRef) } as any);
      stubStrapiResponse([]);

      const result = await awardsService.checkAwards(USER_ID);

      expect(result.progress.streak).toBe(0);
    });
  });
});
