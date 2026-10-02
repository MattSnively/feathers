import type { Line } from "../../model/theme";
import { donutAngles, layoutBars, layoutStacked, ringPath, scaleX, scaleY, stackValues, type Plot } from "../../preview/geometry";
import { lineAttrs, rampColor, type FontStyle } from "../../preview/style";
import { s } from "../dom";

/** Marks an element as click-to-edit: clicking it (or pressing Enter/Space) jumps to control `key`. */
export type Edit = <T extends Element>(el: T, key: string, label: string) => T;

export interface TextStyle extends FontStyle {
  size: number;
  color: string;
}

export interface ChartBase {
  width: number;
  height: number;
  /** Value-axis ticks, bottom to top; the first and last define the value domain. */
  ticks: number[];
  categories: string[];
  gridline: Line;
  /** Null when the tool has no separate zero line (Power BI draws every tick as a gridline). */
  zeroline: Line | null;
  text: TextStyle;
  palette: string[];
  edit: Edit;
  ariaLabel: string;
}

const MARGIN = { left: 34, right: 10, top: 8, bottom: 22 };

const plotOf = (w: number, h: number): Plot => ({
  left: MARGIN.left,
  top: MARGIN.top,
  width: w - MARGIN.left - MARGIN.right,
  height: h - MARGIN.top - MARGIN.bottom,
});

const textAttrs = (t: TextStyle) => ({
  "font-family": t.family,
  "font-weight": t.weight,
  "font-size": t.size,
  fill: t.color,
});

/** A visible line plus a wide transparent twin, so a 1px gridline is still easy to click. */
function hRule(plot: Plot, yPx: number, line: Line) {
  const x = { x1: plot.left, x2: plot.left + plot.width, y1: yPx, y2: yPx };
  return [
    s("line", { ...x, ...lineAttrs(line), "pointer-events": "none" }),
    s("line", { ...x, stroke: "transparent", "stroke-width": 12, "pointer-events": "stroke" }),
  ];
}

function vRule(plot: Plot, xPx: number, line: Line) {
  const x = { x1: xPx, x2: xPx, y1: plot.top, y2: plot.top + plot.height };
  return [
    s("line", { ...x, ...lineAttrs(line), "pointer-events": "none" }),
    s("line", { ...x, stroke: "transparent", "stroke-width": 12, "pointer-events": "stroke" }),
  ];
}

interface RuleOpts {
  ticks: number[];
  gridline: Line;
  zeroline: Line | null;
  edit: Edit;
}

const spansZero = (ticks: number[]) => ticks[0]! <= 0 && ticks[ticks.length - 1]! >= 0;

/** Gridlines and zero lines for the value axis, plus the category axis when `xs` is given (scatter). */
function rules(o: RuleOpts, plot: Plot, y: (v: number) => number, xs?: { ticks: number[]; scale: (v: number) => number }) {
  const yZero = o.zeroline !== null && spansZero(o.ticks);
  const xZero = o.zeroline !== null && xs !== undefined && spansZero(xs.ticks);

  const gridParts = [
    ...o.ticks.filter((t) => !(yZero && t === 0)).flatMap((t) => hRule(plot, y(t), o.gridline)),
    ...(xs ? xs.ticks.filter((t) => !(xZero && t === 0)).flatMap((t) => vRule(plot, xs.scale(t), o.gridline)) : []),
  ];
  const zeroParts = [
    ...(yZero ? hRule(plot, y(0), o.zeroline!) : []),
    ...(xZero && xs ? vRule(plot, xs.scale(0), o.zeroline!) : []),
  ];

  return {
    grid: o.gridline.visible && gridParts.length > 0 ? o.edit(s("g", {}, ...gridParts), "gridline-color", "gridlines") : null,
    zero: o.zeroline?.visible && zeroParts.length > 0 ? o.edit(s("g", {}, ...zeroParts), "zeroline-color", "zero line") : null,
  };
}

function axisLabels(o: ChartBase, plot: Plot, y: (v: number) => number, categoryX: (i: number) => number) {
  const a = textAttrs(o.text);
  return o.edit(
    s("g", {},
      ...o.ticks.map((t) => s("text", { ...a, x: plot.left - 6, y: y(t) + o.text.size / 3, "text-anchor": "end" }, String(t))),
      ...o.categories.map((c, i) => s("text", { ...a, x: categoryX(i), y: plot.top + plot.height + o.text.size + 4, "text-anchor": "middle" }, c))),
    "font-body",
    "body font",
  );
}

const frame = (o: Pick<ChartBase, "width" | "height" | "ariaLabel">, ...kids: (Node | null)[]) =>
  s("svg", { viewBox: `0 0 ${o.width} ${o.height}`, width: "100%", role: "group", "aria-label": o.ariaLabel, class: "pv-chart" }, ...kids);

// ---- Column chart -----------------------------------------------------------------------------

export interface ColumnChart extends ChartBase {
  /** series x categories */
  values: number[][];
  /** Palette index used for a bar, so a click can jump to that exact color. */
  colorOf: (series: number, category: number) => number;
}

export function columnChart(o: ColumnChart): SVGSVGElement {
  const plot = plotOf(o.width, o.height);
  const y = scaleY(plot, o.ticks);
  const band = plot.width / o.categories.length;
  const { grid, zero } = rules(o, plot, y);
  const bars = layoutBars(plot, o.ticks, o.values).map((b) => {
    const idx = o.colorOf(b.series, b.category);
    const rect = s("rect", { x: b.x, y: b.y, width: b.width, height: Math.max(b.height, 0.5), fill: o.palette[idx]! });
    return o.edit(rect, `cat-${idx}`, `color ${idx + 1}`);
  });
  return frame(o, grid, ...bars, zero, axisLabels(o, plot, y, (i) => plot.left + band * (i + 0.5)));
}

// ---- Line chart -------------------------------------------------------------------------------

export interface LineChart extends ChartBase {
  /** One entry per line; `colorIndex` is its palette index. */
  series: { values: number[]; colorIndex: number }[];
}

export function lineChart(o: LineChart): SVGSVGElement {
  const plot = plotOf(o.width, o.height);
  const y = scaleY(plot, o.ticks);
  const band = plot.width / o.categories.length;
  const x = (i: number) => plot.left + band * (i + 0.5);
  const { grid, zero } = rules(o, plot, y);
  const lines = o.series.map(({ values, colorIndex }) => {
    const color = o.palette[colorIndex]!;
    const points = values.map((v, i) => `${x(i)},${y(v)}`).join(" ");
    return o.edit(
      s("g", {},
        // Wide invisible twin so a thin line is easy to click and wins over a gridline passing under it.
        s("polyline", { points, fill: "none", stroke: "transparent", "stroke-width": 14, "stroke-linejoin": "round", "pointer-events": "stroke" }),
        s("polyline", { points, fill: "none", stroke: color, "stroke-width": 2.5, "stroke-linejoin": "round", "stroke-linecap": "round", "pointer-events": "none" }),
        ...values.map((v, i) => s("circle", { cx: x(i), cy: y(v), r: 3.5, fill: color }))),
      `cat-${colorIndex}`,
      `color ${colorIndex + 1}`,
    );
  });
  return frame(o, grid, ...lines, zero, axisLabels(o, plot, y, x));
}

// ---- Scatter plot -----------------------------------------------------------------------------

export interface ScatterChart extends Omit<ChartBase, "categories"> {
  xTicks: number[];
  points: { x: number; y: number; group: number }[];
  /** Palette index for a group of points. */
  colorOf: (group: number) => number;
}

export function scatterChart(o: ScatterChart): SVGSVGElement {
  const plot = plotOf(o.width, o.height);
  const y = scaleY(plot, o.ticks);
  const x = scaleX(plot, o.xTicks);
  const { grid, zero } = rules(o, plot, y, { ticks: o.xTicks, scale: x });
  const a = textAttrs(o.text);

  const dots = o.points.map((p) => {
    const idx = o.colorOf(p.group);
    const dot = s("circle", { cx: x(p.x), cy: y(p.y), r: 5, fill: o.palette[idx]!, "fill-opacity": 0.9, stroke: "#fff", "stroke-width": 1 });
    return o.edit(dot, `cat-${idx}`, `color ${idx + 1}`);
  });
  const labels = o.edit(
    s("g", {},
      ...o.ticks.map((t) => s("text", { ...a, x: plot.left - 6, y: y(t) + o.text.size / 3, "text-anchor": "end" }, String(t))),
      ...o.xTicks.map((t) => s("text", { ...a, x: x(t), y: plot.top + plot.height + o.text.size + 4, "text-anchor": "middle" }, String(t)))),
    "font-body",
    "body font",
  );
  return frame(o, grid, zero, ...dots, labels);
}

// ---- Stacked column ---------------------------------------------------------------------------

export function stackedColumnChart(o: ColumnChart): SVGSVGElement {
  const plot = plotOf(o.width, o.height);
  const y = scaleY(plot, o.ticks);
  const band = plot.width / o.categories.length;
  const { grid, zero } = rules(o, plot, y);
  const bars = layoutStacked(plot, o.ticks, o.values).map((b) => {
    const idx = o.colorOf(b.series, b.category);
    return o.edit(s("rect", { x: b.x, y: b.y, width: b.width, height: Math.max(b.height - 1, 0.5), fill: o.palette[idx]! }), `cat-${idx}`, `color ${idx + 1}`);
  });
  return frame(o, grid, ...bars, zero, axisLabels(o, plot, y, (i) => plot.left + band * (i + 0.5)));
}

// ---- Stacked area -----------------------------------------------------------------------------

export function areaChart(o: LineChart): SVGSVGElement {
  const plot = plotOf(o.width, o.height);
  const y = scaleY(plot, o.ticks);
  const step = plot.width / (o.categories.length - 1);
  const x = (i: number) => plot.left + step * i;
  const { grid, zero } = rules(o, plot, y);
  const stacked = stackValues(o.series.map((s) => s.values));
  const bands = o.series.map(({ colorIndex }, series) => {
    const cells = stacked.filter((c) => c.series === series);
    const top = cells.map((c) => `${x(c.category)},${y(c.to)}`);
    const bottom = cells.map((c) => `${x(c.category)},${y(c.from)}`).reverse();
    return o.edit(s("polygon", { points: [...top, ...bottom].join(" "), fill: o.palette[colorIndex]!, "fill-opacity": 0.9 }), `cat-${colorIndex}`, `color ${colorIndex + 1}`);
  });
  // Axis labels sit under the points, not under category bands.
  return frame(o, grid, ...bands.reverse(), zero, axisLabels(o, plot, y, x));
}

// ---- Donut ------------------------------------------------------------------------------------

export interface DonutChart {
  size: number;
  weights: number[];
  palette: string[];
  colorOf: (segment: number) => number;
  edit: Edit;
  ariaLabel: string;
  /** Text in the hole, e.g. a total. */
  center?: { label: string; text: TextStyle };
}

export function donutChart(o: DonutChart): SVGSVGElement {
  const c = o.size / 2;
  const segments = donutAngles(o.weights).map(({ start, end }, i) => {
    const idx = o.colorOf(i);
    // A hairline gap in the surface color separates neighbours without needing a stroke color from the theme.
    const path = s("path", { d: ringPath(c, c, c - 2, c * 0.58, start, end), fill: o.palette[idx]!, stroke: "#fff", "stroke-width": 1.5 });
    return o.edit(path, `cat-${idx}`, `color ${idx + 1}`);
  });
  const label = o.center
    ? s("text", { "font-family": o.center.text.family, "font-weight": o.center.text.weight, "font-size": o.center.text.size, fill: o.center.text.color, x: c, y: c + o.center.text.size / 3, "text-anchor": "middle", "pointer-events": "none" }, o.center.label)
    : null;
  return s("svg", { viewBox: `0 0 ${o.size} ${o.size}`, width: "100%", role: "group", "aria-label": o.ariaLabel, class: "pv-chart pv-donut" }, ...segments, label);
}

// ---- Diverging variance bars ------------------------------------------------------------------

export interface VarianceChart {
  width: number;
  height: number;
  categories: string[];
  /** Signed values; bars grow left (negative) or right (positive) from a center rule. */
  values: number[];
  /** Low, center, high ramp stops. */
  ramp: string[];
  text: TextStyle;
  /** The center rule and the control it belongs to: the zero line in Tableau, a gridline in Power BI. */
  rule: Line;
  ruleKey: string;
  ruleLabel: string;
  edit: Edit;
  ariaLabel: string;
}

export function varianceChart(o: VarianceChart): SVGSVGElement {
  const left = 78;
  const right = 10;
  const rowH = o.height / o.categories.length;
  const max = Math.max(...o.values.map(Math.abs));
  const mid = left + (o.width - left - right) / 2;
  const half = (o.width - left - right) / 2;
  const a = textAttrs(o.text);
  const bars = o.values.map((v, i) => {
    const w = (Math.abs(v) / max) * half;
    // Color follows magnitude along the ramp; clicking edits the nearer end.
    const color = rampColor(o.ramp, 0.5 + (v / max) * 0.5);
    const key = v < 0 ? "diverging-0" : "diverging-2";
    return o.edit(s("rect", { x: v < 0 ? mid - w : mid, y: i * rowH + rowH * 0.18, width: Math.max(w, 0.5), height: rowH * 0.64, fill: color }), key, v < 0 ? "low-end color" : "high-end color");
  });
  const labels = o.edit(
    s("g", {}, ...o.categories.map((c, i) => s("text", { ...a, x: left - 8, y: i * rowH + rowH / 2 + o.text.size / 3, "text-anchor": "end" }, c))),
    "font-body", "body font");
  const rule = o.rule.visible
    ? o.edit(s("g", {}, s("line", { x1: mid, x2: mid, y1: 0, y2: o.height, ...lineAttrs(o.rule), "pointer-events": "none" }), s("line", { x1: mid, x2: mid, y1: 0, y2: o.height, stroke: "transparent", "stroke-width": 12 })), o.ruleKey, o.ruleLabel)
    : null;
  return s("svg", { viewBox: `0 0 ${o.width} ${o.height}`, width: "100%", role: "group", "aria-label": o.ariaLabel, class: "pv-chart" }, ...bars, rule, labels);
}
