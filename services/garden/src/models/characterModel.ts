import { CharacterCategory, CharacterSlot } from "./characterDefinitionModel";

export interface CharacterItem {
  itemId: string;
  key: string;
  displayName: string;

  category: CharacterCategory;
  slot: CharacterSlot;

  equipped: boolean;

  createdAt: Date;
  updatedAt: Date;
}