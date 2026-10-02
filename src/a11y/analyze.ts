import type { Theme } from "../model/theme";
import { colorDifference, contrastRatio } from "./color";
import { simulate, VISIONS, VISION_LABEL, type Vision } from "./cvd";

/**
 * Heuristic cutoffs, not standards. CIEDE2000 ~2 is a just-noticeable difference; chart categories
 * need to be told apart at a glance, so we ask for 10. Contrast limits are WCAG 2.x: 4.5:1 for text,
 * 3:1 for graphical objects (success criterion 1.4.11).
 */
export const MIN_DISTINCT = 10;
export const MIN_TEXT_CONTRAST = 4.5;
export const MIN_GRAPHIC_CONTRAST = 3;

export interface Finding {
  id: string;
  title: string;
  detail: string;
  /** Colors involved, so the UI can show them next to the message. */
  colors: string[];
}

export interface Simulation {
  vision: Vision;
  categorical: string[];
}

export interface A11yReport {
  findings: Finding[];
  simulations: Simulation[];
}

interface ColorGroup {
  label: string;
  colors: string[];
  name: (i: number) => string;
}

const MAX_PAIRS_LISTED = 4;

function similarPairs(group: ColorGroup, vision: Vision | "normal"): { a: number; b: number; delta: number }[] {
  const view = (c: string) => (vision === "normal" ? c : simulate(c, vision));
  const seen = group.colors.map(view);
  const pairs: { a: number; b: number; delta: number }[] = [];
  for (let a = 0; a < seen.length; a++) {
    for (let b = a + 1; b < seen.length; b++) {
      const delta = colorDifference(seen[a]!, seen[b]!);
      if (delta < MIN_DISTINCT) pairs.push({ a, b, delta });
    }
  }
  return pairs.sort((x, y) => x.delta - y.delta);
}

const pairKey = (p: { a: number; b: number }) => `${p.a}-${p.b}`;

function distinguishability(group: ColorGroup): Finding[] {
  const findings: Finding[] = [];
  const normal = similarPairs(group, "normal");
  const alreadyFlagged = new Set(normal.map(pairKey));

  const report = (vision: Vision | "normal", pairs: ReturnType<typeof similarPairs>) => {
    if (pairs.length === 0) return;
    const shown = pairs.slice(0, MAX_PAIRS_LISTED).map(
      (p) => `${group.name(p.a)} and ${group.name(p.b)} (difference ${p.delta.toFixed(1)})`,
    );
    const more = pairs.length > shown.length ? `, and ${pairs.length - shown.length} more pair${pairs.length - shown.length === 1 ? "" : "s"}` : "";
    const involved = [...new Set(pairs.slice(0, MAX_PAIRS_LISTED).flatMap((p) => [p.a, p.b]))];
    findings.push({
      id: `similar-${group.label}-${vision}`,
      title: `${group.label} that look alike with ${VISION_LABEL[vision]}`,
      detail: `${shown.join("; ")}${more}. A difference of ${MIN_DISTINCT} or more tells colors apart at a glance.`,
      colors: involved.map((i) => group.colors[i]!),
    });
  };

  report("normal", normal);
  // For color-vision deficiencies, only report pairs that are fine for typical vision, so one
  // genuinely near-identical pair isn't repeated under every vision type.
  for (const vision of VISIONS) {
    report(vision, similarPairs(group, vision).filter((p) => !alreadyFlagged.has(pairKey(p))));
  }
  return findings;
}

function contrastFindings(theme: Theme): Finding[] {
  const findings: Finding[] = [];
  const { text, background, palette } = theme;

  const textRoles: [keyof Theme["text"], string][] = [
    ["primary", "Primary text"],
    ["secondary", "Secondary text"],
    ["muted", "Muted text"],
  ];
  for (const [role, label] of textRoles) {
    const surfaces = [background.container, background.page];
    const worst = Math.min(...surfaces.map((s) => contrastRatio(text[role], s)));
    if (worst < MIN_TEXT_CONTRAST) {
      findings.push({
        id: `text-contrast-${role}`,
        title: `${label} is hard to read`,
        detail: `Contrast against the chart or page background is ${worst.toFixed(1)}:1. Text needs at least ${MIN_TEXT_CONTRAST}:1 (WCAG AA).`,
        colors: [text[role], background.container],
      });
    }
  }

  const faint = palette.categorical
    .map((c, i) => ({ c, i, ratio: contrastRatio(c, background.container) }))
    .filter((x) => x.ratio < MIN_GRAPHIC_CONTRAST);
  if (faint.length > 0) {
    const listed = faint.slice(0, MAX_PAIRS_LISTED).map((x) => `color ${x.i + 1} (${x.ratio.toFixed(1)}:1)`);
    const more = faint.length > listed.length ? `, and ${faint.length - listed.length} more` : "";
    findings.push({
      id: "graphic-contrast",
      title: "Data colors that are faint on the chart background",
      detail: `${listed.join(", ")}${more}. Chart marks need at least ${MIN_GRAPHIC_CONTRAST}:1 against the background (WCAG 1.4.11). Fine for large fills, risky for thin lines and small points.`,
      colors: [...faint.slice(0, MAX_PAIRS_LISTED).map((x) => x.c), background.container],
    });
  }
  return findings;
}

export function analyzeTheme(theme: Theme): A11yReport {
  const { palette, status } = theme;
  const groups: ColorGroup[] = [
    { label: "Data colors", colors: palette.categorical, name: (i) => `color ${i + 1}` },
    { label: "Status colors", colors: [status.good, status.neutral, status.bad], name: (i) => ["good", "neutral", "bad"][i]! },
    { label: "Diverging ends", colors: [palette.diverging[0], palette.diverging[2]], name: (i) => (i === 0 ? "low end" : "high end") },
  ];

  return {
    findings: [...groups.flatMap(distinguishability), ...contrastFindings(theme)],
    simulations: VISIONS.map((vision) => ({ vision, categorical: palette.categorical.map((c) => simulate(c, vision)) })),
  };
}
