export interface ChatMessage {
  role: "user" | "model";
  content: string;
  timestamp: number;
}

export interface ChatSession {
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
}

export interface ChatPreferences {
  personalizedContext: boolean;
}

export interface ChatUserDoc {
  preferences?: ChatPreferences;
}

export interface SendMessageRequest {
  message: string;
  sessionDate?: string; // YYYY-MM-DD, defaults to today
}

export interface SendMessageResponse {
  reply: string;
  sessionDate: string;
}
