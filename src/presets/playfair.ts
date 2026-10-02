import type { Theme } from "../model/theme";

/** Playfair Data brand colors (brand guidelines p.21) arranged into theme roles. */
export const playfair: Theme = {
  name: "Playfair Data",
  palette: {
    // Blue Wing, Orange Feather, Dark Green, Dark Red, Dark Yellow, Dark Orange Feather, Dark Blue Wing, Light Ink.
    // Dark Green next to Dark Red is a red-green pair; the accessibility checker should flag it.
    categorical: ["#0A3746", "#F99A2B", "#0F542C", "#8A1E00", "#B2AF73", "#B36000", "#03222C", "#9C8F82"],
    // Paper -> Blue Wing. The brand guide defines no ramp; the endpoints are brand colors, Tableau interpolates.
    sequential: ["#F3F4EF", "#0A3746"],
    // Blue Wing - Paper - Orange Feather: a blue/orange pair, safe for common color-vision deficiencies.
    diverging: ["#0A3746", "#F3F4EF", "#F99A2B"],
  },
  status: { good: "#0F542C", neutral: "#B2AF73", bad: "#8A1E00" },
  text: { primary: "#201914", secondary: "#4A403A", muted: "#9C8F82" },
  background: { canvas: "#F3F4EF", page: "#FFFFFF", container: "#FFFFFF" },
  gridline: { visible: true, style: "dotted", width: 1, color: "#DDDAD3" },
  zeroline: { visible: true, style: "solid", width: 1, color: "#9C8F82" },
  // The brand typeface isn't a default font in either tool, so use the nearest defaults.
  fonts: {
    powerBi: { body: "Segoe UI", title: "Segoe UI Semibold" },
    tableau: { body: "Tableau Book", title: "Tableau Semibold" },
  },
  sizes: { body: 10, title: 14, callout: 40 },
};
