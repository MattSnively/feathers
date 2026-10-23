import { VISION_LABEL } from "../../a11y/cvd";
import type { Finding } from "../../a11y/analyze";
import type { SheetData, Swatch } from "../../sheet/buildSheet";
import { h } from "../dom";

const swatchCard = (s: Swatch) =>
  h("div", { class: "sheet-swatch" },
    h("div", { class: "sheet-chip", style: `background:${s.hex}` }),
    h("div", { class: "sheet-swatch-text" },
      h("strong", {}, s.label),
      h("code", {}, s.hex.toUpperCase()),
      h("span", {}, s.role),
      // The verdict is a word, so it survives a black-and-white printout.
      s.contrast
        ? h("span", { class: `sheet-contrast${s.contrast.meets ? "" : " low"}` },
            `${s.contrast.ratio.toFixed(1)}:1, ${s.contrast.meets ? "meets" : "below"} ${s.contrast.need}:1`)
        : null));

const chips = (colors: string[]) =>
  h("span", { class: "sheet-strip" }, ...colors.map((c) => h("span", { class: "sheet-chip small", style: `background:${c}`, title: c })));

const findingList = (items: Finding[]) =>
  h("ul", { class: "sheet-findings" }, ...items.map((f) =>
    h("li", {}, h("strong", {}, f.title), " ", f.detail, " ", chips(f.colors))));

/** Swatches with hex, role and contrast. */
export function colorPage(data: SheetData, head: HTMLElement): HTMLElement {
  return h("section", { class: "sheet-page" },
    head,
    h("p", { class: "sheet-lede" }, "Every color in this theme with its hex code, what it is used for, and how legible it is."),
    ...data.groups.map((g) =>
      h("div", { class: "sheet-group" },
        h("h2", {}, g.title),
        h("p", { class: "sheet-blurb" }, g.blurb),
        h("div", { class: "sheet-swatches" }, ...g.swatches.map(swatchCard)))));
}

/** How the data colors hold up for viewers with color-vision deficiency, and Feathers' checks. */
export function accessibilityPage(data: SheetData, head: HTMLElement): HTMLElement {
  const typical = data.groups[0]!.swatches.map((s) => s.hex);
  const verdict = data.findings.length === 0 && data.notes.length === 0;
  return h("section", { class: "sheet-page" },
    head,
    h("div", { class: "sheet-group" },
      h("h2", {}, "How the data colors look to everyone"),
      h("p", { class: "sheet-blurb" }, "The same data colors as seen with typical vision and with three kinds of color-vision deficiency. Colors you can still tell apart in every row are safe to use side by side."),
      h("div", { class: "sheet-sims" },
        h("div", { class: "sheet-sim" }, h("span", {}, "Typical vision"), chips(typical)),
        ...data.simulations.map((sim) =>
          h("div", { class: "sheet-sim" }, h("span", {}, VISION_LABEL[sim.vision]), chips(sim.categorical))))),
    h("div", { class: "sheet-group" },
      h("h2", {}, "Accessibility checks"),
      verdict ? h("p", { class: "sheet-blurb" }, "Feathers found no problems and no notes for this theme.") : null,
      data.findings.length > 0 ? findingList(data.findings) : null,
      data.notes.length > 0
        ? h("div", {}, h("p", { class: "sheet-blurb" }, "Notes: worth knowing, but not counted as problems."), findingList(data.notes))
        : null));
}
