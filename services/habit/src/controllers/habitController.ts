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
    const { habit } = req.body;

    const result = await habitService.getHabit(userId, habit.id);
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
    const { habit } = req.body;
    await habitService.deleteHabit(userId, habit.id);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
}
