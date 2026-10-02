import { colorDifference, mix } from "../a11y/color";
import { hexToHsl, hslToHex } from "./hsl";
import type { Hex } from "./theme";

const MAX_TINT = 0.88;
const NEUTRAL_CENTER = "#F7F7F7";

/**
 * Sequential and diverging ramps for a palette that doesn't define them (pasted hex codes, an
 * imported Power BI theme). Sequential runs from a light tint to the first color. Diverging pairs the
 * first color with whichever other color is furthest from it, so the two ends are clearly different.
 */
export function deriveRamps(colors: Hex[]): { sequential: [Hex, Hex]; diverging: [Hex, Hex, Hex] } {
  const first = colors[0]!;
  const others = colors.slice(1);
  let far: Hex;
  if (others.length > 0) {
    far = others.reduce((best, c) => (colorDifference(first, c) > colorDifference(first, best) ? c : best));
  } else {
    // A single color has no partner, so use its opposite on the hue wheel.
    const { h, s, l } = hexToHsl(first);
    far = hslToHex({ h: (h + 180) % 360, s, l });
  }
  return {
    sequential: [mix(first, "#FFFFFF", MAX_TINT), first],
    diverging: [first, NEUTRAL_CENTER, far],
  };
}
