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

const ROLEPLAY_PATTERNS = [
  // Turkish: persona/roleplay change requests
  /gibi\s*(konuş|davran|yaz|ol|cevap ver)/i,
  /(korsan|ninja|canavar|robot|şeytan|iblis|dedektif|karakter)\s*(gibi|olarak)\s*(konuş|davran|yaz|ol)/i,
  /(roleplay|rol\s*yap|rol\s*oyna|karakter\s*oyna)/i,
  /(sen\s*(artık|şimdi|bundan sonra)\s*(bir|bir\s*\w+\s*)?(değilsin|degilsin|varsın|varsın))/i,
  // English: roleplay / persona change requests
  /\b(act|speak|talk|respond|pretend|roleplay)\b.{0,20}\b(like|as|as if)\b/i,
  /\b(be|become|play|impersonate)\b.{0,10}\b(pirate|villain|evil|demon|robot|character|persona)\b/i,
  /\b(from now on|starting now|henceforth)\b.{0,30}\b(you are|you will|act as)\b/i,
];

function buildProfanityPatterns(): RegExp[] {
  const raw = envs.PROFANITY_PATTERNS;
  if (!raw.trim()) return [];
  return raw
    .split("|")
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => new RegExp(p, "i"));
}

const PROFANITY_PATTERNS = buildProfanityPatterns();

function detectRoleplayRequest(message: string): boolean {
  return ROLEPLAY_PATTERNS.some((pattern) => pattern.test(message));
}

function detectProfanity(message: string): boolean {
  return PROFANITY_PATTERNS.some((pattern) => pattern.test(message));
}

const CONTENT_GENERATION_PATTERNS = [
  // Turkish: homework / report / essay generation requests
  /\bödev\b.{0,40}(rapor|makale|yaz|örnek|hazırla|oluştur)/i,
  /rapor\s*(örneği|yaz|oluştur|hazırla|ver)/i,
  /(örnek|sample)\s*(rapor|makale|essay|ödev)\s*(ver|yaz|oluştur)/i,
  /(yaz|oluştur|hazırla|ver)\s*.{0,20}(makale|essay|ödev\s*rapor)/i,
  // English: report / essay / article / homework generation requests
  /\b(write|generate|create|draft|give me|provide)\b.{0,30}\b(report|essay|article|homework|assignment|paper)\b/i,
  /\b(example|sample)\b.{0,20}\b(report|essay|article|homework)\b/i,
];

function detectContentGenerationRequest(message: string): boolean {
  return CONTENT_GENERATION_PATTERNS.some((pattern) => pattern.test(message));
}

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

    if (detectContentGenerationRequest(userMessage)) {
      logger.warn("Content generation request detected in chat message", {
        messageLength: userMessage.length,
        historyMessageCount: history.length,
      });
      return "I'm not able to write academic content or reports. I'm here to help you with your own habits in the app — would you like to review your progress or get some tips? 🐦";
    }

    if (detectRoleplayRequest(userMessage)) {
      logger.warn("Roleplay/persona change request detected in chat message", {
        messageLength: userMessage.length,
        historyMessageCount: history.length,
      });
      return "I'm Garden Helper, a cheerful little bird — and that's all I'll ever be! 🐦 I can't take on other personas. What habits can I help you with today?";
    }

    if (detectProfanity(userMessage)) {
      logger.warn("Profanity detected in chat message", {
        messageLength: userMessage.length,
        historyMessageCount: history.length,
      });
      return "Let's keep things friendly! 🐦 I'm here to help you build great habits. What would you like to work on?";
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
          threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
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
