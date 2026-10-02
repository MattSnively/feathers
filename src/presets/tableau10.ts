import type { Theme } from "../model/theme";
import { neutralChrome } from "./neutral";

/**
 * The classic Tableau 10 categorical palette. It is not designed for color-blind viewers (blue/orange
 * is its safest pair); the accessibility panel flags the weak pairs.
 */
export const tableau10: Theme = {
  ...neutralChrome,
  name: "Tableau 10",
  palette: {
    categorical: ["#4E79A7", "#F28E2B", "#E15759", "#76B7B2", "#59A14F", "#EDC948", "#B07AA1", "#FF9DA7", "#9C755F", "#BAB0AC"],
    // Derived, not published: an 88% tint of the first color up to the first color.
    sequential: ["#EAEFF4", "#4E79A7"],
    diverging: ["#4E79A7", "#F7F7F7", "#E15759"],
  },
  status: { good: "#59A14F", neutral: "#EDC948", bad: "#E15759" },
};
