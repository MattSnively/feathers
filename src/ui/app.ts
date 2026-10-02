import type { Theme } from "../model/theme";
import { blank } from "../presets/blank";
import { okabeIto, playfair, tolMuted } from "../presets";
import type { Mode, Store, Tool } from "../state/store";
import { buildA11yPanel } from "./a11yPanel";
import { buildControls } from "./controls";
import { h } from "./dom";
import { buildExportBar } from "./exportBar";
import { buildPreview } from "./preview";

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

const MODES: [Mode, string][] = [
  ["beginner", "Beginner"],
  ["advanced", "Advanced"],
];

/** Segmented toggle; buttons stay in place and only aria-pressed changes, so keyboard focus is never lost. */
function segmented<T extends string>(
  store: Store,
  label: string,
  options: [T, string][],
  current: () => T,
  choose: (value: T) => void,
): HTMLElement {
  const labelId = `seg-${label.replace(/\W+/g, "-").toLowerCase()}`;
  const buttons = options.map(([value, text]) => h("button", { type: "button", class: "seg", onclick: () => choose(value) }, text));
  const sync = () => buttons.forEach((b, i) => b.setAttribute("aria-pressed", String(options[i]![0] === current())));
  store.subscribe(sync);
  sync();
  return h("div", { class: "field" },
    h("span", { class: "label", id: labelId }, label),
    h("div", { class: "seg-group", role: "group", "aria-labelledby": labelId }, ...buttons));
}

const toolToggle = (store: Store) =>
  segmented(store, "I'm building for", TOOLS, () => store.get().tool, (t) => store.setTool(t));

const modeToggle = (store: Store) =>
  segmented(store, "Detail level", MODES, () => store.get().mode, (m) => store.setMode(m));

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
  const controls = buildControls(store);
  root.replaceChildren(
    h("header", { class: "top" },
      h("div", { class: "brand" },
        h("h1", {}, "Feathers"),
        h("p", {}, "One theme for Power BI and Tableau: colors, fonts, gridlines and backgrounds.")),
      h("div", { class: "top-controls" }, toolToggle(store), modeToggle(store), presetPicker(store))),
    h("main", { class: "workspace" },
      controls.element,
      h("section", { class: "preview", "aria-labelledby": "preview-title" },
        h("h2", { id: "preview-title" }, "Preview"),
        buildPreview(store, controls.reveal),
        paletteStrips(store),
        buildA11yPanel(store))),
    buildExportBar(store),
  );
}
