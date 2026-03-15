export function parseAmenities(raw: string | null): string[] {
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

export function getCurrentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}
