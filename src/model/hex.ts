/** Accepts "#0a3746", "0A3746" or the 3-digit shorthand "#abc"; returns "#RRGGBB" uppercase, or null. */
export function normalizeHex(input: string): string | null {
  const m = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(input.trim());
  if (!m) return null;
  const digits = m[1]!;
  const full = digits.length === 3 ? [...digits].map((d) => d + d).join("") : digits;
  return `#${full.toUpperCase()}`;
}
