export interface CalendarAccount {
  userId: string;
  provider: "google";
  accessToken: string;
  refreshToken: string | null;
  expiryDate: number | null; // Unix timestamp ms
  nextSyncToken: string | null;
  scopes: string[];
  createdAt: Date;
  updatedAt: Date;
}
