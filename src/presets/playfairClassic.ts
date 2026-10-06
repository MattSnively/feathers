import type { Theme } from "../model/theme";
import { neutralChrome } from "./neutral";

/**
 * Playfair Data's earlier theme file (PlayfairData_Theme_PBI.json): a red, teal and orange palette. It only
 * defines colors, so the neutral chrome fills in the rest. Red and orange sit next to each other in the
 * palette; the accessibility panel flags the weak pairs.
 */
export const playfairClassic: Theme = {
  ...neutralChrome,
  name: "Playfair Classic",
  palette: {
    categorical: ["#FA4135", "#034859", "#01313C", "#FAA335", "#FA5E2E", "#00A79D", "#80CAE2", "#4996B2"],
    // The file's own minimum / center / maximum.
    diverging: ["#025AD6", "#EBEDF6", "#00B180"],
    // Derived, not in the file: an 88% tint of the deep teal up to the teal.
    sequential: ["#E1E9EB", "#034859"],
  },
  status: { good: "#33CC99", neutral: "#749AFC", bad: "#FF534C" },
};
