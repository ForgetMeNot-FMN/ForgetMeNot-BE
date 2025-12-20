import { firestore } from "./firebaseAdmin";
import { Task } from "../models/taskModel";

const TASKS_COLLECTION = "tasks";

export const taskRepository = {
  async getTasksByUserId(userId: string): Promise<Task[]> {
    const snapshot = await firestore
      .collection(TASKS_COLLECTION)
      .where("user_id", "==", userId)
      .get();

    return snapshot.docs.map(doc => ({
      ...(doc.data() as Task),
      task_id: doc.id, // Firestore doc id = task_id
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
    task_id: doc.id,
  };
},



  async create(userId: string, data: Omit<Task, "task_id" | "user_id" |"created_at">): Promise<Task> {
    const ref = firestore.collection(TASKS_COLLECTION).doc();

    const task: Task = {
      task_id: ref.id,
      user_id: userId,
      created_at: new Date(),
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
        updated_at: new Date(),
      });
  },

  async delete(taskId: string) {
    await firestore.collection(TASKS_COLLECTION)
      .doc(taskId)
      .delete();
  },
};
