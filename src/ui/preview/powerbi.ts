import type { Theme } from "../../model/theme";
import { calloutPx, fontStyle, px, type FontStyle } from "../../preview/style";
import { h, s } from "../dom";
import { columnChart, lineChart, scatterChart, type Edit } from "./chart";

export const css = (f: FontStyle, sizePx: number, color: string) =>
  `font-family:${f.family};font-weight:${f.weight};font-size:${sizePx}px;color:${color}`;

const KPIS = [
  { label: "Revenue", value: "$4.2M", delta: "▲ 4.2%", up: true },
  { label: "Orders", value: "18.4K", delta: "▼ 1.8%", up: false },
  { label: "Margin", value: "31%", delta: "▲ 0.6%", up: true },
  { label: "Customers", value: "2,840", delta: "▲ 9.3%", up: true },
];
const SERIES = ["North", "South", "West"];
const QUARTERS = [
  [62, 70, 55, 82],
  [48, 52, 66, 58],
  [30, 41, 38, 49],
];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
const MONTHLY = [
  [48, 55, 52, 66, 72, 80],
  [35, 40, 46, 44, 52, 58],
  [22, 28, 31, 38, 36, 45],
];
// Margin vs. volume by region: x = units (hundreds), y = margin %.
const POINTS = [
  [[12, 38], [20, 34], [28, 56], [36, 52], [44, 70], [52, 66]],
  [[16, 26], [24, 34], [32, 30], [40, 48], [48, 44], [58, 60]],
  [[10, 12], [22, 24], [30, 18], [42, 34], [54, 30], [64, 46]],
].flatMap((group, g) => group.map(([x, y]) => ({ x: x!, y: y!, group: g })));
// Relative widths for the stacked share bar; trimmed to the palette length.
const SHARE_WEIGHTS = [30, 22, 16, 12, 9, 6, 5, 4, 3, 2, 2, 1];
const TABLE = [
  ["Northeast", "$1.24M", "34%"],
  ["Southeast", "$0.98M", "29%"],
  ["Midwest", "$1.12M", "31%"],
  ["West", "$0.86M", "27%"],
];

export function powerBiPreview(theme: Theme, edit: Edit): HTMLElement {
  const { palette, status, text, background, gridline, sizes } = theme;
  const body = fontStyle(theme.fonts.powerBi.body);
  const title = fontStyle(theme.fonts.powerBi.title);
  const n = palette.categorical.length;
  const bodyPx = px(sizes.body);
  const titlePx = px(sizes.title);
  const axis = { ...body, size: bodyPx * 0.85, color: text.secondary };
  const common = { gridline, zeroline: null, palette: palette.categorical, edit, text: axis };

  const card = (...kids: (Node | null)[]) =>
    edit(h("div", { class: "pv-card", style: `background:${background.container}` }, ...kids), "bg-container", "chart area background");

  const visualTitle = (label: string) =>
    edit(h("div", { class: "pv-vtitle", style: css(title, titlePx * 0.85, text.primary) }, label), "font-title", "title font");

  const kpi = (k: (typeof KPIS)[number]) =>
    card(
      edit(h("div", { style: css(body, bodyPx * 0.9, text.muted) }, k.label), "text-muted", "muted text color"),
      edit(h("div", { class: "pv-kpi", style: css(title, calloutPx(sizes.callout), palette.categorical[0]!) }, k.value), "size-callout", "card value size"),
      // The arrow carries direction, so the delta isn't communicated by color alone.
      edit(h("div", { style: css(body, bodyPx * 0.9, k.up ? status.good : status.bad) }, k.delta), k.up ? "status-good" : "status-bad", k.up ? "good color" : "bad color"),
    );

  const legend = () => h("div", { class: "pv-legend" }, ...SERIES.map((name, i) => {
    const idx = i % n;
    return h("span", { class: "pv-legend-item", style: css(body, bodyPx * 0.9, text.secondary) },
      edit(h("span", { class: "pv-swatch", style: `background:${palette.categorical[idx]}` }), `cat-${idx}`, `color ${idx + 1}`), name);
  }));

  const columns = columnChart({
    ...common, width: 320, height: 170, ticks: [0, 25, 50, 75, 100], categories: ["Q1", "Q2", "Q3", "Q4"],
    values: QUARTERS, colorOf: (series) => series % n, ariaLabel: "Sample column chart",
  });

  const lines = lineChart({
    ...common, width: 320, height: 170, ticks: [0, 25, 50, 75, 100], categories: MONTHS,
    series: MONTHLY.map((values, i) => ({ values, colorIndex: i % n })), ariaLabel: "Sample line chart",
  });

  const scatter = scatterChart({
    ...common, width: 320, height: 190, ticks: [0, 25, 50, 75, 100], xTicks: [0, 20, 40, 60, 80],
    points: POINTS, colorOf: (g) => g % n, ariaLabel: "Sample scatter plot",
  });

  const shown = palette.categorical.slice(0, SHARE_WEIGHTS.length);
  const total = SHARE_WEIGHTS.slice(0, shown.length).reduce((a, b) => a + b, 0);
  let x = 0;
  const segments = shown.map((color, i) => {
    const w = (SHARE_WEIGHTS[i]! / total) * 320;
    const rect = edit(s("rect", { x, y: 0, width: Math.max(w - 1, 1), height: 30, fill: color }), `cat-${i}`, `color ${i + 1}`);
    x += w;
    return rect;
  });
  const share = s("svg", { viewBox: "0 0 320 30", width: "100%", role: "group", "aria-label": "Sample stacked share bar", class: "pv-chart" }, ...segments);

  const shareLegend = h("div", { class: "pv-legend" }, ...shown.map((color, i) =>
    h("span", { class: "pv-legend-item", style: css(body, bodyPx * 0.9, text.secondary) },
      edit(h("span", { class: "pv-swatch", style: `background:${color}` }), `cat-${i}`, `color ${i + 1}`), `Category ${String.fromCharCode(65 + i)}`)));

  const cell = (value: string, style: string, tag: "th" | "td") => h(tag, { style }, value);
  const grid = `border-bottom:1px solid ${gridline.color}`;
  const table = h("table", { class: "pv-table" },
    h("thead", {}, h("tr", {}, ...["Region", "Sales", "Margin"].map((c) =>
      edit(cell(c, `${css({ ...body, weight: 700 }, bodyPx, text.secondary)};${grid}`, "th"), "text-secondary", "secondary text color")))),
    h("tbody", {}, ...TABLE.map((row) => h("tr", {}, ...row.map((c) =>
      edit(cell(c, `${css(body, bodyPx, text.primary)};${grid}`, "td"), "font-body", "body font"))))));

  const page = edit(
    h("div", { class: "pv-page", style: `background:${background.page}` },
      edit(h("h4", { class: "pv-title", style: css(title, titlePx + 4, text.primary) }, "Regional performance"), "font-title", "title font"),
      h("div", { class: "pv-kpis" }, ...KPIS.map(kpi)),
      h("div", { class: "pv-row" },
        card(visualTitle("Sales by quarter"), columns, legend()),
        card(visualTitle("Monthly trend"), lines, legend()),
        card(visualTitle("Margin vs. volume"), scatter, legend())),
      h("div", { class: "pv-row split" },
        card(visualTitle("Share by category"), share, shareLegend),
        card(visualTitle("Top regions"), table))),
    "bg-page", "page background");

  return edit(h("div", { class: "pv-canvas", style: `background:${background.canvas}` }, page), "bg-canvas", "canvas background");
}
