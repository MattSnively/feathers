import type { Theme } from "../../model/theme";
import { calloutPx, fontStyle, px, type FontStyle } from "../../preview/style";
import { h, s } from "../dom";
import { columnChart, type Edit } from "./chart";

export const css = (f: FontStyle, sizePx: number, color: string) =>
  `font-family:${f.family};font-weight:${f.weight};font-size:${sizePx}px;color:${color}`;

const KPIS = [
  { label: "Revenue", value: "$4.2M", delta: "▲ 4.2%", up: true },
  { label: "Orders", value: "18.4K", delta: "▼ 1.8%", up: false },
  { label: "Margin", value: "31%", delta: "▲ 0.6%", up: true },
];
const SERIES = ["North", "South", "West"];
const SERIES_VALUES = [
  [62, 70, 55, 82],
  [48, 52, 66, 58],
  [30, 41, 38, 49],
];
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

  const legend = h("div", { class: "pv-legend" }, ...SERIES.map((name, i) => {
    const idx = i % n;
    return h("span", { class: "pv-legend-item", style: css(body, bodyPx * 0.9, text.secondary) },
      edit(h("span", { class: "pv-swatch", style: `background:${palette.categorical[idx]}` }), `cat-${idx}`, `color ${idx + 1}`), name);
  }));

  const chart = columnChart({
    width: 320, height: 170, ticks: [0, 25, 50, 75, 100], categories: ["Q1", "Q2", "Q3", "Q4"],
    values: SERIES_VALUES, colorOf: (series) => series % n,
    gridline, zeroline: null, palette: palette.categorical, edit,
    text: { ...body, size: bodyPx * 0.85, color: text.secondary },
    ariaLabel: "Sample column chart",
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
        card(visualTitle("Sales by quarter"), chart, legend),
        card(visualTitle("Share by category"), share, h("div", { class: "pv-spacer" }), visualTitle("Top regions"), table))),
    "bg-page", "page background");

  return edit(h("div", { class: "pv-canvas", style: `background:${background.canvas}` }, page), "bg-canvas", "canvas background");
}
