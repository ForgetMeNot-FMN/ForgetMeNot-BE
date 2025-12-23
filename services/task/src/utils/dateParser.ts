import dayjs from "dayjs";

export function normalizeDateOnly(input: any): string | null {
  if (!input) return null;

  // Eğer JS Date objesiyse
  if (input instanceof Date && !isNaN(input.getTime())) {
    return dayjs(input).format("YYYY-MM-DD");
  }

  // Eğer string ise
  if (typeof input === "string") {
    const parsed = dayjs(input);
    if (parsed.isValid()) return parsed.format("YYYY-MM-DD");
  }

  throw new Error("Invalid date format");
}

export function normalizeDateTime(input: any): Date | null {
  if (!input) return null;

  // Eğer JS Date ise
  if (input instanceof Date && !isNaN(input.getTime())) {
    return input;
  }

  // ISO string vs.
  if (typeof input === "string") {
    const parsed = new Date(input);
    if (!isNaN(parsed.getTime())) return parsed;
  }

  throw new Error("Invalid datetime format");
}
