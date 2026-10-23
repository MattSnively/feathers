import type { Theme } from "../../model/theme";
import { buildSheet } from "../../sheet/buildSheet";
import { h } from "../dom";
import { accessibilityPage, colorPage } from "./colorPage";
import { dashboardPage } from "./dashboardPage";
import { typePage } from "./typePage";

/**
 * The example sheet as printable pages: colors, type, and an annotated dashboard. Call `annotate` after
 * the element is in the document so the dashboard markers can be placed.
 */
export function buildSheetPages(theme: Theme, date = new Date()): { element: HTMLElement; annotate: () => void } {
  const data = buildSheet(theme);
  const stamp = date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  const head = (section: string) =>
    h("header", { class: "sheet-head" },
      h("div", {}, h("h1", {}, data.name), h("p", {}, `Example sheet: ${section}`)),
      h("p", { class: "sheet-made" }, `Made with Feathers, ${stamp}`));

  const dashboard = dashboardPage(theme, head("dashboard"), head("dashboard key"));
  const element = h("div", { class: "sheet" },
    colorPage(data, head("colors")), accessibilityPage(data, head("color accessibility")), typePage(data, head("fonts")), ...dashboard.elements);
  return { element, annotate: dashboard.annotate };
}
