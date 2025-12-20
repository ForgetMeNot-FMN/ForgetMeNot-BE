import { Request, Response } from "express";
import { habitService } from "../services/habitService";

export async function createHabitHandler(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const habitData = req.body;
    const result = await habitService.createHabit(userId, habitData);
    return res.status(201).json({ success: true, data: result });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

export async function getHabitHandler(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const { habitId } = req.params;

    const result = await habitService.getHabit(userId, habitId);
    return res.json({ success: true, data: result });
  } catch (err: any) {
    return res.status(404).json({ success: false, message: err.message });
  }
}

export async function getActiveHabitsHandler(req: Request, res: Response) {
  try {
    const { userId } = req.params;

    const result = await habitService.getActiveHabits(userId);
    return res.json({ success: true, data: result });
  } catch (err: any) {
    return res.status(404).json({ success: false, message: err.message });
  }
}

export async function deleteHabitHandler(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const { habitId } = req.params;
    const result = await habitService.deleteHabit(userId, habitId);
    return res.json({
      success: true,
      message: "Habit deleted successfully",
      deletedHabit: result,
    });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

export async function completeHabitHandler(req: Request, res: Response) {
  try {
    const userId = req.headers["x-user-id"] as string;
    const { habitId } = req.params;

    const result = await habitService.completeHabit(userId, habitId);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export async function progressHandler(req: Request, res: Response) {
  try {
    const userId = req.headers["x-user-id"] as string;
    const { habitId } = req.params;
    const days = Number(req.query.days) || 7;

    const result = await habitService.getHabitProgress(
      userId,
      habitId,
      days
    );

    res.json(result);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
}