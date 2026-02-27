import { firestore } from "./firebaseAdmin";
import { Task } from "../models/taskModel";
import dayjs from "dayjs";

const TASKS_COLLECTION = "tasks";
const NOTIFICATIONS_COLLECTION = "notifications";

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

  async completeTaskWithReward(
    taskId: string,
    userId: string,
    rewardCoins: number,
    rewardWater: number,
  ) {
    return firestore.runTransaction(async (tx) => {
      const taskRef = firestore.collection(TASKS_COLLECTION).doc(taskId);
      const gardenRef = firestore.collection("gardens").doc(userId);

      const taskSnap = await tx.get(taskRef);
      if (!taskSnap.exists) throw new Error("Task not found");

      const task = taskSnap.data() as Task;
      if (task.userId !== userId) throw new Error("Forbidden");

      let coinsEarned = 0;
      let waterEarned = 0;

      if (!task.rewardGranted) {
        const gardenSnap = await tx.get(gardenRef);
        if (!gardenSnap.exists) throw new Error("Garden not found");

        const garden = gardenSnap.data()!;
        tx.update(gardenRef, {
          coins: (garden.coins || 0) + rewardCoins,
          water: (garden.water || 0) + rewardWater,
          updated_at: new Date(),
        });

        coinsEarned = rewardCoins;
        waterEarned = rewardWater;
      }

      tx.update(taskRef, {
        isCompleted: true,
        isActive: false,
        completedAt: new Date(),
        rewardGranted: true,
        rewardGrantedAt: task.rewardGrantedAt || new Date(),
        updatedAt: new Date(),
      });

      return {
        taskId,
        alreadyCompleted: Boolean(task.isCompleted),
        rewarded: {
          coins: coinsEarned,
          water: waterEarned,
        },
      };
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

async getNotificationIdByTaskId(taskId: string): Promise<string | null> {
  const snapshot = await firestore
    .collection(NOTIFICATIONS_COLLECTION)
    .where("sourceId", "==", taskId)
    .get();

  if (snapshot.empty) {
    return null;
  }

  return snapshot.docs[0].id;
}
};
