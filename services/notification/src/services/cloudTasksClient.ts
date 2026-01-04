import { CloudTasksClient } from "@google-cloud/tasks";

const client = new CloudTasksClient();

const PROJECT_ID = process.env.GCP_PROJECT_ID!;
const LOCATION = process.env.CLOUD_TASKS_LOCATION!;
const QUEUE = process.env.CLOUD_TASKS_QUEUE!;
const SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL!;
const SERVICE_ACCOUNT = process.env.CLOUD_TASKS_SERVICE_ACCOUNT!;

export const cloudTasksClient = {
  async enqueueNotificationDispatch(
    notificationId: string,
    scheduleTime?: Date
  ) {
    const parent = client.queuePath(PROJECT_ID, LOCATION, QUEUE);

    const task: any = {
      httpRequest: {
        httpMethod: "POST",
        url: `${SERVICE_URL}/internal/notifications/dispatch`,
        headers: {
          "Content-Type": "application/json",
        },
        body: Buffer.from(
          JSON.stringify({ notificationId })
        ).toString("base64"),
        oidcToken: {
          serviceAccountEmail: SERVICE_ACCOUNT,
          audience: SERVICE_URL,
        },
      },
    };

    if (scheduleTime) {
      task.scheduleTime = {
        seconds: Math.floor(scheduleTime.getTime() / 1000),
      };
    }

    const [response] = await client.createTask({ parent, task });

    return response.name;
  },
};
