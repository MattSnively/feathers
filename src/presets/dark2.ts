import type { Theme } from "../model/theme";
import { neutralChrome } from "./neutral";

/**
 * ColorBrewer "Dark2" (Brewer, colorbrewer2.org): eight saturated qualitative colors that read well on
 * white. Brewer rates it as not color-blind safe overall; the accessibility panel flags the weak pairs.
 */
export const dark2: Theme = {
  ...neutralChrome,
  name: "ColorBrewer Dark2",
  palette: {
    categorical: ["#1B9E77", "#D95F02", "#7570B3", "#E7298A", "#66A61E", "#E6AB02", "#A6761D", "#666666"],
    // Derived, not published: an 88% tint of the first color up to the first color.
    sequential: ["#E4F3EF", "#1B9E77"],
    diverging: ["#1B9E77", "#F7F7F7", "#D95F02"],
  },
  status: { good: "#1B9E77", neutral: "#E6AB02", bad: "#D95F02" },
};
