export interface CharacterDefinition {
  key: string;                 // "hat_red_01"
  displayName: string;         // "Red Hat"

  category: CharacterCategory; // "CLOTHING" | "ACCESSORY" | "BODY"
  slot: CharacterSlot;         // "HAT", "DRESS", "HAIR_FRONT" vs.
  
  price: number;
  inStore: boolean;

}

export enum CharacterSlot {
  BODY = "BODY",               // zorunlu
  HEAD = "HEAD",               // zorunlu

  HAIR_BACK = "HAIR_BACK",     // zorunlu
  HAIR_FRONT = "HAIR_FRONT",   // zorunlu

  CLOTHES = "CLOTHES",         // zorunlu
  SHOES = "SHOES",             // zorunlu

  ACCESSORY = "ACCESSORY",     // opsiyonel (hat ya da bow)
}

export enum CharacterCategory {
  BODY = "BODY",
  HEAD = "HEAD",
  HAIR = "HAIR",
  CLOTHES = "CLOTHES",
  SHOES = "SHOES",
  ACCESSORY = "ACCESSORY",
}