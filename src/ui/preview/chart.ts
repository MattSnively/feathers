import type { Line } from "../../model/theme";
import { layoutBars, scaleY, type Plot } from "../../preview/geometry";
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
  /** Axis ticks, bottom to top; the first and last define the value domain. */
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

const MARGIN = { left: 34, right: 8, top: 8, bottom: 22 };

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
function ruled(plot: Plot, yPx: number, line: Line) {
  const x = { x1: plot.left, x2: plot.left + plot.width, y1: yPx, y2: yPx };
  return [
    s("line", { ...x, ...lineAttrs(line), "pointer-events": "none" }),
    s("line", { ...x, stroke: "transparent", "stroke-width": 12, "pointer-events": "stroke" }),
  ];
}

function rules(o: ChartBase, plot: Plot, y: (v: number) => number) {
  const hasZero = o.zeroline !== null && o.ticks[0]! <= 0 && o.ticks[o.ticks.length - 1]! >= 0;
  const gridTicks = o.ticks.filter((t) => !(hasZero && t === 0));
  const grid = o.gridline.visible
    ? o.edit(s("g", {}, ...gridTicks.flatMap((t) => ruled(plot, y(t), o.gridline))), "gridline-color", "gridlines")
    : null;
  const zero =
    hasZero && o.zeroline!.visible
      ? o.edit(s("g", {}, ...ruled(plot, y(0), o.zeroline!)), "zeroline-color", "zero line")
      : null;
  return { grid, zero };
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

const frame = (o: ChartBase, ...kids: (Node | null)[]) =>
  s("svg", { viewBox: `0 0 ${o.width} ${o.height}`, width: "100%", role: "group", "aria-label": o.ariaLabel, class: "pv-chart" }, ...kids);

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

export interface LineChart extends ChartBase {
  values: number[];
  /** Palette index of the mark color. */
  colorIndex: number;
}

export function lineChart(o: LineChart): SVGSVGElement {
  const plot = plotOf(o.width, o.height);
  const y = scaleY(plot, o.ticks);
  const band = plot.width / o.categories.length;
  const x = (i: number) => plot.left + band * (i + 0.5);
  const { grid, zero } = rules(o, plot, y);
  const color = o.palette[o.colorIndex]!;
  const points = o.values.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const mark = o.edit(
    s("g", {},
      s("polyline", { points, fill: "none", stroke: color, "stroke-width": 2.5, "stroke-linejoin": "round" }),
      ...o.values.map((v, i) => s("circle", { cx: x(i), cy: y(v), r: 3.5, fill: color }))),
    `cat-${o.colorIndex}`,
    `color ${o.colorIndex + 1}`,
  );
  return frame(o, grid, mark, zero, axisLabels(o, plot, y, x));
}
