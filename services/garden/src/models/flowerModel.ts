import { GrowthStage } from "../utils/enums";
import { LocalizedText } from "../utils/localization";

export interface Flower {
  flowerId: string;    // Doc id ile aynÄ±
  flowerName: string;
  flowerNameTranslations?: LocalizedText;
  isCustomName?: boolean;
  type: string;               // "Forget Me Not", vs.
  growthStage: GrowthStage.SEED | GrowthStage.SPROUT | GrowthStage.BLOOM;
  isAlive: boolean;

  waterCount: number;
  lastWateredAt?: Date;

  createdAt: Date;
  updatedAt?: Date;
  plantedAt?: Date | null;

  location: "GARDEN" | "INVENTORY";

  displaySlot?: number | null; // 1, 2, 3; for pot number
}
