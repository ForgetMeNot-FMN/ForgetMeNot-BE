export interface UserPermissions {
  allowCalendar: boolean;
  allowKVKK: boolean;
  allowLocation: boolean;
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
  created_at: Date;
}
