import type { Theme } from "../model/theme";
import { ThemeError } from "../model/validate";
import type { Tool } from "../state/store";
import { exportPowerBi } from "./powerbi";
import { exportTableauTheme } from "./tableauTheme";
import { exportTableauTps } from "./tableauTps";

export type ExportId = "powerbi" | "tableau-theme" | "tableau-tps";

export interface ExportSpec {
  id: ExportId;
  tool: Tool;
  label: string;
  /** What the user actually does with this file; shown on the export card. */
  hint: string;
  filename: (slug: string) => string;
  mime: string;
  build: (theme: Theme) => string;
}

/**
 * Lowercase letters, digits and hyphens only. That sits inside Tableau's file-name rule
 * (alphanumerics, dots, dashes, spaces, underscores), so one slug is safe for every export.
 */
export function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
  return slug || "theme";
}

export const EXPORTS: readonly ExportSpec[] = [
  {
    id: "powerbi",
    tool: "powerbi",
    label: "Power BI theme",
    hint: "Colors, fonts, gridlines and backgrounds. Import via Design > Import theme.",
    filename: (s) => `${s}.powerbi.json`,
    mime: "application/json",
    build: exportPowerBi,
  },
  {
    id: "tableau-theme",
    tool: "tableau",
    label: "Tableau theme",
    hint: "Fonts, gridlines, backgrounds and one mark color. Import via Format > Import Custom Theme.",
    filename: (s) => `${s}.tableau.json`,
    mime: "application/json",
    build: exportTableauTheme,
  },
  {
    id: "tableau-tps",
    tool: "tableau",
    label: "Tableau palettes",
    hint: "Full categorical, sequential and diverging palettes for Tableau's Preferences.tps.",
    // Not named Preferences.tps on purpose: saving over a user's existing file would erase their palettes.
    filename: (s) => `feathers-${s}.tps`,
    mime: "application/xml",
    build: exportTableauTps,
  },
];

export type ExportResult =
  | { ok: true; filename: string; content: string }
  | { ok: false; filename: string; error: string };

export function runExport(spec: ExportSpec, theme: Theme): ExportResult {
  const filename = spec.filename(slugify(theme.name));
  try {
    return { ok: true, filename, content: spec.build(theme) };
  } catch (e) {
    if (e instanceof ThemeError) return { ok: false, filename, error: e.message };
    throw e;
  }
}
