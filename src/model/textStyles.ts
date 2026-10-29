import type { Theme } from "./theme";

/** The Power BI `textClasses` the schema defines, with a plain-language guess at what each styles. Unverified in Power BI Desktop (feathers-kfj.5). */
export const TEXT_STYLES = [
  { id: "title", label: "Title", use: "Visual titles", role: "title" },
  { id: "header", label: "Header", use: "Table and matrix headers", role: "title" },
  { id: "callout", label: "Callout", use: "Card values (big KPI numbers)", role: "title" },
  { id: "label", label: "Label", use: "Axes, legends and data labels", role: "body" },
  { id: "largeTitle", label: "Large title", use: "Large headings", role: "title" },
  { id: "dataTitle", label: "Data title", use: "Titles over data", role: "title" },
  { id: "boldLabel", label: "Bold label", use: "Emphasized labels", role: "body" },
  { id: "largeLabel", label: "Large label", use: "Large labels", role: "body" },
  { id: "largeLightLabel", label: "Large light label", use: "Large, subdued labels", role: "body" },
  { id: "lightLabel", label: "Light label", use: "Subdued labels", role: "body" },
  { id: "semiboldLabel", label: "Semibold label", use: "Semi-emphasized labels", role: "body" },
  { id: "smallLabel", label: "Small label", use: "Small labels", role: "body" },
  { id: "smallLightLabel", label: "Small light label", use: "Small, subdued labels", role: "body" },
  { id: "smallDataLabel", label: "Small data label", use: "Small data labels", role: "body" },
] as const;

export type TextClass = (typeof TEXT_STYLES)[number]["id"];
export type TextWeight = "normal" | "bold";

/** A per-style override; anything left out follows the theme's body or title setting. */
export interface TextStyle {
  font?: string;
  size?: number;
  weight?: TextWeight;
}

export const TEXT_SIZE = { min: 6, max: 72 } as const;

/** The four classes Feathers has always written; the rest are written only when overridden. */
const CORE = new Set<TextClass>(["title", "header", "callout", "label"]);

export interface ResolvedTextStyle {
  font: string;
  size: number;
  weight?: TextWeight;
}

/**
 * What a text class exports, or null when Power BI should keep its own default. Core classes always
 * resolve, from the theme's body/title settings; the other ten resolve only once overridden, so
 * themes that never touch "Each style" export exactly as before.
 */
export function resolveTextStyle(theme: Theme, id: TextClass): ResolvedTextStyle | null {
  const override = theme.textStyles?.[id];
  if (!CORE.has(id) && !override) return null;
  const spec = TEXT_STYLES.find((s) => s.id === id)!;
  const { fonts, sizes } = theme;
  const size = id === "callout" ? sizes.callout : spec.role === "title" ? sizes.title : sizes.body;
  const out: ResolvedTextStyle = {
    font: override?.font ?? fonts.powerBi[spec.role],
    size: override?.size ?? size,
  };
  if (override?.weight) out.weight = override.weight;
  return out;
}
