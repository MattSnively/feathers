import { fontStyle, px } from "../../preview/style";
import type { SheetData } from "../../sheet/buildSheet";
import { h } from "../dom";

/** Each Power BI text style with its font, size and a sample drawn at that font and size. */
export function typePage(data: SheetData, head: HTMLElement): HTMLElement {
  return h("section", { class: "sheet-page" },
    head,
    h("p", { class: "sheet-lede" }, "The fonts and sizes this theme sets in Power BI, and where each one is used."),
    h("table", { class: "sheet-type" },
      h("thead", {}, h("tr", {}, ...["Style", "Used for", "Font and size", "Sample"].map((c) => h("th", {}, c)))),
      h("tbody", {}, ...data.fonts.map((f) => {
        const look = fontStyle(f.font);
        return h("tr", {},
          h("td", {}, h("code", {}, f.textClass)),
          h("td", {}, f.use),
          h("td", {}, h("strong", {}, f.font), h("br"), `${f.size} pt`, h("br"), h("span", { class: "sheet-stack" }, f.stack)),
          h("td", {}, h("div", { class: "sheet-sample", style: `font-family:${look.family};font-weight:${look.weight};font-size:${px(f.size)}px` }, f.textClass === "callout" ? "$4.2M" : "Aa Regional sales")));
      }))),
    data.fontNote ? h("p", { class: "sheet-blurb" }, data.fontNote) : null,
    h("p", { class: "sheet-blurb" }, "Titles, headers and card values use the title font. Labels use the body font. Sizes are in points, as Power BI sets them."));
}
