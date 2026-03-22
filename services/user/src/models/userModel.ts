export interface UserPermissions {
  allowCalendar: boolean;
  allowKVKK: boolean;
  allowLocation: boolean;
}

export interface Onboarding {
  completed: boolean;
  goals: string[]; //motivated, to build healthy habits... 
  painPoints: string[]; //lack of motivation, time management, procastination...
  motivationType: string; //reward, discipline
  tonePreference: string; //soft, friendly, strict
  dailyCommitment: number; //15dk, 30dk
  preferredTime: string; //morning, afternoon, evening
  selfDisciplineLevel: number; //1-5 arası
}

export type AuthProvider = "google" | "local";

export interface User {
  userId: string;
  email: string;
  username: string;
  authProvider: AuthProvider;
  age: number | null;
  gender: string | null;
  allowNotification: boolean;
  fcmTokens: string[];
  permissions: UserPermissions;
  onboarding: Onboarding;
  created_at: Date;
}
