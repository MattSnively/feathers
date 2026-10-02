import type { Theme } from "../model/theme";
import { neutralChrome } from "./neutral";

/**
 * A dark theme built on Paul Tol's "Vibrant" qualitative scheme (colour-blind safe, sronpersonalpages.nl/~pault),
 * which holds up on a dark background. The chrome, ramps and status colors are our own.
 */
export const midnight: Theme = {
  ...neutralChrome,
  name: "Midnight (dark, colorblind-safe)",
  palette: {
    // Orange, blue, cyan, magenta, red, teal, grey.
    categorical: ["#EE7733", "#0077BB", "#33BBEE", "#EE3377", "#CC3311", "#009988", "#BBBBBB"],
    // Low end is dark so "more" reads as brighter against the dark page.
    sequential: ["#16384F", "#33BBEE"],
    diverging: ["#0077BB", "#3A404C", "#EE7733"],
  },
  status: { good: "#009988", neutral: "#EECC66", bad: "#EE3377" },
  text: { primary: "#EEF0F4", secondary: "#C3C8D2", muted: "#9AA1AE" },
  background: { canvas: "#0E1014", page: "#171A21", container: "#1F232C" },
  gridline: { visible: true, style: "solid", width: 1, color: "#343A46" },
  zeroline: { visible: true, style: "solid", width: 1, color: "#6B7384" },
};
