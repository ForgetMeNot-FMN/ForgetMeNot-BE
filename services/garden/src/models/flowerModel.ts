import { GrowthStage } from "../utils/enums";

export interface Flower {
  id: string;                 // firestore doc id
  flower_id: string;          // business id (opsiyonel)
  flower_name: string;
  type: string;               // "Forget Me Not", vs.
  growth_stage: GrowthStage.SEED | GrowthStage.SPROUT | GrowthStage.BLOOM;
  is_alive: boolean;

  water_count: number;
  last_watered_at?: Date;

  created_at: Date;
}
