jest.mock('../../src/utils/const', () => ({
  envs: {
    FIREBASE_SERVICE_ACCOUNT: '{}',
    JWT_SECRET: 'test-secret',
    PORT: '8080',
  },
}));
jest.mock('../../src/utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));
jest.mock('../../src/services/firebaseService', () => ({
  userRepository: {
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    deleteAllUserData: jest.fn(),
    addFcmToken: jest.fn(),
  },
}));

import { userService } from '../../src/services/userService';
import { userRepository } from '../../src/services/firebaseService';
import { User } from '../../src/models/userModel';

const mockRepo = userRepository as jest.Mocked<typeof userRepository>;

//  fixtures 

const USER_ID = 'user-abc-123';

function makeUser(overrides: Partial<User> = {}): User {
  return {
    userId: USER_ID,
    email: 'alice@example.com',
    username: 'alice',
    authProvider: 'google.com',
    age: null,
    gender: null,
    allowNotification: true,
    fcmTokens: [],
    permissions: {
      allowCalendar: false,
      allowKVKK: false,
      allowLocation: false,
    },
    onboarding: {
      completed: false,
      goals: ['be_consistent'],
      painPoints: ['procrastination'],
      motivationType: 'reminder',
      tonePreference: 'motivational',
      dailyCommitment: 20,
      preferredTime: 'evening',
      selfDisciplineLevel: 2,
    },
    userLanguage: 'en',
    uiMode: 'fmn',
    created_at: new Date(),
    ...overrides,
  } as User;
}

//  tests 

describe('userService', () => {
  beforeEach(() => jest.clearAllMocks());

  //  createUser 

  describe('createUser()', () => {
    it('should create and return the new user', async () => {
      const payload = makeUser();
      mockRepo.getById.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue(payload);

      const result = await userService.createUser(payload);

      expect(mockRepo.create).toHaveBeenCalledWith(
        USER_ID,
        expect.objectContaining({ email: payload.email }),
      );
      expect(result).toMatchObject({ userId: USER_ID });
    });

    it('should set allowNotification to true and fcmTokens to [] by default', async () => {
      const payload = makeUser();
      mockRepo.getById.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue(payload);

      await userService.createUser(payload);

      const createArgs = mockRepo.create.mock.calls[0][1];
      expect(createArgs.allowNotification).toBe(true);
      expect(createArgs.fcmTokens).toEqual([]);
    });

    it('should set default onboarding values regardless of the payload', async () => {
      const payload = makeUser();
      mockRepo.getById.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue(payload);

      await userService.createUser(payload);

      const createArgs = mockRepo.create.mock.calls[0][1];
      expect(createArgs.onboarding.completed).toBe(false);
      expect(createArgs.onboarding.goals).toEqual(['be_consistent']);
      expect(createArgs.onboarding.selfDisciplineLevel).toBe(2);
    });

    it('should default userLanguage to en when not provided in the payload', async () => {
      const payload = makeUser({ userLanguage: undefined });
      mockRepo.getById.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue(payload);

      await userService.createUser(payload);

      const createArgs = mockRepo.create.mock.calls[0][1];
      expect(createArgs.userLanguage).toBe('en');
    });

    it('should persist userLanguage tr when provided in the payload', async () => {
      const payload = makeUser({ userLanguage: 'tr' });
      mockRepo.getById.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue(payload);

      await userService.createUser(payload);

      const createArgs = mockRepo.create.mock.calls[0][1];
      expect(createArgs.userLanguage).toBe('tr');
    });

    it('should default uiMode to fmn when not provided in the payload', async () => {
      const payload = makeUser({ uiMode: undefined });
      mockRepo.getById.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue(payload);

      await userService.createUser(payload);

      const createArgs = mockRepo.create.mock.calls[0][1];
      expect(createArgs.uiMode).toBe('fmn');
    });

    it('should persist uiMode basic when provided in the payload', async () => {
      const payload = makeUser({ uiMode: 'basic' });
      mockRepo.getById.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue(payload);

      await userService.createUser(payload);

      const createArgs = mockRepo.create.mock.calls[0][1];
      expect(createArgs.uiMode).toBe('basic');
    });

    it('should throw when the user already exists', async () => {
      mockRepo.getById.mockResolvedValue(makeUser());

      await expect(userService.createUser(makeUser())).rejects.toThrow('User already exists');
      expect(mockRepo.create).not.toHaveBeenCalled();
    });
  });

  //  getUser 

  describe('getUser()', () => {
    it('should return the user when found', async () => {
      const user = makeUser();
      mockRepo.getById.mockResolvedValue(user);

      const result = await userService.getUser(USER_ID);

      expect(result).toMatchObject({ userId: USER_ID, email: 'alice@example.com' });
    });

    it('should throw User not found when the user does not exist', async () => {
      mockRepo.getById.mockResolvedValue(null);

      await expect(userService.getUser(USER_ID)).rejects.toThrow('User not found');
    });
  });

  //  updateUser

  describe('updateUser()', () => {
    it('should call update with the provided fields and return the refreshed user', async () => {
      const updated = makeUser({ username: 'alice_v2' });
      mockRepo.update.mockResolvedValue(undefined);
      mockRepo.getById.mockResolvedValue(updated);

      const result = await userService.updateUser(USER_ID, { username: 'alice_v2' });

      expect(mockRepo.update).toHaveBeenCalledWith(USER_ID, { username: 'alice_v2' });
      expect(result.username).toBe('alice_v2');
    });

    it('should persist userLanguage when updated to tr', async () => {
      const updated = makeUser({ userLanguage: 'tr' });
      mockRepo.update.mockResolvedValue(undefined);
      mockRepo.getById.mockResolvedValue(updated);

      const result = await userService.updateUser(USER_ID, { userLanguage: 'tr' });

      expect(mockRepo.update).toHaveBeenCalledWith(USER_ID, { userLanguage: 'tr' });
      expect(result.userLanguage).toBe('tr');
    });

    it('should persist uiMode when updated to basic', async () => {
      const updated = makeUser({ uiMode: 'basic' });
      mockRepo.update.mockResolvedValue(undefined);
      mockRepo.getById.mockResolvedValue(updated);

      const result = await userService.updateUser(USER_ID, { uiMode: 'basic' });

      expect(mockRepo.update).toHaveBeenCalledWith(USER_ID, { uiMode: 'basic' });
      expect(result.uiMode).toBe('basic');
    });
  });

  //  updatePermissions 

  describe('updatePermissions()', () => {
    it('should update only the permissions field', async () => {
      const newPerms = { allowCalendar: true, allowKVKK: true, allowLocation: false };
      mockRepo.update.mockResolvedValue(undefined);
      mockRepo.getById.mockResolvedValue(makeUser({ permissions: newPerms }));

      await userService.updatePermissions(USER_ID, newPerms);

      expect(mockRepo.update).toHaveBeenCalledWith(USER_ID, { permissions: newPerms });
    });
  });

  //  deleteUser 

  describe('deleteUser()', () => {
    it('should delegate deletion to the repository', async () => {
      mockRepo.deleteAllUserData.mockResolvedValue(undefined);

      await userService.deleteUser(USER_ID);

      expect(mockRepo.deleteAllUserData).toHaveBeenCalledWith(USER_ID);
    });
  });

  //  setAllowNotification 

  describe('setAllowNotification()', () => {
    it('should update allowNotification to true', async () => {
      mockRepo.update.mockResolvedValue(undefined);

      await userService.setAllowNotification(USER_ID, true);

      expect(mockRepo.update).toHaveBeenCalledWith(USER_ID, { allowNotification: true });
    });

    it('should update allowNotification to false', async () => {
      mockRepo.update.mockResolvedValue(undefined);

      await userService.setAllowNotification(USER_ID, false);

      expect(mockRepo.update).toHaveBeenCalledWith(USER_ID, { allowNotification: false });
    });
  });

  //  addFcmToken 

  describe('addFcmToken()', () => {
    it('should delegate FCM token addition to the repository', async () => {
      mockRepo.addFcmToken.mockResolvedValue(undefined);

      await userService.addFcmToken(USER_ID, 'fcm-token-xyz');

      expect(mockRepo.addFcmToken).toHaveBeenCalledWith(USER_ID, 'fcm-token-xyz');
    });
  });
});
