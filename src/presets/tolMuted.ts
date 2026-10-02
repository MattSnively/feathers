import type { Theme } from "../model/theme";
import { neutralChrome } from "./neutral";

/**
 * Paul Tol's "Muted" qualitative scheme plus his BuRd diverging and YlOrBr sequential schemes,
 * all published as colour-blind safe at sronpersonalpages.nl/~pault. Tol's "bad data" grey
 * (#DDDDDD) has no slot in our model yet.
 */
export const tolMuted: Theme = {
  ...neutralChrome,
  name: "Paul Tol Muted (colorblind-safe)",
  palette: {
    // Rose, indigo, sand, green, cyan, wine, teal, olive, purple.
    categorical: ["#CC6677", "#332288", "#DDCC77", "#117733", "#88CCEE", "#882255", "#44AA99", "#999933", "#AA4499"],
    // YlOrBr endpoints (lightest, and the dark #993404 step); Tableau interpolates between them.
    sequential: ["#FFFFE5", "#993404"],
    // BuRd endpoints and center.
    diverging: ["#2166AC", "#F7F7F7", "#B2182B"],
  },
  status: { good: "#117733", neutral: "#DDCC77", bad: "#CC6677" },
};
