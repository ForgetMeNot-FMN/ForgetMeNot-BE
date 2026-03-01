export type AwardType = "streak" | "flower";

export interface Award {
  awardId: string;
  userId: string;
  key: string;
  title: string;
  awardType: AwardType;
  value: number;
  badgeImageUrl?: string | null;
  status: "unlocked";
  unlockedAt: Date;
  createdAt: Date;
  updatedAt?: Date;
}
