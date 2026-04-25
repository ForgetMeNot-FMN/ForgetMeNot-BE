import { CharacterCategory, CharacterSlot } from "./characterDefinitionModel";
import { LocalizedText } from "../utils/localization";

export interface CharacterItem {
  itemId: string;
  key: string;
  displayName: string;
  displayNameTranslations?: LocalizedText;

  category: CharacterCategory;
  slot: CharacterSlot;

  equipped: boolean;

  createdAt: Date;
  updatedAt: Date;
}
