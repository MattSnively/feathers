import type { Theme } from "../model/theme";
import { neutralChrome } from "./neutral";

/**
 * Okabe & Ito (2002) color-universal-design palette, in the order popularized by Wong (2011).
 * Hex values cross-checked against several published references; the authors' page gives no hex.
 */
export const okabeIto: Theme = {
  ...neutralChrome,
  name: "Okabe-Ito (colorblind-safe)",
  palette: {
    // Orange, sky blue, bluish green, yellow, blue, vermilion, reddish purple, black.
    // Yellow (#F0E442) has low contrast on white: use it for fills and marks, not for text.
    categorical: ["#E69F00", "#56B4E9", "#009E73", "#F0E442", "#0072B2", "#D55E00", "#CC79A7", "#000000"],
    // Derived, not published: a light tint of Blue (88% white) up to Blue.
    sequential: ["#E0EEF6", "#0072B2"],
    // Blue - neutral - Vermilion keeps the diverging scale distinguishable under red-green deficiency.
    diverging: ["#0072B2", "#F7F7F7", "#D55E00"],
  },
  status: { good: "#009E73", neutral: "#F0E442", bad: "#D55E00" },
};
