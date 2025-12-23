import { firestore } from "./firebaseAdmin";
import { Task } from "../models/taskModel";
import dayjs from "dayjs";

const TASKS_COLLECTION = "tasks";

export const taskRepository = {
  async getTasksByUserId(userId: string): Promise<Task[]> {
    const snapshot = await firestore
      .collection(TASKS_COLLECTION)
      .where("userId", "==", userId)
      .get();

    return snapshot.docs.map(doc => ({
      ...(doc.data() as Task),
      taskId: doc.id, // Firestore doc.id = taskId
    }));
  },

  async getTaskById(taskId: string): Promise<Task> {
  const doc = await firestore
    .collection(TASKS_COLLECTION)
    .doc(taskId)
    .get();

  if (!doc.exists) {
    throw new Error("Task not found");
  }

  return {
    ...(doc.data() as Task),
    taskId: doc.id,
  };
},



  async create(userId: string, data: Omit<Task, "taskId" | "userId" |"createdAt">): Promise<Task> {
    const ref = firestore.collection(TASKS_COLLECTION).doc();

    const task: Task = {
      taskId: ref.id,
      userId: userId,
      createdAt: new Date(),
      ...data,
    };

    await ref.set(task);
    return task;
  },

  async update(taskId: string, data: Partial<Task>) {
    await firestore.collection(TASKS_COLLECTION)
      .doc(taskId)
      .update({
        ...data,
        updatedAt: new Date(),
      });
  },

  async delete(taskId: string) {
    await firestore.collection(TASKS_COLLECTION)
      .doc(taskId)
      .delete();
  },

  // Bugün bitecek olan tasklerin hepsi
  async getTodayCompletedTasks(userId: string): Promise<Task[]> {
  const start = dayjs().startOf("day").toDate();
  const end = dayjs().endOf("day").toDate();

  const snapshot = await firestore
    .collection(TASKS_COLLECTION)
    .where("userId", "==", userId)
    .where("isCompleted", "==", true)
    .where("completedAt", ">=", start)
    .where("completedAt", "<=", end)
    .get();

  return snapshot.docs.map(doc => ({
    ...(doc.data() as Task),
    taskId: doc.id,
  }));
},

// Bugün daha bitmemiş olan taskler
async getTodayUncompletedDueTasks(userId: string): Promise<Task[]> {
  const start = dayjs().startOf("day").toDate();
  const end = dayjs().endOf("day").toDate();

  const snapshot = await firestore
    .collection(TASKS_COLLECTION)
    .where("userId", "==", userId)
    .where("isCompleted", "==", false)
    .where("endTime", ">=", start)
    .where("endTime", "<=", end)
    .get();

  return snapshot.docs.map(doc => ({
    ...(doc.data() as Task),
    taskId: doc.id,
  }));
},


};
