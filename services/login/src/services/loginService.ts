import admin from "firebase-admin";
import { BigQuery } from "@google-cloud/bigquery";

const bq = new BigQuery();
const dataset = bq.dataset("forget_me_not");
const table = dataset.table("users");

class LoginService {
  async login(idToken: string) {
    if (!idToken) throw new Error("idToken is required");

    const decoded = await admin.auth().verifyIdToken(idToken);

    const userInfo = {
      uid: decoded.uid,
      email: decoded.email || "",
      name: decoded.name || "",
      picture: decoded.picture || "",
      provider: decoded.firebase.sign_in_provider,
    };

    const user = await this.saveUserIfNotExists(userInfo);

    return {
      message: "Login successful",
      user,
    };
  }

  private async saveUserIfNotExists(user: any) {
    const query = `
      SELECT * FROM \`forget_me_not.users\`
      WHERE uid = @uid
      LIMIT 1
    `;

    const [rows] = await bq.query({ query, params: { uid: user.uid } });

    if (rows.length > 0) return rows[0];

    const newUser = {
      ...user,
      createdAt: new Date().toISOString(),
    };

    await table.insert(newUser);

    return newUser;
  }
}

export const loginService = new LoginService();
