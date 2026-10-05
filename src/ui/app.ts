import type { Theme } from "../model/theme";
import { blank } from "../presets/blank";
import { dark2, midnight, okabeIto, playfair, tableau10, tolMuted } from "../presets";
import type { Mode, Store, Tool } from "../state/store";
import { buildSidebar } from "./controls";
import { h } from "./dom";
import { buildExportBar } from "./exportBar";
import { segmentedControl } from "./fields";
import { icon, logoMark } from "./icons";
import { buildOnboarding } from "./onboarding";
import { buildPreview } from "./preview";

const STARTING_POINTS: [string, Theme][] = [
  ["Playfair Data brand", playfair],
  ["Okabe-Ito (colorblind-safe)", okabeIto],
  ["Paul Tol Muted (colorblind-safe)", tolMuted],
  ["Tableau 10", tableau10],
  ["ColorBrewer Dark2", dark2],
  ["Midnight (dark, colorblind-safe)", midnight],
  ["Start from scratch", blank],
];

const TOOLS = [
  ["powerbi", "Power BI"],
  ["tableau", "Tableau"],
] as const;

const MODES = [
  ["beginner", "Beginner"],
  ["advanced", "Advanced"],
] as const;

const SCHEMA_LABEL: Record<Tool, string> = {
  powerbi: "Power BI schema 2.157",
  tableau: "Tableau theme 1.0.0",
};

function presetPicker(store: Store): HTMLElement {
  const select = h("select", {
    id: "preset",
    class: "select compact",
    "aria-label": "Start from",
    onchange: () => {
      const choice = STARTING_POINTS[Number(select.value)];
      if (choice) store.loadTheme(choice[1]);
      // Back to the prompt, so choosing the same starting point again still fires.
      select.value = "";
    },
  },
    h("option", { value: "", selected: true, disabled: true }, "Start from…"),
    ...STARTING_POINTS.map(([label], i) => h("option", { value: String(i) }, label)));
  return select;
}

function themeName(store: Store): HTMLElement {
  const input = h("input", {
    id: "theme-name",
    class: "name-input",
    type: "text",
    value: store.get().theme.name,
    maxLength: 60,
    placeholder: "Untitled theme",
    "aria-label": "Theme name",
    title: "Also names the downloaded files",
    oninput: () => store.updateTheme((t) => { t.name = input.value; }),
  });
  // A preset load changes the name from outside; don't fight the user while they're typing in it.
  store.subscribe((state) => {
    if (document.activeElement !== input) input.value = state.theme.name;
  });
  return h("div", { class: "name-wrap" }, input);
}

function schemaChip(store: Store): HTMLElement {
  const chip = h("span", { class: "chip schema-chip" }, h("span", { class: "dot", "aria-hidden": "true" }), h("span", {}));
  const sync = () => { chip.lastElementChild!.textContent = SCHEMA_LABEL[store.get().tool]; };
  store.subscribe(sync);
  sync();
  return chip;
}

/** Right-hand sheet holding the three downloads and the import guides. */
function buildDrawer(store: Store) {
  const close = h("button", { type: "button", class: "icon-btn drawer-close", "aria-label": "Close downloads", onclick: () => dialog.close() }, icon("close", 20));
  const dialog = h("dialog", { class: "drawer", "aria-labelledby": "export-title" },
    h("div", { class: "drawer-inner" }, close, buildExportBar(store)));
  // Clicking the dimmed area outside the sheet lands on the <dialog> itself.
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.close();
  });
  return { element: dialog, open: () => dialog.showModal() };
}

export function mountApp(root: HTMLElement, store: Store, opts: { showOnboarding?: boolean; returning?: boolean } = {}): void {
  const sidebar = buildSidebar(store);
  const stage = buildPreview(store, sidebar.reveal);
  const drawer = buildDrawer(store);
  let overlay: HTMLElement | null = null;
  // Once there's work to go back to, the landing page's skip says so.
  let hasWork = opts.returning === true;

  const topbar = h("header", { class: "topbar" },
    // The way back to the start page from anywhere in the editor.
    h("button", { type: "button", class: "brand brand-home", title: "Back to the start page", "aria-label": "Feathers, back to the start page", onclick: () => launchOnboarding() },
      logoMark(38), h("span", { class: "brand-name" }, "Feathers")),
    h("div", { class: "tool-tabs" },
      segmentedControl<Tool>(TOOLS, () => store.get().tool, (t) => store.setTool(t), { label: "I'm building for" })),
    schemaChip(store),
    themeName(store),
    h("div", { class: "topbar-actions" },
      segmentedControl<Mode>(MODES, () => store.get().mode, (m) => store.setMode(m), { label: "Detail level", class: "mode-toggle" }),
      presetPicker(store),
      h("button", { type: "button", class: "btn ghost new-theme", onclick: () => launchOnboarding() }, icon("plus", 18), "New theme"),
      h("button", { type: "button", class: "btn primary download", onclick: drawer.open }, icon("download", 18), "Download")));

  const app = h("div", { class: "app" }, topbar, sidebar.rail, sidebar.panel, stage);
  root.replaceChildren(app, drawer.element);

  /** The first-run flow. Everything behind it goes inert so keyboard focus can't wander into the editor. */
  function launchOnboarding() {
    if (overlay) return;
    const close = () => {
      hasWork = true;
      overlay?.remove();
      overlay = null;
      app.inert = false;
      drawer.element.inert = false;
      sidebar.rail.querySelector<HTMLElement>(".rail-btn")?.focus();
    };
    const flow = buildOnboarding(store.get().theme, {
      onFinish: (theme) => {
        store.loadTheme(theme);
        close();
      },
      onSkip: close,
      skipLabel: hasWork ? "Back to the editor" : "Skip for now",
    });
    overlay = flow.element;
    root.append(overlay);
    app.inert = true;
    drawer.element.inert = true;
    flow.focusStart();
  }

  if (opts.showOnboarding) launchOnboarding();
}
