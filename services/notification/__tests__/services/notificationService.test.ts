jest.mock('../../src/services/notificationRepository', () => ({
  notificationRepository: {
    getNotificationsByUserId: jest.fn(),
    getNotificationById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    enable: jest.fn(),
    disable: jest.fn(),
    softDelete: jest.fn(),
    delete: jest.fn(),
    getActiveNotifications: jest.fn(),
    getPendingScheduledNotifications: jest.fn(),
    getNotificationsBySourceId: jest.fn(),
    deleteBySourceId: jest.fn(),
    logNotificationFeedback: jest.fn(),
    setNotificationLogGenerationSource: jest.fn(),
  },
}));
jest.mock('../../src/services/userClient', () => ({
  userClient: {
    getUserById: jest.fn(),
    canReceiveNotifications: jest.fn(),
  },
}));
jest.mock('../../src/services/cloudTasksClient', () => ({
  cloudTasksClient: { enqueueNotificationDispatch: jest.fn() },
}));
jest.mock('../../src/services/notificationDispatcher', () => ({
  notificationDispatcher: { dispatch: jest.fn() },
}));
jest.mock('../../src/services/firebaseAdmin', () => ({
  firestore: {},
}));
jest.mock('../../src/utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

import { notificationService } from '../../src/services/notificationService';
import { notificationRepository } from '../../src/services/notificationRepository';
import { userClient } from '../../src/services/userClient';
import { cloudTasksClient } from '../../src/services/cloudTasksClient';
import { AppNotification } from '../../src/models/notificationModel';
import { notificationDto } from '../../src/models/notificationDTO';

const mockRepo = notificationRepository as jest.Mocked<typeof notificationRepository>;
const mockUserClient = userClient as jest.Mocked<typeof userClient>;
const mockCloudTasks = cloudTasksClient as jest.Mocked<typeof cloudTasksClient>;

//  fixtures 

function makeNotification(overrides: Partial<AppNotification> = {}): AppNotification {
  return {
    notificationId: 'notif-123',
    userId: 'user-abc',
    sourceType: 'HABIT',
    title: 'Time to work out',
    body: 'Keep the streak going!',
    type: 'REMINDER',
    priority: 'high',
    enabled: true,
    scheduleType: 'ONCE',
    scheduledAt: new Date(Date.now() + 3_600_000).toISOString(),
    timezone: 'UTC',
    deliveryStatus: 'PENDING',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isDeleted: false,
    createdBySystem: false,
    ...overrides,
  };
}

function makeDto(overrides: Partial<notificationDto> = {}): notificationDto {
  return {
    userId: 'user-abc',
    sourceType: 'HABIT',
    title: 'Exercise time',
    body: 'Your daily workout is due',
    type: 'REMINDER',
    priority: 'high',
    enabled: true,
    scheduleType: 'ONCE',
    scheduledAt: new Date(Date.now() + 3_600_000).toISOString(),
    timezone: 'Europe/Istanbul',
    ...overrides,
  };
}

//  tests 

describe('notificationService', () => {
  beforeEach(() => jest.clearAllMocks());

  //  canDispatch() 

  describe('canDispatch()', () => {
    it('should return true for a valid, pending notification', () => {
      expect(notificationService.canDispatch(makeNotification())).toBe(true);
    });

    it('should return false when enabled is false', () => {
      expect(notificationService.canDispatch(makeNotification({ enabled: false }))).toBe(false);
    });

    it('should return false when isDeleted is true', () => {
      expect(notificationService.canDispatch(makeNotification({ isDeleted: true }))).toBe(false);
    });

    it.each(['SENT', 'CANCELLED', 'PROCESSING'] as const)(
      'should return false when deliveryStatus is %s',
      (status) => {
        expect(
          notificationService.canDispatch(makeNotification({ deliveryStatus: status })),
        ).toBe(false);
      },
    );

    it('should return true for PENDING, SCHEDULED, FAILED statuses', () => {
      for (const status of ['PENDING', 'SCHEDULED', 'FAILED'] as const) {
        expect(
          notificationService.canDispatch(makeNotification({ deliveryStatus: status })),
        ).toBe(true);
      }
    });

    it('should return false when both enabled=false and isDeleted=true', () => {
      expect(
        notificationService.canDispatch(makeNotification({ enabled: false, isDeleted: true })),
      ).toBe(false);
    });
  });

  //  createNotification() 
  describe('createNotification() — validateCreateBody', () => {

    it('should throw when title is missing', async () => {
      await expect(
        notificationService.createNotification('user-abc', makeDto({ title: '' })),
      ).rejects.toThrow('title is required');
    });

    it('should throw when body is missing', async () => {
      await expect(
        notificationService.createNotification('user-abc', makeDto({ body: '' })),
      ).rejects.toThrow('body is required');
    });

    it('should throw when type is missing', async () => {
      await expect(
        notificationService.createNotification('user-abc', { ...makeDto(), type: '' as any }),
      ).rejects.toThrow('type is required');
    });

    it('should throw when scheduleType is missing', async () => {
      await expect(
        notificationService.createNotification('user-abc', { ...makeDto(), scheduleType: '' as any }),
      ).rejects.toThrow('scheduleType is required');
    });

    it('should throw when timezone is missing', async () => {
      await expect(
        notificationService.createNotification('user-abc', makeDto({ timezone: '' })),
      ).rejects.toThrow('timezone is required');
    });

    it('should throw when scheduleType is ONCE and scheduledAt is absent', async () => {
      await expect(
        notificationService.createNotification(
          'user-abc',
          makeDto({ scheduleType: 'ONCE', scheduledAt: undefined }),
        ),
      ).rejects.toThrow('scheduledAt is required when scheduleType is ONCE');
    });

    it('should throw when RECURRING and repeatRule is absent', async () => {
      await expect(
        notificationService.createNotification(
          'user-abc',
          makeDto({ scheduleType: 'RECURRING', repeatRule: undefined }),
        ),
      ).rejects.toThrow('repeatRule is required when scheduleType is RECURRING');
    });

    it('should throw when RECURRING weekly and daysOfWeek is absent', async () => {
      await expect(
        notificationService.createNotification(
          'user-abc',
          makeDto({
            scheduleType: 'RECURRING',
            repeatRule: { interval: 'weekly', timesOfDay: ['09:00'] },
          }),
        ),
      ).rejects.toThrow('repeatRule.daysOfWeek is required for weekly schedule');
    });

    it('should throw when CRON and cronExpression is absent', async () => {
      await expect(
        notificationService.createNotification(
          'user-abc',
          makeDto({ scheduleType: 'CRON', cronExpression: undefined }),
        ),
      ).rejects.toThrow('cronExpression is required when scheduleType is CRON');
    });
  });

  //  createNotification() — happy path

  describe('createNotification() — happy path', () => {
    it('should create an IMMEDIATE notification and enqueue it in Cloud Tasks', async () => {
      const notification = makeNotification({ scheduleType: 'IMMEDIATE' });
      mockUserClient.getUserById.mockResolvedValue({ userId: 'user-abc' } as any);
      mockUserClient.canReceiveNotifications.mockResolvedValue(true);
      mockRepo.create.mockResolvedValue(notification);
      mockCloudTasks.enqueueNotificationDispatch.mockResolvedValue(undefined as any);

      const result = await notificationService.createNotification(
        'user-abc',
        makeDto({ scheduleType: 'IMMEDIATE' }),
      );

      expect(mockCloudTasks.enqueueNotificationDispatch).toHaveBeenCalledWith(
        notification.notificationId,
      );
      expect(result.notificationId).toBe('notif-123');
    });

    it('should throw when user has disabled notifications', async () => {
      mockUserClient.getUserById.mockResolvedValue({ userId: 'user-abc' } as any);
      mockUserClient.canReceiveNotifications.mockResolvedValue(false);

      await expect(
        notificationService.createNotification('user-abc', makeDto()),
      ).rejects.toThrow('User has disabled notifications');
    });

    it('should throw when user is not found', async () => {
      mockUserClient.getUserById.mockResolvedValue(null);

      await expect(
        notificationService.createNotification('user-abc', makeDto()),
      ).rejects.toThrow('User not found');
    });
  });

  //  getTaskReminderTimes() 

  describe('getTaskReminderTimes()', () => {
    it('should return only ONCE-type notifications mapped to reminderTimes', async () => {
      mockRepo.getNotificationsBySourceId.mockResolvedValue([
        makeNotification({ scheduleType: 'ONCE', scheduledAt: '2024-06-01T09:00:00Z' }),
        makeNotification({ scheduleType: 'RECURRING', notificationId: 'notif-456' }),
      ]);

      const result = await notificationService.getTaskReminderTimes('task-source-1');

      expect(result).toHaveLength(1);
      expect(result[0].notificationId).toBe('notif-123');
      expect(result[0].scheduledAt).toBe('2024-06-01T09:00:00Z');
    });

    it('should return an empty array when no ONCE notifications exist for the source', async () => {
      mockRepo.getNotificationsBySourceId.mockResolvedValue([
        makeNotification({ scheduleType: 'RECURRING' }),
      ]);

      const result = await notificationService.getTaskReminderTimes('task-source-1');

      expect(result).toEqual([]);
    });
  });
});
