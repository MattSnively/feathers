/**
 * Curated default fonts per tool. Deliberately excludes custom/web fonts: a theme that names a font
 * the viewer doesn't have silently falls back, so the preview and the import would disagree.
 *
 * Provenance (see research/FINDINGS.md): Tableau list from the Tableau font family plus the system
 * fonts Tableau documents as server-safe; Power BI list from the format-pane font dropdown, minus
 * symbol fonts. Not yet confirmed against a live dropdown (bd feathers-5ct.11).
 */
export const TABLEAU_FONTS = [
  "Tableau Book",
  "Tableau Light",
  "Tableau Regular",
  "Tableau Medium",
  "Tableau Semibold",
  "Tableau Bold",
  "Arial",
  "Calibri",
  "Courier New",
  "Georgia",
  "Times New Roman",
  "Trebuchet MS",
  "Verdana",
] as const;

export const POWER_BI_FONTS = [
  "Segoe UI",
  "Segoe UI Light",
  "Segoe UI Semibold",
  "DIN",
  "Arial",
  "Arial Black",
  "Calibri",
  "Cambria",
  "Candara",
  "Consolas",
  "Constantia",
  "Corbel",
  "Courier New",
  "Georgia",
  "Lucida Sans Unicode",
  "Tahoma",
  "Times New Roman",
  "Trebuchet MS",
  "Verdana",
] as const;

export type TableauFont = (typeof TABLEAU_FONTS)[number];
export type PowerBiFont = (typeof POWER_BI_FONTS)[number];
