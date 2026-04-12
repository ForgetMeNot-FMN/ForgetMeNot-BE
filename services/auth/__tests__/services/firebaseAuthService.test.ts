jest.mock('../../src/utils/const', () => ({
  envs: {
    JWT_SECRET: 'test-jwt-secret',
    FIREBASE_SERVICE_ACCOUNT: '{}',
    GARDEN_SERVICE_URL: 'http://garden-service.internal',
    GOOGLE_CLIENT_ID: 'test-client-id',
    GOOGLE_CLIENT_SECRET: 'test-client-secret',
    GCP_PROJECT_ID: 'test-project',
    CALENDAR_EVENTS_TOPIC: 'test-topic',
    PORT: '8080',
  },
}));

jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../src/services/firebaseAdmin', () => ({
  firestore: {
    collection: jest.fn(),
  },
}));

jest.mock('firebase-admin', () => ({
  auth: jest.fn(),
  apps: ['mock-app'],
}));

jest.mock('../../src/services/tokenService', () => ({
  tokenService: {
    sign: jest.fn(),
  },
}));

jest.mock('axios');

import axios from 'axios';
import admin from 'firebase-admin';
import { firestore } from '../../src/services/firebaseAdmin';
import { tokenService } from '../../src/services/tokenService';
import { logger } from '../../src/utils/logger';
import { firebaseAuthService } from '../../src/services/firebaseAuthService';

const mockAdmin = admin as jest.Mocked<typeof admin>;
const mockTokenService = tokenService as jest.Mocked<typeof tokenService>;
const mockFirestore = firestore as unknown as { collection: jest.Mock };
const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockLogger = logger as jest.Mocked<typeof logger>;

const MOCK_ID_TOKEN = 'firebase-id-token';
const MOCK_JWT = 'signed-jwt-token';

const decodedFirebaseToken = {
  uid: 'user-uid-123',
  email: 'alice@example.com',
  name: 'Alice Smith',
  firebase: { sign_in_provider: 'google.com' },
};

function makeFirestoreChain(snapExists: boolean) {
  const mockGet = jest.fn().mockResolvedValue({ exists: snapExists });
  const mockSet = jest.fn().mockResolvedValue(undefined);
  const mockDocRef = { get: mockGet, set: mockSet };
  const mockDoc = jest.fn().mockReturnValue(mockDocRef);
  mockFirestore.collection.mockReturnValue({ doc: mockDoc } as any);
  return { mockGet, mockSet, mockDoc };
}

describe('firebaseAuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTokenService.sign.mockReturnValue(MOCK_JWT);
  });

  describe('loginWithFirebase()', () => {
    describe('existing user', () => {
      it('should return a signed token and user object without touching Firestore set()', async () => {
        (mockAdmin.auth as jest.Mock).mockReturnValue({
          verifyIdToken: jest.fn().mockResolvedValue(decodedFirebaseToken),
        });
        const { mockSet } = makeFirestoreChain(true /* snap.exists = true */);

        const result = await firebaseAuthService.loginWithFirebase(MOCK_ID_TOKEN);

        expect(result.token).toBe(MOCK_JWT);
        expect(result.user).toMatchObject({
          userId: decodedFirebaseToken.uid,
          email: decodedFirebaseToken.email,
          username: decodedFirebaseToken.name,
          authProvider: decodedFirebaseToken.firebase.sign_in_provider,
        });
        expect(mockSet).not.toHaveBeenCalled();
        expect(mockedAxios.post).not.toHaveBeenCalled();
      });

      it('should call tokenService.sign with the correct AuthUser payload', async () => {
        (mockAdmin.auth as jest.Mock).mockReturnValue({
          verifyIdToken: jest.fn().mockResolvedValue(decodedFirebaseToken),
        });
        makeFirestoreChain(true);

        await firebaseAuthService.loginWithFirebase(MOCK_ID_TOKEN);

        expect(mockTokenService.sign).toHaveBeenCalledWith({
          userId: decodedFirebaseToken.uid,
          email: decodedFirebaseToken.email,
          username: decodedFirebaseToken.name,
          authProvider: decodedFirebaseToken.firebase.sign_in_provider,
        });
      });
    });

    describe('new user', () => {
      it('should create a Firestore document with default onboarding config', async () => {
        (mockAdmin.auth as jest.Mock).mockReturnValue({
          verifyIdToken: jest.fn().mockResolvedValue(decodedFirebaseToken),
        });
        const { mockSet } = makeFirestoreChain(false /* snap.exists = false */);
        mockedAxios.post.mockResolvedValue({ status: 201, data: {} });

        await firebaseAuthService.loginWithFirebase(MOCK_ID_TOKEN);

        expect(mockSet).toHaveBeenCalledTimes(1);
        const setArg = mockSet.mock.calls[0][0];
        expect(setArg.userId).toBe(decodedFirebaseToken.uid);
        expect(setArg.email).toBe(decodedFirebaseToken.email);
        expect(setArg.allowNotification).toBe(false);
        expect(setArg.onboarding).toMatchObject({
          completed: false,
          goals: expect.any(Array),
        });
      });

      it('should call the garden service with a Bearer token', async () => {
        (mockAdmin.auth as jest.Mock).mockReturnValue({
          verifyIdToken: jest.fn().mockResolvedValue(decodedFirebaseToken),
        });
        makeFirestoreChain(false);
        mockedAxios.post.mockResolvedValue({ status: 201, data: {} });

        await firebaseAuthService.loginWithFirebase(MOCK_ID_TOKEN);

        expect(mockedAxios.post).toHaveBeenCalledWith(
          `http://garden-service.internal/gardens/${decodedFirebaseToken.uid}`,
          {},
          { headers: { Authorization: `Bearer ${MOCK_JWT}` } },
        );
      });

      it('should still return a valid auth response when the garden service call fails', async () => {
        (mockAdmin.auth as jest.Mock).mockReturnValue({
          verifyIdToken: jest.fn().mockResolvedValue(decodedFirebaseToken),
        });
        makeFirestoreChain(false);
        mockedAxios.post.mockRejectedValue(new Error('Garden service unavailable'));

        const result = await firebaseAuthService.loginWithFirebase(MOCK_ID_TOKEN);

        expect(result.token).toBe(MOCK_JWT);
        expect(result.user.userId).toBe(decodedFirebaseToken.uid);
        expect(mockLogger.error).toHaveBeenCalled();
      });

      it('should derive username from email prefix when name is absent', async () => {
        const tokenWithoutName = { ...decodedFirebaseToken, name: undefined };
        (mockAdmin.auth as jest.Mock).mockReturnValue({
          verifyIdToken: jest.fn().mockResolvedValue(tokenWithoutName),
        });
        makeFirestoreChain(false);
        mockedAxios.post.mockResolvedValue({ status: 201 });

        const result = await firebaseAuthService.loginWithFirebase(MOCK_ID_TOKEN);

        // email is 'alice@example.com' → username should be 'alice'
        expect(result.user.username).toBe('alice');
      });
    });

    describe('error handling', () => {
      it('should propagate errors thrown by Firebase verifyIdToken', async () => {
        (mockAdmin.auth as jest.Mock).mockReturnValue({
          verifyIdToken: jest.fn().mockRejectedValue(new Error('Invalid ID token')),
        });

        await expect(
          firebaseAuthService.loginWithFirebase('bad-token'),
        ).rejects.toThrow('Invalid ID token');
      });

      it('should propagate errors thrown by Firestore get()', async () => {
        (mockAdmin.auth as jest.Mock).mockReturnValue({
          verifyIdToken: jest.fn().mockResolvedValue(decodedFirebaseToken),
        });
        const mockDoc = jest.fn().mockReturnValue({
          get: jest.fn().mockRejectedValue(new Error('Firestore unavailable')),
          set: jest.fn(),
        });
        mockFirestore.collection.mockReturnValue({ doc: mockDoc } as any);

        await expect(
          firebaseAuthService.loginWithFirebase(MOCK_ID_TOKEN),
        ).rejects.toThrow('Firestore unavailable');
      });
    });
  });
});
