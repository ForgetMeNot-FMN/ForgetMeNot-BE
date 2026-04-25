import { LocalizedText } from "../utils/localization";

export interface FlowerDefinition {
  key: string;              // forget_me_not
  displayName: string;      // Forget Me Not
  displayNameTranslations?: LocalizedText;
  meaning: string;
  meaningTranslations?: LocalizedText;
  description: string;
  descriptionTranslations?: LocalizedText;
  price: number;
  growth: {
    seedToSprout: number;
    sproutToBloom: number;
  };
  lifespanDays: number;
  inStore: boolean;
}
