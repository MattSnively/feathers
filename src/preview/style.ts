import type { Line } from "../model/theme";
import { mix } from "../a11y/color";

export interface FontStyle {
  /** CSS font-family stack. */
  family: string;
  weight: number;
}

const SERIF = new Set(["Georgia", "Cambria", "Constantia", "Times New Roman"]);
const MONO = new Set(["Consolas", "Courier New"]);

const quote = (name: string) => `"${name}"`;

/**
 * Maps a tool's font name to something a browser can draw. Names like "Segoe UI Semibold" or
 * "Segoe (Bold)" are weight variants of one family, so we pull the weight out and keep the base
 * family as a fallback; fonts the viewer doesn't have then degrade to a sensible stand-in.
 */
export function fontStyle(name: string): FontStyle {
  let weight = 400;
  if (/semibold/i.test(name)) weight = 600;
  else if (/\(bold\)|\bbold\b/i.test(name)) weight = 700;
  else if (/medium/i.test(name)) weight = 500;
  else if (/\blight\b/i.test(name)) weight = 300;
  else if (/black/i.test(name)) weight = 900;

  const base = name
    .replace(/\s*\(bold\)/i, "")
    .replace(/\s+(Light|Semibold|Medium|Bold|Black|Regular|Book)$/i, "")
    .trim();

  const generic = SERIF.has(base) ? "serif" : MONO.has(base) ? "monospace" : "sans-serif";
  // Tableau's and Segoe's own families usually aren't installed everywhere; Segoe UI is the closest common stand-in.
  const standIn = base === "Tableau" || base === "Segoe" ? ["Segoe UI"] : [];
  const stack = [...new Set([name, base, ...standIn])].map(quote);
  return { family: [...stack, generic].join(", "), weight };
}

/** Points to CSS pixels. */
export const px = (pt: number): number => (pt * 4) / 3;

/** Large Power BI card values are shrunk so they fit a small preview card. */
export const calloutPx = (pt: number): number => Math.min(px(pt), 32);

export interface LineAttrs {
  stroke: string;
  "stroke-width": number;
  "stroke-dasharray"?: string;
  "stroke-linecap": "butt" | "round";
}

export function lineAttrs(line: Line): LineAttrs {
  const w = line.width;
  const base = { stroke: line.color, "stroke-width": w };
  if (line.style === "dashed") return { ...base, "stroke-dasharray": `${w * 4} ${w * 3}`, "stroke-linecap": "butt" };
  // A near-zero dash with round caps draws dots.
  if (line.style === "dotted") return { ...base, "stroke-dasharray": `0.1 ${w * 2.5}`, "stroke-linecap": "round" };
  return { ...base, "stroke-linecap": "butt" };
}

/** Color at position `t` (0-1) along an evenly spaced ramp of two or more stops. */
export function rampColor(stops: string[], t: number): string {
  const clamped = Math.min(Math.max(t, 0), 1);
  const span = (stops.length - 1) * clamped;
  const i = Math.min(Math.floor(span), stops.length - 2);
  return mix(stops[i]!, stops[i + 1]!, span - i);
}

/** Inline CSS for text in a theme font. */
export const css = (f: FontStyle, sizePx: number, color: string) =>
  `font-family:${f.family};font-weight:${f.weight};font-size:${sizePx}px;color:${color}`;
