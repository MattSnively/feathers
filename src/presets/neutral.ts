import type { Theme } from "../model/theme";

/**
 * Shared neutral chrome for the accessible presets, so only the palette differs between them.
 * #767676 is the lightest gray that still reaches 4.5:1 contrast on white.
 */
export const neutralChrome: Omit<Theme, "name" | "palette" | "status"> = {
  text: { primary: "#212121", secondary: "#4D4D4D", muted: "#767676" },
  background: { canvas: "#F5F5F5", page: "#FFFFFF", container: "#FFFFFF" },
  gridline: { visible: true, style: "solid", width: 1, color: "#D9D9D9" },
  zeroline: { visible: true, style: "solid", width: 1, color: "#767676" },
  fonts: {
    powerBi: { body: "Segoe UI", title: "Segoe UI Semibold" },
    tableau: { body: "Tableau Book", title: "Tableau Semibold" },
  },
  sizes: { body: 10, title: 14, callout: 40 },
};
