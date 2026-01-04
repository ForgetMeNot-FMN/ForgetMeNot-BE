import { userRepository } from "./firebaseService";
import { User } from "../models/userModel";
import { logger } from "../utils/logger";

class UserService {
  async createUser(payload: User) {
    logger.info("Create user request", { userId: payload.userId });

    const existing = await userRepository.getById(payload.userId);
    if (existing) {
      logger.warn("User already exists", { userId: payload.userId });
      throw new Error("User already exists");
    }

    const created = await userRepository.create(payload.userId, {
      email: payload.email,
      username: payload.username,
      authProvider: payload.authProvider,
      age: payload.age ?? null,
      gender: payload.gender ?? null,
      allowNotification: true,
      fcmTokens: [],
      permissions: payload.permissions,
      created_at: new Date(),
    });

    logger.info("User created successfully", { userId: payload.userId });

    return created;
  }

  async getUser(userId: string) {
    logger.debug("Get user request", { userId });

    const user = await userRepository.getById(userId);
    if (!user) {
      logger.warn("User not found", { userId });
      throw new Error("User not found");
    }

    logger.debug("User fetched", { userId });

    return user;
  }

  async updateUser(userId: string, data: Partial<User>) {
    logger.info("Update user request", { userId, updatedFields: Object.keys(data) });

    await userRepository.update(userId, data);

    logger.info("User updated", { userId });

    return this.getUser(userId);
  }

  async updatePermissions(userId: string, permissions: User["permissions"]) {
    logger.info("Update permissions request", { userId, permissions });

    await userRepository.update(userId, { permissions });

    logger.info("Permissions updated", { userId });

    return this.getUser(userId);
  }

  async deleteUser(userId: string) {
    logger.warn("Delete user request", { userId });

    await userRepository.delete(userId);

    logger.info("User deleted", { userId });
  }

  async setAllowNotification(userId: string, allow: boolean) {
    logger.info("Set allow notification request", { userId, allow });
    await userRepository.update(userId, { allowNotification: allow });
    logger.info("Allow notification updated", { userId, allow });
  }

  async addFcmToken(userId: string, token: string) {
    logger.info("Add FCM token request", { userId });
    await userRepository.addFcmToken(userId, token);
    logger.info("FCM token added", { userId });
  }
}

export const userService = new UserService();
