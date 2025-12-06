import { userRepository } from "./firebaseService";
import { User } from "../models/userModel";

class UserService {
  async createUser(payload: User) {
    const existing = await userRepository.getById(payload.userId);
    if (existing) throw new Error("User already exists");

    return await userRepository.create(payload.userId, {
      email: payload.email,
      username: payload.username,
      authProvider: payload.authProvider,
      age: payload.age ?? null,
      gender: payload.gender ?? null,
      allowNotification: true,
      permissions: payload.permissions,
      created_at: new Date(),
    });
  }

  async getUser(userId: string) {
    const user = await userRepository.getById(userId);
    if (!user) throw new Error("User not found");
    return user;
  }

  async updateUser(userId: string, data: Partial<User>) {
    await userRepository.update(userId, data);
    return this.getUser(userId);
  }

  async updatePermissions(userId: string, permissions: User["permissions"]) {
    await userRepository.update(userId, { permissions });
    return this.getUser(userId);
  }

  async deleteUser(userId: string) {
    await userRepository.delete(userId);
  }
}

export const userService = new UserService();
