import type { Theme } from "../model/theme";

/**
 * Shared neutral chrome for the accessible presets, so only the palette differs between them.
 * The page is a light gray so white visuals read as cards; #6B6B6B is the lightest gray that still reaches
 * 4.5:1 contrast on both that page and white.
 */
export const neutralChrome: Omit<Theme, "name" | "palette" | "status"> = {
  text: { primary: "#212121", secondary: "#4D4D4D", muted: "#6B6B6B" },
  background: { canvas: "#F5F5F5", page: "#F0F0F0", container: "#FFFFFF" },
  visualBorder: { visible: false, color: "#000000" },
  gridline: { visible: true, style: "solid", width: 1, color: "#D9D9D9" },
  zeroline: { visible: true, style: "solid", width: 1, color: "#767676" },
  fonts: {
    powerBi: { body: "Segoe UI", title: "Segoe UI Semibold" },
    tableau: { body: "Tableau Book", title: "Tableau Semibold" },
  },
  sizes: { body: 10, title: 14, callout: 40 },
};
