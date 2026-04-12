import { z } from "zod";
import {
  DailyActivitySnapshot,
  UserContextDTO,
} from "./userContextModel";


export const AllowedToneSchema = z.enum([
  "neutral",
  "positive",
  "encouraging",
  "emotional",
]);

export type AllowedTone = z.infer<typeof AllowedToneSchema>;


export type NotificationType =
  | "REMINDER"
  | "PROGRESS"
  | "MOTIVATION"
  | "SYSTEM";


export const llmResponseSchema = z.object({
  title: z
    .string()
    .min(1, "title cannot be empty")
    .max(60, "title exceeds 60 character limit"),
  body: z
    .string()
    .min(1, "body cannot be empty")
    .max(300, "body exceeds 300 character limit"),
  tone: AllowedToneSchema,
});

export type LLMNotificationResponse = z.infer<typeof llmResponseSchema>;


export interface GenerateNotificationMessageParams {
  userContext: UserContextDTO;
  weeklyData: DailyActivitySnapshot[];
  notificationType: NotificationType;
}

export interface GenerateNotificationMessageResult {
  title: string;
  body: string;
  tone: AllowedTone;
  notificationType: string;
  fallbackUsed: boolean;
  generationSource: "LLM" | "SYSTEM";
}


export interface GeneratedPrompt {
  systemPrompt: string;
  userPrompt: string;
}


export const FALLBACK_RESPONSE: LLMNotificationResponse = {
  title: "Stay consistent",
  body: "Don't forget to stay consistent today.",
  tone: "neutral",
};
