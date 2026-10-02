import { POWER_BI_FONTS } from "./fonts";
import { normalizeHex } from "./hex";
import { MAX_COLORS } from "./hexlist";
import { deriveRamps } from "./ramps";
import type { LineStyle, Theme } from "./theme";
import { validateTheme } from "./validate";

export type ImportResult =
  | { ok: true; theme: Theme; /** What was found and used, in plain words. */ applied: string[]; /** What was left alone and why. */ notes: string[] }
  | { ok: false; error: string };

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** Power BI allows #RGB, #RRGGBB and #RRGGBBAA; we keep the opaque six digits. */
function color(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  const rgba = /^#([0-9a-f]{6})[0-9a-f]{2}$/i.exec(t);
  return normalizeHex(rgba ? `#${rgba[1]}` : t);
}

/** Visual-style colors are wrapped as { solid: { color } }. */
function solid(v: unknown): string | null {
  return isObject(v) && isObject(v.solid) ? color(v.solid.color) : null;
}

/** Built-in themes name font stacks ("'Segoe UI', wf_segoe-ui_normal, helvetica"); take the first family. */
function firstFamily(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const first = v.split(",")[0]!.trim().replace(/^['"]|['"]$/g, "");
  return first || null;
}

const wholePt = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) && Math.round(v) >= 1 && Math.round(v) <= 99 ? Math.round(v) : null;

const first = (v: unknown): Record<string, unknown> | null => (Array.isArray(v) && isObject(v[0]) ? v[0] : null);

/**
 * Reads an existing Power BI report theme and applies the parts Feathers models (palette, status and
 * gradient colors, text colors, fonts, sizes, gridlines, backgrounds) onto a copy of `base`.
 * Everything else in the file is ignored, and the result is only returned if it is a valid theme.
 */
export function importPowerBiTheme(text: string, base: Theme): ImportResult {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: "That file isn't valid JSON. Pick a Power BI theme file (.json)." };
  }
  if (!isObject(json)) return { ok: false, error: "That file doesn't look like a Power BI theme." };

  const t: Theme = structuredClone(base);
  const applied: string[] = [];
  const notes: string[] = [];

  if (typeof json.name === "string" && json.name.trim()) {
    t.name = json.name.trim().slice(0, 60);
  }

  // ---- Palette -------------------------------------------------------------------------------
  const data = Array.isArray(json.dataColors) ? json.dataColors.map(color).filter((c): c is string => c !== null) : [];
  if (data.length > 0) {
    t.palette.categorical = [...new Set(data)].slice(0, MAX_COLORS);
    const ramps = deriveRamps(t.palette.categorical);
    t.palette.sequential = ramps.sequential;
    t.palette.diverging = ramps.diverging;
    applied.push(`${t.palette.categorical.length} data colors`);
    notes.push("The sequential and diverging palettes aren't in Power BI themes, so Feathers derived them from your colors.");
  }
  const lo = color(json.minimum);
  const mid = color(json.center);
  const hi = color(json.maximum);
  if (lo || mid || hi) {
    t.palette.diverging = [lo ?? t.palette.diverging[0], mid ?? t.palette.diverging[1], hi ?? t.palette.diverging[2]];
    applied.push("gradient colors");
  }

  const status = { good: color(json.good), neutral: color(json.neutral), bad: color(json.bad) };
  if (status.good || status.neutral || status.bad) {
    t.status = { good: status.good ?? t.status.good, neutral: status.neutral ?? t.status.neutral, bad: status.bad ?? t.status.bad };
    applied.push("status colors");
  }

  // ---- Text and structure ---------------------------------------------------------------------
  const primary = color(json.firstLevelElements) ?? color(json.foreground);
  const secondary = color(json.secondLevelElements);
  const muted = color(json.fourthLevelElements);
  if (primary || secondary || muted) {
    t.text = { primary: primary ?? t.text.primary, secondary: secondary ?? t.text.secondary, muted: muted ?? t.text.muted };
    applied.push("text colors");
  }

  const styles = isObject(json.visualStyles) ? json.visualStyles : {};
  const everyVisual = isObject(styles["*"]) && isObject(styles["*"]["*"]) ? (styles["*"]["*"] as Record<string, unknown>) : {};
  const pageCards = isObject(styles.page) && isObject(styles.page["*"]) ? (styles.page["*"] as Record<string, unknown>) : {};

  // ---- Backgrounds ----------------------------------------------------------------------------
  const container = solid(first(everyVisual.background)?.color) ?? color(json.background);
  const page = solid(first(pageCards.background)?.color);
  const canvas = solid(first(pageCards.outspace)?.color);
  if (container || page || canvas) {
    t.background = { canvas: canvas ?? t.background.canvas, page: page ?? t.background.page, container: container ?? t.background.container };
    applied.push("backgrounds");
  }

  // ---- Gridlines ------------------------------------------------------------------------------
  const axis = first(everyVisual.valueAxis) ?? first(everyVisual.categoryAxis);
  const gridColor = (axis ? solid(axis.gridlineColor) : null) ?? color(json.thirdLevelElements);
  let gridFound = false;
  if (gridColor) {
    t.gridline.color = gridColor;
    gridFound = true;
  }
  if (axis) {
    if (typeof axis.gridlineShow === "boolean") {
      t.gridline.visible = axis.gridlineShow;
      gridFound = true;
    }
    if (axis.gridlineStyle === "solid" || axis.gridlineStyle === "dashed" || axis.gridlineStyle === "dotted") {
      t.gridline.style = axis.gridlineStyle as LineStyle;
      gridFound = true;
    }
    if (typeof axis.gridlineThickness === "number") {
      t.gridline.width = Math.min(5, Math.max(1, Math.round(axis.gridlineThickness)));
      gridFound = true;
    }
  }
  if (gridFound) applied.push("gridlines");

  // ---- Fonts and sizes ------------------------------------------------------------------------
  const classes = isObject(json.textClasses) ? json.textClasses : {};
  const cls = (name: string) => (isObject(classes[name]) ? (classes[name] as Record<string, unknown>) : {});
  let typeFound = false;
  for (const [className, slot] of [["label", "body"], ["title", "title"]] as const) {
    const family = firstFamily(cls(className).fontFace);
    if (!family) continue;
    if ((POWER_BI_FONTS as readonly string[]).includes(family)) {
      t.fonts.powerBi[slot] = family;
      typeFound = true;
    } else {
      notes.push(`The ${slot} font "${family}" isn't one of Power BI's default fonts, so Feathers kept "${t.fonts.powerBi[slot]}".`);
    }
  }
  for (const [className, slot] of [["label", "body"], ["title", "title"], ["callout", "callout"]] as const) {
    const size = wholePt(cls(className).fontSize);
    if (size !== null) {
      t.sizes[slot] = size;
      typeFound = true;
    }
  }
  if (typeFound) applied.push("fonts and sizes");

  const perVisual = Object.keys(styles).some((k) => k !== "*" && k !== "page");
  if (perVisual) notes.push("Formatting for individual visual types in the file isn't imported.");

  if (applied.length === 0) {
    return { ok: false, error: "That file has no settings Feathers can use (colors, fonts, gridlines or backgrounds)." };
  }
  try {
    validateTheme(t);
  } catch (e) {
    return { ok: false, error: `The imported values aren't usable: ${(e as Error).message}` };
  }
  return { ok: true, theme: t, applied, notes };
}
