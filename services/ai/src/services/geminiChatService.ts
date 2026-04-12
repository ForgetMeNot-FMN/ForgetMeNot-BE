import {
  GoogleGenerativeAI,
  HarmBlockThreshold,
  HarmCategory,
} from "@google/generative-ai";
import { envs } from "../utils/const";
import { ChatMessage } from "../models/chatModel";
import { systemPromptService } from "./systemPromptService";
import { logger } from "../utils/logger";

const genAI = new GoogleGenerativeAI(envs.GEMINI_API_KEY);

const MAX_MESSAGE_LENGTH = 1000;
const MAX_HISTORY_TURNS = 20;

const PROMPT_INJECTION_PATTERNS = [
  /ignore (previous|all|above|prior) instructions/i,
  /forget (previous|all|above|prior|your) instructions/i,
  /you are now/i,
  /new persona/i,
  /disregard (previous|all|your)/i,
  /system prompt/i,
  /\[system\]/i,
  /jailbreak/i,
  /do anything now/i,
  /dan mode/i,
];

function detectPromptInjection(message: string): boolean {
  return PROMPT_INJECTION_PATTERNS.some((pattern) => pattern.test(message));
}

export const geminiChatService = {
  async sendMessage(
    userMessage: string,
    history: ChatMessage[],
    contextSummary?: string,
  ): Promise<string> {
    if (detectPromptInjection(userMessage)) {
      logger.warn("Prompt injection attempt detected in chat message", {
        messageLength: userMessage.length,
        historyMessageCount: history.length,
      });
      return "I'm here to help with your habits and productivity! Let's keep focused on that. What would you like to work on today?";
    }

    const basePrompt = await systemPromptService.getSystemPrompt();
    const systemInstruction = contextSummary
      ? `${basePrompt}\n\nUser context (use this to personalize your responses):\n${contextSummary}`
      : basePrompt;

    logger.debug("Preparing Gemini chat request", {
      messageLength: userMessage.length,
      historyMessageCount: history.length,
      contextLength: contextSummary?.length ?? 0,
    });

    const model = genAI.getGenerativeModel({
      model: envs.GEMINI_MODEL,
      systemInstruction,
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
      ],
    });

    const recentHistory = history.slice(-MAX_HISTORY_TURNS);
    const geminiHistory = recentHistory.map((msg) => ({
      role: msg.role,
      parts: [{ text: msg.content }],
    }));

    const chat = model.startChat({ history: geminiHistory });
    const result = await chat.sendMessage(userMessage.slice(0, MAX_MESSAGE_LENGTH));

    const candidate = result.response.candidates?.[0];
    if (!candidate || candidate.finishReason === "SAFETY") {
      logger.warn("Gemini chat response blocked by safety filters", {
        finishReason: candidate?.finishReason ?? null,
      });
      return "I'm not able to respond to that. Let's keep focused on building healthy habits and productivity. What would you like to work on?";
    }

    const responseText = result.response.text();
    logger.debug("Gemini chat response received", {
      finishReason: candidate.finishReason ?? "STOP",
      responseLength: responseText.length,
    });

    return responseText;
  },
};
