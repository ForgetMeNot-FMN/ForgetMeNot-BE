export type AuthProvider = "google" | "local";

export interface GoogleLoginRequest {
  idToken: string;
}

export interface LocalRegisterRequest {
  email: string;
  password: string;
  username: string;
  age?: number;
  gender?: "Male" | "Female" | "Other";
}

export interface LocalLoginRequest {
  email: string;
  password: string;
}

export interface AuthUser {
  userId: string;
  email: string;
  username: string;
  authProvider: AuthProvider;
  age?: number | null;
  gender?: string | null;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}
