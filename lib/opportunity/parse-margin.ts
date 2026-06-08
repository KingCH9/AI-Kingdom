/**
 * Parses a profit margin string from Claude (e.g. "65%", "70-80%") into a number.
 */
export function parseProfitMargin(value: string | undefined | null): number {
  if (!value) {
    return 50;
  }

  const normalized = value.replace("%", "").trim();
  const firstSegment = normalized.split("-")[0]?.trim() ?? normalized;
  const parsed = Number(firstSegment);

  if (Number.isNaN(parsed)) {
    return 50;
  }

  return parsed;
}
