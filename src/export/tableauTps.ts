import type { Theme } from "../model/theme";
import { validateTheme } from "../model/validate";

// Straight quotes only: Tableau silently ignores palettes written with curly quotes.
const escapeXml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const palette = (name: string, type: string, colors: string[]) =>
  [
    `    <color-palette name="${escapeXml(name)}" type="${type}">`,
    ...colors.map((c) => `      <color>${c}</color>`),
    "    </color-palette>",
  ].join("\n");

/**
 * Returns a full Preferences.tps. Users who already have one must paste the
 * <color-palette> blocks into it rather than replace it; the import guide says so.
 */
export function exportTableauTps(theme: Theme): string {
  validateTheme(theme);
  const { name, palette: p } = theme;
  return [
    "<?xml version='1.0'?>",
    "<workbook>",
    "  <preferences>",
    palette(name, "regular", p.categorical),
    palette(`${name} Sequential`, "ordered-sequential", p.sequential),
    palette(`${name} Diverging`, "ordered-diverging", p.diverging),
    "  </preferences>",
    "</workbook>",
    "",
  ].join("\n");
}
