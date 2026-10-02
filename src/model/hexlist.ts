import type { Hex } from "./theme";

/** Tableau's Edit Colors dialog shows at most this many colors. */
export const MAX_COLORS = 20;

// Six digits with or without "#" (Figma and brand sheets often drop it); three digits only with "#",
// because bare three-letter words like "bad" or "add" are valid hex too.
const SIX = /^#?([0-9a-f]{6})$/i;
const THREE = /^#([0-9a-f]{3})$/i;

function toHex(token: string): Hex | null {
  const six = SIX.exec(token);
  if (six) return `#${six[1]!.toUpperCase()}`;
  const three = THREE.exec(token);
  if (three) return `#${[...three[1]!].map((d) => d + d).join("").toUpperCase()}`;
  return null;
}

export interface HexList {
  colors: Hex[];
  /** Tokens that weren't colors, so the UI can say what it skipped. */
  ignored: string[];
}

/**
 * Pulls hex colors out of pasted text: any mix of spaces, commas, semicolons and line breaks.
 * Duplicates are dropped (keeping first position) and the list is capped at MAX_COLORS.
 */
export function parseHexList(text: string): HexList {
  const colors: Hex[] = [];
  const ignored: string[] = [];
  for (const token of text.split(/[\s,;|]+/).filter(Boolean)) {
    const hex = toHex(token);
    if (!hex) ignored.push(token);
    else if (!colors.includes(hex)) colors.push(hex);
  }
  if (colors.length > MAX_COLORS) {
    ignored.push(...colors.splice(MAX_COLORS));
  }
  return { colors, ignored };
}
