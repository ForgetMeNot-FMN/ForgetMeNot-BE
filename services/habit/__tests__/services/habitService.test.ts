jest.mock('../../src/utils/const', () => ({
  envs: {
    FIREBASE_SERVICE_ACCOUNT: '{}',
    JWT_SECRET: 'test-secret',
    PORT: '8080',
    HABIT_REWARD_COINS: 5,
    HABIT_REWARD_WATER: 1,
    GCP_PROJECT_ID: 'test-project',
    CALENDAR_EVENTS_TOPIC: 'test-topic',
  },
}));
jest.mock('../../src/utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));
jest.mock('../../src/services/habitRepository', () => ({
  habitRepository: {
    create: jest.fn(),
    findById: jest.fn(),
    findActiveByUser: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));
jest.mock('../../src/repository/habitCompletionRepository', () => ({
  habitCompletionRepository: {
    findByHabitAndDate: jest.fn(),
    create: jest.fn(),
  },
}));
jest.mock('../../src/clients/notificationClient', () => ({
  createHabitNotification: jest.fn(),
  deleteHabitNotifications: jest.fn().mockResolvedValue(0),
  markHabitNotificationsCompleted: jest.fn(),
}));
jest.mock('../../src/clients/calendarEventPublisher', () => ({
  publishCalendarEvent: jest.fn(),
  publishCalendarDeleteEvent: jest.fn(),
}));

import { habitService } from '../../src/services/habitService';
import { habitRepository } from '../../src/services/habitRepository';
import { createHabitNotification, deleteHabitNotifications } from '../../src/clients/notificationClient';
import { publishCalendarDeleteEvent } from '../../src/clients/calendarEventPublisher';
import { Habit, habitDTO } from '../../src/models/habitModel';

const mockRepo = habitRepository as jest.Mocked<typeof habitRepository>;
const mockCreateNotif = createHabitNotification as jest.MockedFunction<typeof createHabitNotification>;
const mockDeleteNotif = deleteHabitNotifications as jest.MockedFunction<typeof deleteHabitNotifications>;
const mockPublishDelete = publishCalendarDeleteEvent as jest.MockedFunction<typeof publishCalendarDeleteEvent>;

//  fixtures 

const USER_ID = 'user-abc';
const HABIT_ID = 'habit-xyz';

function makeHabit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: HABIT_ID,
    userId: USER_ID,
    title: 'Morning run',
    description: 'Run 5km every morning',
    startDate: new Date('2024-01-01'),
    schedule: { type: 'weekly', days: [1, 3, 5] },
    type: 'boolean',
    status: 'active',
    notificationEnabled: false,
    notificationTime: null,
    currentStreak: 0,
    longestStreak: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeDto(overrides: Partial<habitDTO> = {}): habitDTO {
  return {
    title: 'Morning run',
    startDate: new Date('2024-01-01'),
    schedule: { type: 'weekly', days: [1, 3, 5] },
    type: 'boolean',
    status: 'active',
    notificationEnabled: false,
    ...overrides,
  };
}

//  tests 

describe('habitService', () => {
  beforeEach(() => jest.clearAllMocks());

  //  createHabit 

  describe('createHabit()', () => {
    it('should create a habit and return it', async () => {
      mockRepo.create.mockResolvedValue(undefined);

      const result = await habitService.createHabit(USER_ID, makeDto());

      expect(mockRepo.create).toHaveBeenCalledTimes(1);
      expect(result).toMatchObject({
        userId: USER_ID,
        title: 'Morning run',
        status: 'active',
        currentStreak: 0,
        longestStreak: 0,
      });
    });

    it('should generate a uuid id for the new habit', async () => {
      mockRepo.create.mockResolvedValue(undefined);

      const result = await habitService.createHabit(USER_ID, makeDto());

      expect(typeof result.id).toBe('string');
      expect(result.id.length).toBeGreaterThan(0);
    });

    it('should not call createHabitNotification when notificationEnabled is false', async () => {
      mockRepo.create.mockResolvedValue(undefined);

      await habitService.createHabit(USER_ID, makeDto({ notificationEnabled: false }));

      expect(mockCreateNotif).not.toHaveBeenCalled();
    });

    it('should create a RECURRING notification for a weekly schedule', async () => {
      mockRepo.create.mockResolvedValue(undefined);
      mockCreateNotif.mockResolvedValue(undefined as any);

      await habitService.createHabit(
        USER_ID,
        makeDto({
          notificationEnabled: true,
          notificationTime: '08:00',
          timezone: 'Europe/Istanbul',
          schedule: { type: 'weekly', days: [1, 3, 5] },
        }),
      );

      expect(mockCreateNotif).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: USER_ID,
          sourceType: 'HABIT',
          scheduleType: 'RECURRING',
          repeatRule: expect.objectContaining({
            interval: 'weekly',
            daysOfWeek: [1, 3, 5],
          }),
        }),
      );
    });

    it('should create a CRON notification for an interval schedule', async () => {
      mockRepo.create.mockResolvedValue(undefined);
      mockCreateNotif.mockResolvedValue(undefined as any);

      await habitService.createHabit(
        USER_ID,
        makeDto({
          notificationEnabled: true,
          notificationTime: '09:00',
          timezone: 'UTC',
          schedule: { type: 'interval', everyNDays: 2, startDate: '2024-01-01' },
        }),
      );

      expect(mockCreateNotif).toHaveBeenCalledWith(
        expect.objectContaining({
          scheduleType: 'CRON',
          cronExpression: expect.stringContaining('*/2'),
        }),
      );
    });

    it('should still return the habit even if notification creation fails', async () => {
      mockRepo.create.mockResolvedValue(undefined);
      mockCreateNotif.mockRejectedValue(new Error('Notification service down'));

      const result = await habitService.createHabit(
        USER_ID,
        makeDto({ notificationEnabled: true }),
      );

      expect(result).toMatchObject({ title: 'Morning run' });
    });
  });

  //  getHabit 

  describe('getHabit()', () => {
    it('should return the habit when found', async () => {
      const habit = makeHabit();
      mockRepo.findById.mockResolvedValue(habit);

      const result = await habitService.getHabit(USER_ID, HABIT_ID);

      expect(mockRepo.findById).toHaveBeenCalledWith(HABIT_ID, USER_ID);
      expect(result).toMatchObject({ id: HABIT_ID });
    });

    it('should return null when the habit is not found', async () => {
      mockRepo.findById.mockResolvedValue(null);

      const result = await habitService.getHabit(USER_ID, 'nonexistent');

      expect(result).toBeNull();
    });
  });

  //  getActiveHabits 

  describe('getActiveHabits()', () => {
    it('should return the list of active habits', async () => {
      const habits = [makeHabit(), makeHabit({ id: 'habit-2' })];
      mockRepo.findActiveByUser.mockResolvedValue(habits);

      const result = await habitService.getActiveHabits(USER_ID);

      expect(result).toHaveLength(2);
    });

    it('should return an empty array when no active habits exist', async () => {
      mockRepo.findActiveByUser.mockResolvedValue([]);

      const result = await habitService.getActiveHabits(USER_ID);

      expect(result).toEqual([]);
    });
  });

  //  updateHabit 

  describe('updateHabit()', () => {
    it('should return null when the habit is not found', async () => {
      mockRepo.findById.mockResolvedValue(null);

      const result = await habitService.updateHabit(USER_ID, HABIT_ID, { title: 'New title' });

      expect(result).toBeNull();
      expect(mockRepo.update).not.toHaveBeenCalled();
    });

    it('should update and return the merged habit when found', async () => {
      const habit = makeHabit();
      mockRepo.findById.mockResolvedValue(habit);
      mockRepo.update.mockResolvedValue(undefined);

      const result = await habitService.updateHabit(USER_ID, HABIT_ID, { title: 'Evening run' });

      expect(mockRepo.update).toHaveBeenCalledWith(
        HABIT_ID,
        expect.objectContaining({ title: 'Evening run' }),
      );
      expect(result!.title).toBe('Evening run');
    });
  });

  //  deleteHabit 

  describe('deleteHabit()', () => {
    it('should delete notifications, publish a calendar delete event, and remove the habit', async () => {
      mockRepo.delete.mockResolvedValue(makeHabit());
      mockDeleteNotif.mockResolvedValue(undefined);
      mockPublishDelete.mockResolvedValue(undefined);

      await habitService.deleteHabit(USER_ID, HABIT_ID);

      expect(mockDeleteNotif).toHaveBeenCalledWith(HABIT_ID);
      expect(mockRepo.delete).toHaveBeenCalledWith(USER_ID, HABIT_ID);
    });

    it('should still delete the habit even if the calendar event publish fails', async () => {
      mockPublishDelete.mockRejectedValue(new Error('Pub/Sub unavailable'));
      mockDeleteNotif.mockResolvedValue(undefined);
      mockRepo.delete.mockResolvedValue(makeHabit());

      await habitService.deleteHabit(USER_ID, HABIT_ID);

      expect(mockRepo.delete).toHaveBeenCalledWith(USER_ID, HABIT_ID);
    });
  });
});
