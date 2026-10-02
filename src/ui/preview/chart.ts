import type { Line } from "../../model/theme";
import { layoutBars, scaleX, scaleY, type Plot } from "../../preview/geometry";
import { lineAttrs, type FontStyle } from "../../preview/style";
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
