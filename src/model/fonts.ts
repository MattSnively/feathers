/**
 * Curated default fonts per tool. Deliberately excludes custom/web fonts: a theme that names a font
 * the viewer doesn't have silently falls back, so the preview and the import would disagree.
 *
 * Provenance (see research/FINDINGS.md): Tableau list from the Tableau font family plus the system
 * fonts Tableau documents as server-safe; Power BI list from the format-pane font dropdown, minus
 * symbol fonts. Both lists confirmed against live dropdowns in Tableau Desktop and Power BI Desktop.
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
  // Power BI's dropdown labels the bold weight "Segoe (Bold)", not "Segoe UI Bold".
  "Segoe (Bold)",
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

export const DEFAULT_FONTS = { powerBi: "Segoe UI", tableau: "Tableau Book" } as const;

export interface FontSupport {
  powerBi: boolean;
  tableau: boolean;
}

export function fontSupport(name: string): FontSupport {
  return {
    powerBi: (POWER_BI_FONTS as readonly string[]).includes(name),
    tableau: (TABLEAU_FONTS as readonly string[]).includes(name),
  };
}

/** Every font either tool ships, shared ones first, so a single list can say which tool each works in. */
export const ALL_FONTS: readonly string[] = (() => {
  const shared = POWER_BI_FONTS.filter((f) => fontSupport(f).tableau);
  const powerBiOnly = POWER_BI_FONTS.filter((f) => !fontSupport(f).tableau);
  const tableauOnly = TABLEAU_FONTS.filter((f) => !fontSupport(f).powerBi);
  return [...shared, ...powerBiOnly, ...tableauOnly];
})();

type FontSlots = { powerBi: { body: string; title: string }; tableau: { body: string; title: string } };
export type FontRole = "body" | "title";

/**
 * The font a theme is "using" when the user picks one font for everything. Power BI's font wins unless
 * it is just the untouched default and Tableau has a deliberate choice.
 */
export function currentFont(fonts: FontSlots, role: FontRole = "body"): string {
  const powerBi = fonts.powerBi[role];
  const tableau = fonts.tableau[role];
  const untouchedPowerBi = powerBi === DEFAULT_FONTS.powerBi;
  const tableauChoice = tableau !== DEFAULT_FONTS.tableau;
  return untouchedPowerBi && tableauChoice && !fontSupport(powerBi).tableau ? tableau : powerBi;
}

/**
 * Applies one font to both tools, for body text, titles, or both. A tool that doesn't ship it gets its
 * own default, so the exported file never names a font that tool can't show.
 */
export function applyFont(fonts: FontSlots, name: string, role: FontRole | "both" = "both"): void {
  const support = fontSupport(name);
  const powerBi = support.powerBi ? name : DEFAULT_FONTS.powerBi;
  const tableau = support.tableau ? name : DEFAULT_FONTS.tableau;
  for (const slot of role === "both" ? (["body", "title"] as const) : [role]) {
    fonts.powerBi[slot] = powerBi;
    fonts.tableau[slot] = tableau;
  }
}

/** Compact label for a select option, since an option can't carry the colored tag a card does. */
export function fontLabel(name: string): string {
  const { powerBi, tableau } = fontSupport(name);
  return `${name} · ${powerBi && tableau ? "both" : powerBi ? "Power BI" : "Tableau"}`;
}

/** The sentence shown after picking a font. */
export function fontNotice(name: string): { kind: "both" | "partial"; text: string } {
  const { powerBi, tableau } = fontSupport(name);
  if (powerBi && tableau) return { kind: "both", text: `${name} works in both Power BI and Tableau.` };
  if (powerBi) return { kind: "partial", text: `${name} is a Power BI font. Tableau doesn't ship it, so your Tableau theme will use ${DEFAULT_FONTS.tableau} instead.` };
  return { kind: "partial", text: `${name} is a Tableau font. Power BI doesn't ship it, so your Power BI theme will use ${DEFAULT_FONTS.powerBi} instead.` };
}
