export type SupportedLocale = "en" | "tr";

export type LocalizedText = Partial<Record<SupportedLocale, string>>;

export function normalizeLocale(value?: unknown): SupportedLocale {
  if (typeof value !== "string") return "en";

  const normalized = value.toLowerCase().split("-")[0];
  return normalized === "tr" ? "tr" : "en";
}

export function resolveLocalizedText(
  value: string | LocalizedText | undefined,
  locale: SupportedLocale,
  fallback = ""
): string {
  if (typeof value === "string") return value;

  return value?.[locale] ?? value?.en ?? value?.tr ?? fallback;
}

export function localizeFlowerDefinition(definition: any, locale: SupportedLocale) {
  return {
    ...definition,
    displayName: resolveLocalizedText(
      definition.displayNameTranslations ?? definition.displayName,
      locale,
      definition.displayName
    ),
    meaning: resolveLocalizedText(
      definition.meaningTranslations ?? definition.meaning,
      locale,
      definition.meaning
    ),
    description: resolveLocalizedText(
      definition.descriptionTranslations ?? definition.description,
      locale,
      definition.description
    ),
  };
}

export function localizeCharacterDefinition(definition: any, locale: SupportedLocale) {
  return {
    ...definition,
    displayName: resolveLocalizedText(
      definition.displayNameTranslations ?? definition.displayName,
      locale,
      definition.displayName
    ),
  };
}
