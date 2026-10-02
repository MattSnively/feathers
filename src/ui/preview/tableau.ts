import type { Theme } from "../../model/theme";
import { fontStyle, px } from "../../preview/style";
import { h } from "../dom";
import { columnChart, lineChart, type Edit } from "./chart";
import { css } from "./powerbi";

const CATEGORIES = ["Furniture", "Office", "Tech", "Bags", "Phones"];
// Mixed positive and negative so the zero line has something to separate.
const PROFIT = [42, -18, 65, 12, -27];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
const TREND = [20, 34, 28, 46, 52, 61];

export function tableauPreview(theme: Theme, edit: Edit): HTMLElement {
  const { palette, text, background, gridline, zeroline, sizes } = theme;
  const body = fontStyle(theme.fonts.tableau.body);
  const title = fontStyle(theme.fonts.tableau.title);
  const n = palette.categorical.length;
  const bodyPx = px(sizes.body);
  const titlePx = px(sizes.title);
  const axisText = { ...body, size: bodyPx * 0.85, color: text.secondary };

  // Tableau's `view` background is the area behind the marks.
  const view = (...kids: (Node | null)[]) =>
    edit(h("div", { class: "pv-card", style: `background:${background.container}` }, ...kids), "bg-container", "chart area background");

  const sheetTitle = (label: string) =>
    edit(h("div", { class: "pv-vtitle", style: css(title, titlePx, text.primary) }, label), "font-title", "title font");

  const bars = columnChart({
    width: 300, height: 190, ticks: [-40, 0, 40, 80], categories: CATEGORIES, values: [PROFIT],
    colorOf: (_series, category) => category % n, gridline, zeroline, palette: palette.categorical, edit,
    text: axisText, ariaLabel: "Sample bar chart colored by category",
  });

  const legend = h("div", { class: "pv-legend vertical" }, ...CATEGORIES.map((name, i) => {
    const idx = i % n;
    return h("span", { class: "pv-legend-item", style: css(body, bodyPx * 0.9, text.secondary) },
      edit(h("span", { class: "pv-swatch", style: `background:${palette.categorical[idx]}` }), `cat-${idx}`, `color ${idx + 1}`), name);
  }));

  const line = lineChart({
    width: 300, height: 150, ticks: [0, 20, 40, 60], categories: MONTHS, values: TREND, colorIndex: 0,
    gridline, zeroline, palette: palette.categorical, edit, text: axisText, ariaLabel: "Sample line chart in the theme mark color",
  });

  const tooltip = edit(
    h("div", { class: "pv-tooltip", style: css(body, bodyPx, text.primary) }, h("strong", {}, "Tech"), h("div", {}, "Profit: $65K")),
    "font-body", "tooltip font");

  return h("div", { class: "pv-tab" },
    // The dashboard frame isn't part of Tableau's theme, so it stays neutral here.
    edit(h("h4", { class: "pv-title", style: css({ ...title, weight: 700 }, titlePx + 2, text.primary) }, "Superstore profit"), "font-title", "title font"),
    h("div", { class: "pv-row" },
      view(sheetTitle("Profit by category"), h("div", { class: "pv-with-legend" }, bars, legend)),
      view(sheetTitle("Sales trend"), line, h("div", { class: "pv-spacer" }), tooltip)));
}
