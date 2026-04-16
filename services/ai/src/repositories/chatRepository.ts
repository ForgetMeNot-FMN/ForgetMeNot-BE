import { firestore } from "../services/firebaseAdmin";
import {
  ChatMessage,
  ChatPreferences,
  ChatSession,
  ChatUserDoc,
} from "../models/chatModel";
import { logger } from "../utils/logger";
import { decryptMessage, encryptMessage } from "../utils/crypto";

function encryptChatMessage(msg: ChatMessage): ChatMessage {
  return { ...msg, content: encryptMessage(msg.content) };
}

function decryptChatMessage(msg: ChatMessage): ChatMessage {
  return { ...msg, content: decryptMessage(msg.content) };
}

const CHAT_SESSIONS_COLLECTION = "chat_sessions";

function userDoc(userId: string) {
  return firestore.collection(CHAT_SESSIONS_COLLECTION).doc(userId);
}

function sessionDoc(userId: string, sessionDate: string) {
  return userDoc(userId).collection("sessions").doc(sessionDate);
}

export const chatRepository = {
  async getPreferences(userId: string): Promise<ChatPreferences | null> {
    const snap = await userDoc(userId).get();
    if (!snap.exists) {
      logger.debug("Chat preferences document not found", { userId });
      return null;
    }

    const data = snap.data() as ChatUserDoc;
    const preferences = data.preferences ?? null;
    logger.debug("Chat preferences loaded", {
      userId,
      hasPreferences: Boolean(preferences),
      personalizedContext: preferences?.personalizedContext ?? null,
    });
    return preferences;
  },

  async setPreferences(
    userId: string,
    preferences: ChatPreferences,
  ): Promise<void> {
    await userDoc(userId).set({ preferences }, { merge: true });
    logger.info("Chat preferences persisted", {
      userId,
      personalizedContext: preferences.personalizedContext,
    });
  },

  async getSession(
    userId: string,
    sessionDate: string,
  ): Promise<ChatSession | null> {
    const snap = await sessionDoc(userId, sessionDate).get();
    if (!snap.exists) {
      logger.debug("Chat session not found in repository", {
        userId,
        sessionDate,
      });
      return null;
    }

    const raw = snap.data() as ChatSession;
    const session: ChatSession = {
      ...raw,
      messages: raw.messages.map(decryptChatMessage),
    };
    logger.debug("Chat session loaded from repository", {
      userId,
      sessionDate,
      messageCount: session.messages.length,
    });
    return session;
  },

  async listSessionDates(userId: string, limit = 50): Promise<string[]> {
    const snap = await userDoc(userId)
      .collection("sessions")
      .orderBy("updatedAt", "desc")
      .limit(limit)
      .get();

    const sessionDates = snap.docs.map((d) => d.id);
    logger.debug("Chat session dates listed from repository", {
      userId,
      limit,
      resultCount: sessionDates.length,
    });
    return sessionDates;
  },

  async appendMessagePair(
    userId: string,
    sessionDate: string,
    userMessage: ChatMessage,
    modelMessage: ChatMessage,
    existingSession: ChatSession | null,
  ): Promise<void> {
    const ref = sessionDoc(userId, sessionDate);
    const now = Date.now();
    const encryptedUser = encryptChatMessage(userMessage);
    const encryptedModel = encryptChatMessage(modelMessage);

    if (!existingSession) {
      await ref.set({
        createdAt: now,
        updatedAt: now,
        messages: [encryptedUser, encryptedModel],
      });
      logger.info("New chat session created", {
        userId,
        sessionDate,
        messageCount: 2,
      });
      return;
    }

    const existingEncrypted = existingSession.messages.map(encryptChatMessage);
    await ref.update({
      updatedAt: now,
      messages: [...existingEncrypted, encryptedUser, encryptedModel],
    });
    logger.info("Chat session updated", {
      userId,
      sessionDate,
      previousMessageCount: existingSession.messages.length,
      newMessageCount: existingSession.messages.length + 2,
    });
  },

  async deleteSession(userId: string, sessionDate: string): Promise<void> {
    await sessionDoc(userId, sessionDate).delete();
    logger.info("Chat session deleted from repository", {
      userId,
      sessionDate,
    });
  },
};
