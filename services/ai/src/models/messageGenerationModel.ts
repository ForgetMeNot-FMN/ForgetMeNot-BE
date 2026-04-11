export interface GenerateNotificationMessageRequest {
  userId: string;
  sourceType: "HABIT" | "TASK" | "FLOWER" | "SYSTEM";
  sourceId?: string;
  triggerReason?: string;
}

export interface GenerateNotificationMessageResponse {
  notificationType: string;
  tone: string;
  title?: string;
  body?: string;
  message: string;
  fallbackUsed: boolean;
  fallbackMetadata?: {
    branch: string;
    variantIndex: number;
    sourceType: "HABIT" | "TASK" | "FLOWER" | "SYSTEM";
    personaTone: string;
    intensity: string;
    demographicLeaf: string;
  };
  llmPromptContext?: {
    systemInstruction: string;
    userContextSummary: string;
    userSpecificNotes: string[];
  };
}
