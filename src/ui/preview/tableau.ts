import type { Theme } from "../../model/theme";
import { fontStyle, px } from "../../preview/style";
import { h } from "../dom";
import { columnChart, lineChart, scatterChart, type Edit } from "./chart";
import { css } from "./powerbi";

const KPIS = [
  { label: "Sales", value: "$2.3M", delta: "▲ 12.4%" },
  { label: "Profit", value: "$286K", delta: "▲ 8.1%" },
  { label: "Orders", value: "5,009", delta: "▼ 2.3%" },
  { label: "Profit ratio", value: "12.5%", delta: "▲ 0.9%" },
];
const CATEGORIES = ["Furniture", "Office", "Tech", "Bags", "Phones"];
// Mixed positive and negative so the zero line has something to separate.
const PROFIT = [42, -18, 65, 12, -27];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
const TREND = [20, 34, 28, 46, 52, 61];
// Sales ($K) vs. profit ($K), three accounts per category.
const SCATTER = [
  [[40, 20], [90, 44], [150, 60]],
  [[30, -12], [75, -24], [120, 8]],
  [[60, 52], [110, 70], [170, 36]],
  [[25, 8], [65, 14], [105, -6]],
  [[50, -30], [95, -18], [140, -4]],
].flatMap((group, g) => group.map(([x, y]) => ({ x: x!, y: y!, group: g })));
const TABLE = [
  ["Account 1048", "Corporate", "$25,043", "$3,422"],
  ["Account 2210", "Consumer", "$19,812", "$2,019"],
  ["Account 0937", "Home Office", "$17,305", "-$845"],
  ["Account 3382", "Corporate", "$14,660", "$1,874"],
  ["Account 1576", "Consumer", "$12,228", "-$1,310"],
];

export function tableauPreview(theme: Theme, edit: Edit): HTMLElement {
  const { palette, text, background, gridline, zeroline, sizes } = theme;
  const body = fontStyle(theme.fonts.tableau.body);
  const title = fontStyle(theme.fonts.tableau.title);
  const n = palette.categorical.length;
  const bodyPx = px(sizes.body);
  const titlePx = px(sizes.title);
  const axis = { ...body, size: bodyPx * 0.85, color: text.secondary };
  const common = { gridline, zeroline, palette: palette.categorical, edit, text: axis };

  // Tableau's `view` background is the area behind the marks.
  const view = (...kids: (Node | null)[]) =>
    edit(h("div", { class: "pv-card", style: `background:${background.container}` }, ...kids), "bg-container", "chart area background");

  const sheetTitle = (label: string) =>
    edit(h("div", { class: "pv-vtitle", style: css(title, titlePx, text.primary) }, label), "font-title", "title font");

  const kpi = (k: (typeof KPIS)[number]) =>
    view(
      edit(h("div", { style: css(body, bodyPx * 0.9, text.secondary) }, k.label), "font-body", "body font"),
      edit(h("div", { class: "pv-kpi", style: css(title, titlePx * 1.8, text.primary) }, k.value), "font-title", "title font"),
      // Tableau's theme has no status colors, so the delta stays neutral; the arrow carries direction.
      edit(h("div", { style: css(body, bodyPx * 0.9, text.secondary) }, k.delta), "font-body", "body font"),
    );

  const bars = columnChart({
    ...common, width: 300, height: 190, ticks: [-40, 0, 40, 80], categories: CATEGORIES, values: [PROFIT],
    colorOf: (_series, category) => category % n, ariaLabel: "Sample bar chart colored by category",
  });

  const legend = h("div", { class: "pv-legend" }, ...CATEGORIES.map((name, i) => {
    const idx = i % n;
    return h("span", { class: "pv-legend-item", style: css(body, bodyPx * 0.9, text.secondary) },
      edit(h("span", { class: "pv-swatch", style: `background:${palette.categorical[idx]}` }), `cat-${idx}`, `color ${idx + 1}`), name);
  }));

  const line = lineChart({
    ...common, width: 300, height: 190, ticks: [0, 20, 40, 60], categories: MONTHS,
    series: [{ values: TREND, colorIndex: 0 }], ariaLabel: "Sample line chart in the theme mark color",
  });

  const scatter = scatterChart({
    ...common, width: 300, height: 190, ticks: [-40, 0, 40, 80], xTicks: [0, 50, 100, 150, 200],
    points: SCATTER, colorOf: (g) => g % n, ariaLabel: "Sample scatter plot colored by category",
  });

  const tooltip = edit(
    h("div", { class: "pv-tooltip", style: css(body, bodyPx, text.primary) }, h("strong", {}, "Tech"), h("div", {}, "Profit: $65K")),
    "font-body", "tooltip font");

  const grid = `border-bottom:1px solid ${gridline.color}`;
  const table = h("table", { class: "pv-table" },
    h("thead", {}, h("tr", {}, ...["Account", "Segment", "Sales", "Profit"].map((c) =>
      edit(h("th", { style: `${css({ ...body, weight: 700 }, bodyPx, text.primary)};${grid}` }, c), "font-body", "header font")))),
    h("tbody", {}, ...TABLE.map((row) => h("tr", {}, ...row.map((c) =>
      edit(h("td", { style: `${css(body, bodyPx, text.secondary)};${grid}` }, c), "font-body", "body font"))))));

  return h("div", { class: "pv-tab" },
    // The dashboard frame isn't part of Tableau's theme, so it stays neutral here.
    edit(h("h4", { class: "pv-title", style: css({ ...title, weight: 700 }, titlePx + 2, text.primary) }, "Superstore profit"), "font-title", "title font"),
    h("div", { class: "pv-kpis" }, ...KPIS.map(kpi)),
    h("div", { class: "pv-row" },
      view(sheetTitle("Profit by category"), bars, legend),
      view(sheetTitle("Sales trend"), line),
      view(sheetTitle("Sales vs. profit"), scatter, h("div", { class: "pv-spacer" }), tooltip)),
    h("div", { class: "pv-row" },
      view(sheetTitle("Top accounts"), table)));
}
