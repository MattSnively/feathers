import type { Theme } from "../model/theme";
import { blank } from "../presets/blank";
import { okabeIto, playfair, tolMuted } from "../presets";
import type { Store, Tool } from "../state/store";
import { buildA11yPanel } from "./a11yPanel";
import { buildControls } from "./controls";
import { h } from "./dom";
import { buildExportBar } from "./exportBar";

const STARTING_POINTS: [string, Theme][] = [
  ["Playfair Data brand", playfair],
  ["Okabe-Ito (colorblind-safe)", okabeIto],
  ["Paul Tol Muted (colorblind-safe)", tolMuted],
  ["Start from scratch", blank],
];

const TOOLS: [Tool, string][] = [
  ["powerbi", "Power BI"],
  ["tableau", "Tableau"],
];

function toolToggle(store: Store): HTMLElement {
  const buttons = TOOLS.map(([tool, label]) =>
    h("button", { type: "button", class: "seg", onclick: () => store.setTool(tool) }, label));
  const sync = () => buttons.forEach((b, i) => b.setAttribute("aria-pressed", String(TOOLS[i]![0] === store.get().tool)));
  store.subscribe(sync);
  sync();
  return h("div", { class: "field" },
    h("span", { class: "label", id: "tool-label" }, "I'm building for"),
    h("div", { class: "seg-group", role: "group", "aria-labelledby": "tool-label" }, ...buttons));
}

function presetPicker(store: Store): HTMLElement {
  const select = h("select", {
    id: "preset",
    onchange: () => {
      const choice = STARTING_POINTS[Number(select.value)];
      if (choice) store.loadTheme(choice[1]);
      // Back to the prompt, so choosing the same starting point again still fires.
      select.value = "";
    },
  },
    h("option", { value: "", selected: true, disabled: true }, "Choose a starting point"),
    ...STARTING_POINTS.map(([label], i) => h("option", { value: String(i) }, label)));
  return h("div", { class: "field" }, h("label", { htmlFor: "preset" }, "Start from"), select);
}

/** Swatch strips: a quick read of the whole palette until the full previews arrive. */
function paletteStrips(store: Store): HTMLElement {
  const root = h("div", { class: "strips" });
  const render = () => {
    const { categorical, sequential, diverging } = store.get().theme.palette;
    root.replaceChildren(
      h("p", { class: "strip-label" }, "Categorical"),
      h("div", { class: "chips" }, ...categorical.map((c, i) =>
        h("span", { class: "chip", style: `background:${c}`, title: c, role: "img", "aria-label": `Color ${i + 1}: ${c}` }))),
      h("p", { class: "strip-label" }, "Sequential"),
      h("div", { class: "ramp", role: "img", "aria-label": `Sequential from ${sequential[0]} to ${sequential[1]}`,
        style: `background:linear-gradient(to right, ${sequential.join(", ")})` }),
      h("p", { class: "strip-label" }, "Diverging"),
      h("div", { class: "ramp", role: "img", "aria-label": `Diverging from ${diverging[0]} through ${diverging[1]} to ${diverging[2]}`,
        style: `background:linear-gradient(to right, ${diverging.join(", ")})` }),
    );
  };
  store.subscribe(render);
  render();
  return root;
}

export function mountApp(root: HTMLElement, store: Store): void {
  root.replaceChildren(
    h("header", { class: "top" },
      h("div", { class: "brand" },
        h("h1", {}, "Feathers"),
        h("p", {}, "One theme for Power BI and Tableau: colors, fonts, gridlines and backgrounds.")),
      h("div", { class: "top-controls" }, toolToggle(store), presetPicker(store))),
    h("main", { class: "workspace" },
      buildControls(store),
      h("section", { class: "preview", "aria-labelledby": "preview-title" },
        h("h2", { id: "preview-title" }, "Preview"),
        paletteStrips(store),
        h("p", { class: "hint" }, "A live report preview is coming. For now, check your palette here."),
        buildA11yPanel(store))),
    buildExportBar(store),
  );
}
