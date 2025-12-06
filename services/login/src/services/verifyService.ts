import admin from "firebase-admin";

class VerifyService {
  async verify(token: string) {
    if (!token) throw new Error("token is required");

    const decoded = await admin.auth().verifyIdToken(token);

    return {
      valid: true,
      uid: decoded.uid,
      email: decoded.email,
      provider: decoded.firebase.sign_in_provider,
    };
  }
}

export const verifyService = new VerifyService();
