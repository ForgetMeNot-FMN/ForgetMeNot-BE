import { callLLM } from "./llmService";
import { generatePrompt } from "./promptBuilderService";
import { logger } from "../utils/logger";
import {
  getFallbackResponse,
  GenerateNotificationMessageParams,
  GenerateNotificationMessageResult,
  llmResponseSchema,
} from "../models/llmModels";

export async function generateNotificationMessage(
  params: GenerateNotificationMessageParams,
): Promise<GenerateNotificationMessageResult> {
  const { userContext, weeklyData, notificationType } = params;
  const language = userContext.profile.userLanguage;

  const prompt = generatePrompt(userContext, weeklyData, notificationType);

  logger.info("Prompt built successfully", {
    userId: userContext.userId,
    notificationType,
    systemPromptLength: prompt.systemPrompt.length,
    userPromptLength: prompt.userPrompt.length,
  });

  let rawResponse: string;

  try {
    rawResponse = await callLLM(prompt.systemPrompt, prompt.userPrompt);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);

    logger.error("LLM call failed — using fallback message", {
      userId: userContext.userId,
      notificationType,
      error: message,
    });

    return toFallbackResult(notificationType, language);
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(rawResponse);
  } catch {
    logger.error("LLM response is not valid JSON — using fallback message", {
      userId: userContext.userId,
      notificationType,
      rawResponse,
    });

    return toFallbackResult(notificationType, language);
  }

  const validation = llmResponseSchema.safeParse(parsed);

  if (!validation.success) {
    logger.error(
      "LLM response failed schema validation — using fallback message",
      {
        userId: userContext.userId,
        notificationType,
        rawResponse,
        validationErrors: validation.error.issues,
      },
    );

    return toFallbackResult(notificationType, language);
  }

  const validated = validation.data;

  logger.info("LLM message generated successfully", {
    userId: userContext.userId,
    notificationType,
    tone: validated.tone,
    titleLength: validated.title.length,
    bodyLength: validated.body.length,
  });

  return {
    title: validated.title,
    body: validated.body,
    tone: validated.tone,
    notificationType,
    fallbackUsed: false,
    generationSource: "LLM",
  };
}

function toFallbackResult(
  notificationType: string,
  language?: string | null,
): GenerateNotificationMessageResult {
  const fallback = getFallbackResponse(language);
  return {
    title: fallback.title,
    body: fallback.body,
    tone: fallback.tone,
    notificationType,
    fallbackUsed: true,
    generationSource: "SYSTEM",
  };
}
