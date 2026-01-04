import { Request, Response } from "express";
import { userService } from "../services/userService";

export async function createUserHandler(req: Request, res: Response) {
  try {
    const user = await userService.createUser(req.body);
    return res.status(201).json({ success: true, data: user });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

export async function getUserHandler(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const user = await userService.getUser(userId);
    return res.json({ success: true, data: user });
  } catch (err: any) {
    return res.status(404).json({ success: false, message: err.message });
  }
}

export async function updateUserHandler(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const user = await userService.updateUser(userId, req.body);
    return res.json({ success: true, data: user });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

export async function updatePermissionsHandler(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const user = await userService.updatePermissions(userId, req.body);
    return res.json({ success: true, data: user });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

export async function deleteUserHandler(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    await userService.deleteUser(userId);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

export async function setAllowNotificationHandler(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const { allow } = req.body;
    await userService.setAllowNotification(userId, allow);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

export async function addFcmTokenHandler(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const { token } = req.body;
    await userService.addFcmToken(userId, token);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
}