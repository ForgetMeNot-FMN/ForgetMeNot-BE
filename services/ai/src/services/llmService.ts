import { GoogleGenerativeAI } from "@google/generative-ai";
import { envs } from "../utils/const";
import { logger } from "../utils/logger";

export async function callLLM(
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const client = new GoogleGenerativeAI(envs.GEMINI_API_KEY);

  const model = client.getGenerativeModel({
    model: envs.GEMINI_MODEL,
    systemInstruction: systemPrompt,
    generationConfig: {
      responseMimeType: "application/json",
    },
  });

  logger.info("Sending prompt to Gemini", {
    model: envs.GEMINI_MODEL,
    systemPromptLength: systemPrompt.length,
    userPromptLength: userPrompt.length,
    systemPromptPreview: systemPrompt.slice(0, 100),
    userPromptPreview: userPrompt.slice(0, 100),
  });

  const result = await model.generateContent(userPrompt);
  const rawText = result.response.text();

  logger.info("Raw LLM response received", { rawText });

  return rawText;
}
