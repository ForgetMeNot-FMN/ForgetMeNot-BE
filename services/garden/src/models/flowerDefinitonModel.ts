export interface FlowerDefinition {
  key: string;              // forget_me_not
  displayName: string;      // Forget Me Not
  meaning: string;
  description: string;
  price: number;
  growth: {
    seedToSprout: number;
    sproutToBloom: number;
  };
  lifespanDays: number;
  inStore: boolean;
}
