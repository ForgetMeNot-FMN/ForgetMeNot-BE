import { GrowthStage } from "../utils/enums";

export interface Flower {
  flowerId: string;    // Doc id ile aynı
  flowerName: string;
  type: string;               // "Forget Me Not", vs.
  growthStage: GrowthStage.SEED | GrowthStage.SPROUT | GrowthStage.BLOOM;
  isAlive: boolean;

  waterCount: number;
  lastWateredAt?: Date;

  createdAt: Date;
}
