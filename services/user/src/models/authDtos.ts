
export interface AuthUser {
  userId: string;
  email: string;
  username: string;
  authProvider: string;
  age?: number | null;
  gender?: string | null;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}
