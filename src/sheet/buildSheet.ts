import { analyzeTheme, MIN_GRAPHIC_CONTRAST, MIN_TEXT_CONTRAST, type Finding, type Simulation } from "../a11y/analyze";
import { contrastRatio } from "../a11y/color";
import { fontStack } from "../export/css";
import type { Theme } from "../model/theme";
import { validateTheme } from "../model/validate";

export interface Contrast {
  ratio: number;
  need: number;
  meets: boolean;
  /** What the ratio is measured against, in words, so the sheet can say it. */
  against: string;
}

export interface Swatch {
  /** The preview key that edits this color, so the dashboard page can point back to it. */
  key: string;
  label: string;
  hex: string;
  role: string;
  /** Null for colors whose job isn't legibility (backgrounds, gradient ends, gridlines). */
  contrast: Contrast | null;
}

export interface SwatchGroup {
  title: string;
  blurb: string;
  swatches: Swatch[];
}

export interface FontRow {
  /** The Power BI textClasses entry this row is written to. */
  textClass: "title" | "header" | "label" | "callout";
  use: string;
  font: string;
  size: number;
  stack: string;
}

export interface SheetData {
  name: string;
  groups: SwatchGroup[];
  fonts: FontRow[];
  fontNote: string | null;
  findings: Finding[];
  notes: Finding[];
  simulations: Simulation[];
}

const worstContrast = (hex: string, surfaces: [string, string][], need: number): Contrast => {
  const [against, ratio] = surfaces
    .map(([name, surface]) => [name, contrastRatio(hex, surface)] as const)
    .reduce((a, b) => (b[1] < a[1] ? b : a));
  return { ratio, need, meets: ratio >= need, against };
};

const capitalize = (s: string) => s[0]!.toUpperCase() + s.slice(1);

export function buildSheet(theme: Theme): SheetData {
  validateTheme(theme);
  const { palette, status, text, background, gridline, zeroline, visualBorder, fonts, sizes } = theme;
  const chart: [string, string][] = [["chart background", background.container]];
  const textSurfaces: [string, string][] = [["chart background", background.container], ["page background", background.page]];

  const groups: SwatchGroup[] = [
    {
      title: "Data colors",
      blurb: "Series take these in order, so color 1 is the first series in every chart. Light colors are fine as fills but thin on small marks.",
      swatches: palette.categorical.map((hex, i) => ({
        key: `cat-${i}`,
        label: `Color ${i + 1}`,
        hex,
        role: `Data color ${i + 1}`,
        contrast: worstContrast(hex, chart, MIN_GRAPHIC_CONTRAST),
      })),
    },
    {
      title: "Sequential",
      blurb: "A gradient for values that run from low to high. The tools interpolate between the two ends.",
      swatches: [
        { key: "sequential-0", label: "Low end", hex: palette.sequential[0], role: "Lowest value", contrast: null },
        { key: "sequential-1", label: "High end", hex: palette.sequential[1], role: "Highest value", contrast: null },
      ],
    },
    {
      title: "Diverging",
      blurb: "For values that matter on both sides of a midpoint, such as above and below target.",
      swatches: [
        { key: "diverging-0", label: "Low end", hex: palette.diverging[0], role: "Most below the midpoint", contrast: null },
        { key: "diverging-1", label: "Center", hex: palette.diverging[1], role: "The midpoint", contrast: null },
        { key: "diverging-2", label: "High end", hex: palette.diverging[2], role: "Most above the midpoint", contrast: null },
      ],
    },
    {
      title: "Status",
      blurb: "Good, neutral and bad, used for KPI arrows, waterfall and variance charts.",
      swatches: (["good", "neutral", "bad"] as const).map((k) => ({
        key: `status-${k}`,
        label: capitalize(k),
        hex: status[k],
        role: `${capitalize(k)} status`,
        contrast: worstContrast(status[k], chart, MIN_GRAPHIC_CONTRAST),
      })),
    },
    {
      title: "Text",
      blurb: "Three levels of emphasis. Text needs 4.5:1 against its background (WCAG AA).",
      swatches: (
        [
          ["primary", "Primary", "Titles and values"],
          ["secondary", "Secondary", "Labels and axes"],
          ["muted", "Muted", "Disabled and category labels"],
        ] as const
      ).map(([k, label, role]) => ({
        key: `text-${k}`,
        label,
        hex: text[k],
        role,
        contrast: worstContrast(text[k], textSurfaces, MIN_TEXT_CONTRAST),
      })),
    },
    {
      title: "Backgrounds and lines",
      blurb: "Canvas surrounds the page, the page holds the visuals, and each visual sits on the chart background.",
      swatches: [
        { key: "bg-canvas", label: "Canvas", hex: background.canvas, role: "Area around the report page", contrast: null },
        { key: "bg-page", label: "Page", hex: background.page, role: "The report page", contrast: null },
        { key: "bg-container", label: "Chart background", hex: background.container, role: "Behind every visual", contrast: null },
        { key: "gridline-color", label: "Gridlines", hex: gridline.color, role: `${gridline.visible ? "Shown" : "Hidden"}, ${gridline.style}`, contrast: null },
        { key: "zeroline-color", label: "Zero line", hex: zeroline.color, role: `${zeroline.visible ? "Shown" : "Hidden"}, ${zeroline.style}`, contrast: null },
        ...(visualBorder.visible
          ? [{ key: "border-color", label: "Visual border", hex: visualBorder.color, role: "Around every visual", contrast: null }]
          : []),
      ],
    },
  ];

  const pbi = fonts.powerBi;
  const row = (textClass: FontRow["textClass"], use: string, font: string, size: number): FontRow => ({ textClass, use, font, size, stack: fontStack(font) });
  // Mirrors the textClasses the Power BI exporter writes.
  const fontRows = [
    row("title", "Page and visual titles", pbi.title, sizes.title),
    row("header", "Headers", pbi.title, sizes.title),
    row("label", "Labels, axes and tables", pbi.body, sizes.body),
    row("callout", "Card values (big KPI numbers)", pbi.title, sizes.callout),
  ];
  const usesWindowsFont = fontRows.some((r) => /^(Segoe|DIN)/.test(r.font));

  const report = analyzeTheme(theme);
  return {
    name: theme.name,
    groups,
    fonts: fontRows,
    fontNote: usesWindowsFont
      ? "Segoe and DIN ship with Windows and Power BI. On other devices a viewer sees the next font in the stack."
      : null,
    findings: report.findings,
    notes: report.notes,
    simulations: report.simulations,
  };
}

// ---- Dashboard annotations ----------------------------------------------------------------------

/** Preview keys that name one color per data point (cat-3) share a note, so the legend isn't 20 lines long. */
export function noteFamily(key: string): string {
  return key.replace(/^(cat|sequential|diverging)-\d+$/, "$1");
}

export interface Note {
  family: string;
  label: string;
  /** Colors this note covers, as hex codes; empty for font notes. */
  hexes: string[];
  /** Font and size, or other words, shown beside the hex codes. */
  detail: string;
}

// Fixed order so numbers stay put as the preview changes: backgrounds, then data, then text.
const NOTE_ORDER = [
  "bg-canvas", "bg-page", "bg-container", "cat", "sequential", "diverging", "status-good", "status-neutral", "status-bad",
  "gridline-color", "zeroline-color", "border-color", "font-title", "size-title", "font-body", "size-body", "size-callout",
  "text-primary", "text-secondary", "text-muted",
];

/** Describes one note, given every preview key in its family that the page actually used. */
function describe(theme: Theme, family: string, keys: string[]): Omit<Note, "family"> | null {
  const { palette, status, text, background, gridline, zeroline, visualBorder, fonts, sizes } = theme;
  const indices = [...new Set(keys.map((k) => Number(k.split("-").pop())))].sort((a, b) => a - b);
  const picked = (list: string[]) => indices.map((i) => list[i]).filter((c): c is string => c !== undefined);
  const color = (label: string, hex: string, detail = ""): Omit<Note, "family"> => ({ label, hexes: [hex], detail });
  const font = (label: string, name: string, size: number): Omit<Note, "family"> => ({ label, hexes: [], detail: `${name}, ${size} pt` });
  switch (family) {
    case "bg-canvas": return color("Canvas background", background.canvas);
    case "bg-page": return color("Page background", background.page);
    case "bg-container": return color("Chart area background", background.container);
    case "cat": return { label: "Data colors", hexes: picked(palette.categorical), detail: "" };
    case "sequential": return { label: "Sequential colors", hexes: picked(palette.sequential), detail: "" };
    case "diverging": return { label: "Diverging colors", hexes: picked(palette.diverging), detail: "" };
    case "status-good": return color("Good color", status.good);
    case "status-neutral": return color("Neutral color", status.neutral);
    case "status-bad": return color("Bad color", status.bad);
    case "gridline-color": return color("Gridlines", gridline.color, `${gridline.style}, ${gridline.width} px`);
    case "zeroline-color": return color("Zero line", zeroline.color, `${zeroline.style}, ${zeroline.width} px`);
    case "border-color": return color("Visual border", visualBorder.color);
    case "font-title": return font("Title font", fonts.powerBi.title, sizes.title);
    case "size-title": return font("Title size", fonts.powerBi.title, sizes.title);
    case "font-body": return font("Body font", fonts.powerBi.body, sizes.body);
    case "size-body": return font("Body size", fonts.powerBi.body, sizes.body);
    case "size-callout": return font("Card value", fonts.powerBi.title, sizes.callout);
    case "text-primary": return color("Primary text", text.primary);
    case "text-secondary": return color("Secondary text", text.secondary);
    case "text-muted": return color("Muted text", text.muted);
    default: return null;
  }
}

/** Turns the preview keys a page used into numbered legend entries, in a stable order. Unknown keys are dropped. */
export function buildNotes(theme: Theme, usedKeys: Iterable<string>): Note[] {
  const byFamily = new Map<string, string[]>();
  for (const key of usedKeys) {
    const family = noteFamily(key);
    byFamily.set(family, [...(byFamily.get(family) ?? []), key]);
  }
  const rank = (family: string) => {
    const i = NOTE_ORDER.indexOf(family);
    return i === -1 ? NOTE_ORDER.length : i;
  };
  return [...byFamily]
    .sort(([a], [b]) => rank(a) - rank(b))
    .flatMap(([family, keys]) => {
      const note = describe(theme, family, keys);
      return note ? [{ family, ...note }] : [];
    });
}
