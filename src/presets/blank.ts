import type { Theme } from "../model/theme";
import { neutralChrome } from "./neutral";

/** Starting point for "start from scratch": neutral chrome plus four colorblind-safe Tol Bright colors. */
export const blank: Theme = {
  ...neutralChrome,
  name: "My theme",
  palette: {
    categorical: ["#4477AA", "#EE6677", "#228833", "#CCBB44"],
    sequential: ["#E0EEF6", "#4477AA"],
    diverging: ["#4477AA", "#F7F7F7", "#EE6677"],
  },
  status: { good: "#228833", neutral: "#CCBB44", bad: "#EE6677" },
};
