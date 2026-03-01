import { AwardType } from "./awardsModel";

export interface AwardsDTO {
  key: string;
  title: string;
  awardType: AwardType;
  value: number;
  badgeImageUrl?: string | null;
}
