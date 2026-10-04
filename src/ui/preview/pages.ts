import { contrastRatio } from "../../a11y/color";
import type { Theme } from "../../model/theme";
import { cardStyle, css, fontStyle, px, rampColor } from "../../preview/style";
import type { Tool } from "../../state/store";
import { h } from "../dom";
import { areaChart, donutChart, lineChart, stackedColumnChart, varianceChart, type Edit } from "./chart";

export type PreviewPage = "overview" | "trends" | "breakdown";

export const PAGES: { value: PreviewPage; label: string }[] = [
  { value: "overview", label: "Overview" },
  { value: "trends", label: "Trends" },
  { value: "breakdown", label: "Breakdown" },
];

export const PAGE_TITLES: Record<Tool, Record<PreviewPage, string>> = {
  powerbi: { overview: "Regional performance", trends: "Trends over time", breakdown: "Breakdown by region" },
  tableau: { overview: "Superstore profit", trends: "Sales over time", breakdown: "Profit breakdown" },
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
const CHANNELS = ["Online", "Retail", "Partners"];
const STACKED = [
  [30, 36, 34, 44, 48, 56],
  [22, 26, 30, 28, 34, 38],
  [14, 18, 20, 24, 22, 28],
];
const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];
const BY_QUARTER = [
  [34, 42, 38, 52],
  [26, 30, 36, 34],
  [18, 22, 24, 30],
];
const YEARS = [
  [40, 46, 44, 58, 64, 72],
  [32, 36, 41, 40, 49, 53],
];
const SEGMENTS = ["Corporate", "Consumer", "Home office", "Small biz", "Public"];
const SHARE = [34, 26, 18, 14, 8];
const REGIONS = ["Northeast", "Southeast", "Midwest", "West"];
const HEAT = [
  [82, 64, 40, 28],
  [58, 70, 52, 36],
  [34, 46, 74, 60],
  [22, 30, 56, 88],
];
const VARIANCE_ROWS = ["Furniture", "Office", "Tech", "Bags", "Phones", "Binders"];
const VARIANCE = [-26, 14, 38, -9, 22, -17];

/**
 * The Trends and Breakdown pages. Both tools share them; only the chrome, the gradient source and the
 * zero line differ, because Power BI themes carry a min/center/max gradient and no zero line while
 * Tableau's palettes carry a sequential ramp and a zero line.
 */
export function extraPage(page: Exclude<PreviewPage, "overview">, tool: Tool, theme: Theme, edit: Edit): HTMLElement[] {
  const { palette, status, text, gridline, zeroline, background, sizes } = theme;
  const fonts = tool === "powerbi" ? theme.fonts.powerBi : theme.fonts.tableau;
  const body = fontStyle(fonts.body);
  const title = fontStyle(fonts.title);
  const n = palette.categorical.length;
  const bodyPx = px(sizes.body);
  const titlePx = px(sizes.title);
  const axis = { ...body, size: bodyPx * 0.85, color: text.secondary };
  const common = { gridline, zeroline: tool === "tableau" ? zeroline : null, palette: palette.categorical, edit, text: axis };
  const titleScale = tool === "powerbi" ? 0.85 : 1;

  const card = (...kids: (Node | null)[]) =>
    edit(h("div", { class: "pv-card", style: cardStyle(theme, tool) }, ...kids), "bg-container", "chart area background");
  const cardTitle = (label: string) =>
    edit(h("div", { class: "pv-vtitle", style: css(title, titlePx * titleScale, text.primary) }, label), "font-title", "title font");
  const legend = (names: string[]) =>
    h("div", { class: "pv-legend" }, ...names.map((name, i) => {
      const idx = i % n;
      return h("span", { class: "pv-legend-item", style: css(body, bodyPx * 0.9, text.secondary) },
        edit(h("span", { class: "pv-swatch", style: `background:${palette.categorical[idx]}` }), `cat-${idx}`, `color ${idx + 1}`), name);
    }));
  const pageTitle = edit(
    h("h4", { class: "pv-title", style: css(tool === "tableau" ? { ...title, weight: 700 } : title, titlePx + (tool === "powerbi" ? 4 : 2), text.primary) }, PAGE_TITLES[tool][page]),
    "font-title", "title font");

  if (page === "trends") {
    const series = STACKED.map((values, i) => ({ values, colorIndex: i % n }));
    const area = areaChart({
      ...common, width: 460, height: 210, ticks: [0, 50, 100, 150], categories: MONTHS, series, ariaLabel: "Sample stacked area chart",
    });
    const stacked = stackedColumnChart({
      ...common, width: 260, height: 210, ticks: [0, 40, 80, 120], categories: QUARTERS, values: BY_QUARTER,
      colorOf: (i) => i % n, ariaLabel: "Sample stacked column chart",
    });
    const yoy = lineChart({
      ...common, width: 740, height: 190, ticks: [0, 25, 50, 75], categories: MONTHS,
      series: YEARS.map((values, i) => ({ values, colorIndex: i % n })), ariaLabel: "Sample year-over-year line chart",
    });
    return [
      pageTitle,
      h("div", { class: "pv-row wide-split" },
        card(cardTitle("Sales by channel"), area, legend(CHANNELS)),
        card(cardTitle("Sales by quarter"), stacked, legend(CHANNELS))),
      h("div", { class: "pv-row" }, card(cardTitle("This year vs. last year"), yoy, legend(["This year", "Last year"]))),
    ];
  }

  // Gradient source: Power BI's min/center/max, or Tableau's sequential ramp.
  const ramp: string[] = tool === "powerbi" ? palette.diverging : palette.sequential;
  const rampKind = tool === "powerbi" ? "diverging" : "sequential";
  const cellInk = (bg: string) => (contrastRatio(bg, "#000000") >= contrastRatio(bg, "#FFFFFF") ? "#000000" : "#FFFFFF");

  const donut = donutChart({
    size: 190, weights: SHARE, palette: palette.categorical, colorOf: (i) => i % n, gap: background.container, edit, ariaLabel: "Sample donut chart",
    center: { label: "100%", text: { ...title, size: titlePx * 1.2, color: text.primary } },
  });

  const heat = h("table", { class: "pv-table pv-heat" },
    h("thead", {}, h("tr", {}, h("th", {}), ...QUARTERS.map((q) => h("th", { style: css({ ...body, weight: 700 }, bodyPx, text.secondary) }, q)))),
    h("tbody", {}, ...HEAT.map((row, r) => h("tr", {},
      h("th", { style: css(body, bodyPx, text.secondary) }, REGIONS[r]!),
      ...row.map((v) => {
        const t = v / 100;
        const bg = rampColor(ramp, t);
        // Clicking edits whichever ramp stop the cell sits closest to.
        return edit(h("td", { style: `${css(body, bodyPx, cellInk(bg))};background:${bg}` }, String(v)),
          `${rampKind}-${Math.round(t * (ramp.length - 1))}`, `${rampKind === "diverging" ? "gradient" : "sequential"} color`);
      })))));

  const variance = varianceChart({
    width: 300, height: 190, categories: VARIANCE_ROWS, values: VARIANCE, ramp: palette.diverging, text: axis,
    rule: tool === "tableau" ? zeroline : gridline,
    ruleKey: tool === "tableau" ? "zeroline-color" : "gridline-color", ruleLabel: tool === "tableau" ? "zero line" : "gridlines",
    edit, ariaLabel: "Sample variance bars on the diverging palette",
  });

  const scale = (label: string, kind: "sequential" | "diverging") => {
    const stops: string[] = palette[kind];
    return h("div", { class: "pv-scale" },
      h("span", { style: css(body, bodyPx * 0.9, text.secondary) }, label),
      // The bar blends the stops; each third or half is still a click target for its own stop.
      h("div", { class: "pv-scale-bar", style: `background:linear-gradient(to right, ${stops.join(", ")})` }, ...stops.map((_, i) =>
        edit(h("span", {}), `${kind}-${i}`, `${i === 0 ? "low" : i === stops.length - 1 ? "high" : "center"}-end color`))));
  };

  const tiles = (["good", "neutral", "bad"] as const).map((k) =>
    edit(h("span", { class: "pv-tile", style: `${css(body, bodyPx, cellInk(status[k]))};background:${status[k]}` }, k === "good" ? "On track" : k === "bad" ? "At risk" : "Watch"),
      `status-${k}`, `${k} color`));

  return [
    pageTitle,
    h("div", { class: "pv-row" },
      card(cardTitle("Share by segment"), h("div", { class: "pv-donut-wrap" }, donut, legend(SEGMENTS))),
      card(cardTitle("Sales by region and quarter"), heat),
      card(cardTitle("Margin vs. plan"), variance)),
    h("div", { class: "pv-row" },
      card(cardTitle("Color scales"), h("div", { class: "pv-scales" }, ...(tool === "tableau" ? [scale("Sequential", "sequential")] : []), scale("Diverging", "diverging"))),
      // Tableau's theme has no status colors, so only Power BI shows them.
      ...(tool === "powerbi" ? [card(cardTitle("Status colors"), h("div", { class: "pv-tiles" }, ...tiles))] : [])),
  ];
}
