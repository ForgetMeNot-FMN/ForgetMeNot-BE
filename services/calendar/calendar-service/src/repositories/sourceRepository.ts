import { firestore } from "../services/firebaseAdmin";

const TASKS_COLLECTION = "tasks";

export const sourceRepository = {
  async deleteTask(taskId: string) {
    await firestore.collection(TASKS_COLLECTION).doc(taskId).delete();
  },
};
