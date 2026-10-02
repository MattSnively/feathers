import { POWER_BI_FONTS, TABLEAU_FONTS } from "../model/fonts";
import type { LineStyle } from "../model/theme";
import type { Store } from "../state/store";
import { h, rebuild } from "./dom";
import { checkboxField, colorField, numberField, selectField } from "./fields";
import { isAvailable } from "./visibility";

type PaletteTab = "categorical" | "sequential" | "diverging";

/** Tableau's Edit Colors dialog only shows 20 colors of a palette. */
const MAX_CATEGORICAL = 20;
const LINE_STYLES: readonly LineStyle[] = ["solid", "dashed", "dotted"];

/** Which panel holds the control a data-key belongs to, so clicking the preview can open it first. */
function panelFor(key: string): string | null {
  if (/^(cat|status|text|sequential|diverging)-/.test(key)) return "colors";
  if (/^(font|size)-/.test(key)) return "fonts";
  if (/^(gridline|zeroline)/.test(key)) return "lines";
  if (key.startsWith("bg-")) return "backgrounds";
  return null;
}

export function buildControls(store: Store): { element: HTMLElement; reveal: (key: string) => void } {
  const root = h("div", { class: "controls" });
  let tab: PaletteTab = "categorical";
  let focusKey: string | null = null;
  const collapsed = new Set<string>();

  const panel = (id: string, title: string, ...body: (Node | null)[]) =>
    h(
      "details",
      { class: "panel", open: !collapsed.has(id), ontoggle: (e: Event) => {
        const el = e.currentTarget as HTMLDetailsElement;
        if (el.open) collapsed.delete(id);
        else collapsed.add(id);
      } },
      h("summary", {}, title),
      h("div", { class: "panel-body" }, ...body),
    );

  const hint = (text: string) => h("p", { class: "hint" }, text);

  const move = (from: number, to: number, direction: "up" | "down") => {
    const last = store.get().theme.palette.categorical.length - 1;
    // Keep focus on the same kind of button so repeated key presses keep moving the same row.
    const stuck = direction === "up" ? to === 0 : to === last;
    focusKey = `cat-${to}-${stuck ? (direction === "up" ? "down" : "up") : direction}`;
    store.updateTheme((t) => {
      const arr = t.palette.categorical;
      const [moved] = arr.splice(from, 1);
      arr.splice(to, 0, moved!);
    }, "structure");
  };

  const categoricalRows = () => {
    const cat = store.get().theme.palette.categorical;
    const rows = cat.map((color, i) => {
      const row = h("div", { class: "swatch-row" });
      const handle = h("span", {
        class: "drag-handle",
        draggable: true,
        title: "Drag to reorder",
        "aria-hidden": "true",
        ondragstart: (e: DragEvent) => {
          e.dataTransfer?.setData("text/plain", String(i));
          if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
          e.dataTransfer?.setDragImage(row, 0, 0);
        },
      }, "⋮⋮");
      row.addEventListener("dragover", (e) => e.preventDefault());
      row.addEventListener("drop", (e) => {
        e.preventDefault();
        const from = Number(e.dataTransfer?.getData("text/plain"));
        if (Number.isInteger(from) && from !== i) move(from, i, from < i ? "down" : "up");
      });
      row.append(
        handle,
        colorField(`Color ${i + 1}`, color, (hex) => store.updateTheme((t) => { t.palette.categorical[i] = hex; }), { key: `cat-${i}` }),
        h("button", { type: "button", class: "icon-btn", "aria-label": `Move color ${i + 1} up`, disabled: i === 0, "data-key": `cat-${i}-up`, onclick: () => move(i, i - 1, "up") }, "↑"),
        h("button", { type: "button", class: "icon-btn", "aria-label": `Move color ${i + 1} down`, disabled: i === cat.length - 1, "data-key": `cat-${i}-down`, onclick: () => move(i, i + 1, "down") }, "↓"),
        h("button", {
          type: "button",
          class: "icon-btn",
          "aria-label": `Remove color ${i + 1}`,
          disabled: cat.length === 1,
          "data-key": `cat-${i}-remove`,
          onclick: () => {
            focusKey = `cat-${Math.min(i, cat.length - 2)}`;
            store.updateTheme((t) => { t.palette.categorical.splice(i, 1); }, "structure");
          },
        }, "×"),
      );
      return row;
    });
    const atMax = cat.length >= MAX_CATEGORICAL;
    return [
      ...rows,
      h("button", {
        type: "button",
        class: "secondary",
        disabled: atMax,
        onclick: () => {
          focusKey = `cat-${cat.length}`;
          store.updateTheme((t) => { t.palette.categorical.push("#888888"); }, "structure");
        },
      }, atMax ? `Maximum ${MAX_CATEGORICAL} colors` : "Add color"),
      hint(`Colors apply in order. The first one is also Tableau's single mark color. Tableau shows up to ${MAX_CATEGORICAL}.`),
    ];
  };

  const rampRows = (kind: "sequential" | "diverging", labels: string[]) => {
    const colors = store.get().theme.palette[kind];
    return [
      ...labels.map((label, i) =>
        colorField(label, colors[i]!, (hex) => store.updateTheme((t) => { t.palette[kind][i] = hex; }), { key: `${kind}-${i}` })),
      hint(kind === "sequential"
        ? "Tableau fills in the shades between the two ends."
        : "Tableau blends each end into the center color."),
    ];
  };

  const colorsPanel = () => {
    const tabs = (["categorical", "sequential", "diverging"] as const).map((name) =>
      h("button", {
        type: "button",
        class: "seg",
        "aria-pressed": String(tab === name),
        onclick: () => { tab = name; render(); },
      }, name[0]!.toUpperCase() + name.slice(1)));
    const { theme, mode } = store.get();
    const roles = (group: "status" | "text", items: [string, string][]) =>
      items.map(([key, label]) =>
        colorField(label, (theme[group] as Record<string, string>)[key]!,
          (hex) => store.updateTheme((t) => { (t[group] as Record<string, string>)[key] = hex; }), { key: `${group}-${key}` }));
    return panel("colors", "Colors",
      h("div", { class: "seg-group", role: "group", "aria-label": "Palette type" }, ...tabs),
      ...(tab === "categorical" ? categoricalRows()
        : tab === "sequential" ? rampRows("sequential", ["Low end", "High end"])
        : rampRows("diverging", ["Low end", "Center", "High end"])),
      ...(mode === "advanced"
        ? [
            h("h3", {}, "Status colors"),
            hint("Used by Power BI KPI and waterfall visuals and conditional-format gradients."),
            ...roles("status", [["good", "Good"], ["neutral", "Neutral"], ["bad", "Bad"]]),
            h("h3", {}, "Text colors"),
            ...roles("text", [["primary", "Primary text"], ["secondary", "Secondary text"], ["muted", "Muted text"]]),
          ]
        : []),
    );
  };

  const fontsPanel = () => {
    const { theme, tool, mode } = store.get();
    const key = tool === "powerbi" ? "powerBi" : "tableau";
    const list = tool === "powerbi" ? POWER_BI_FONTS : TABLEAU_FONTS;
    const title = `Fonts (${tool === "powerbi" ? "Power BI" : "Tableau"})`;
    if (mode === "beginner") {
      return panel("fonts", title,
        hint("Only fonts that ship with the tool, so what you see is what imports. One font is used for all text; Advanced sets titles and sizes separately."),
        selectField("Font", list, theme.fonts[key].body, (v) => store.updateTheme((t) => { t.fonts[key].body = v; t.fonts[key].title = v; }), { key: "font-body" }),
      );
    }
    return panel("fonts", title,
      hint("Only fonts that ship with the tool, so what you see is what imports."),
      selectField("Body font", list, theme.fonts[key].body, (v) => store.updateTheme((t) => { t.fonts[key].body = v; }), { key: "font-body" }),
      selectField("Title font", list, theme.fonts[key].title, (v) => store.updateTheme((t) => { t.fonts[key].title = v; }), { key: "font-title" }),
      numberField("Body size (pt)", theme.sizes.body, { min: 1, max: 99 }, (n) => store.updateTheme((t) => { t.sizes.body = n; }), { key: "size-body" }),
      numberField("Title size (pt)", theme.sizes.title, { min: 1, max: 99 }, (n) => store.updateTheme((t) => { t.sizes.title = n; }), { key: "size-title" }),
      tool === "powerbi"
        ? numberField("Card value size (pt)", theme.sizes.callout, { min: 1, max: 99 }, (n) => store.updateTheme((t) => { t.sizes.callout = n; }), { key: "size-callout" })
        : null,
    );
  };

  const lineEditor = (id: "gridline" | "zeroline", title: string, withWidth: boolean) => {
    const line = store.get().theme[id];
    return [
      h("h3", {}, title),
      checkboxField("Show", line.visible, (v) => store.updateTheme((t) => { t[id].visible = v; })),
      selectField("Style", LINE_STYLES, line.style, (v) => store.updateTheme((t) => { t[id].style = v as LineStyle; })),
      withWidth ? numberField("Width (1-5)", line.width, { min: 1, max: 5 }, (n) => store.updateTheme((t) => { t[id].width = n; })) : null,
      colorField("Color", line.color, (hex) => store.updateTheme((t) => { t[id].color = hex; }), { key: `${id}-color` }),
    ];
  };

  // Beginner gets gridlines without width, and no zero line.
  const linesPanel = () =>
    store.get().mode === "advanced"
      ? panel("lines", "Lines", ...lineEditor("gridline", "Gridlines", true), ...lineEditor("zeroline", "Zero line", true))
      : panel("lines", "Lines", ...lineEditor("gridline", "Gridlines", false));

  const backgroundsPanel = () => {
    const { theme: { background }, mode, tool } = store.get();
    const field = (key: "canvas" | "page" | "container", label: string) =>
      colorField(label, background[key], (hex) => store.updateTheme((t) => { t.background[key] = hex; }), { key: `bg-${key}` });
    // Beginner only lists backgrounds the selected tool uses; Tableau has no canvas or page.
    const show = (key: string) => isAvailable(`bg-${key}`, mode, tool);
    return panel("backgrounds", "Backgrounds",
      show("canvas") ? field("canvas", "Canvas (Power BI)") : null,
      show("page") ? field("page", "Page (Power BI)") : null,
      field("container", "Chart area"),
      hint("Chart area is the visual container in Power BI and the view background in Tableau."),
    );
  };

  const namePanel = () => {
    const input = h("input", {
      id: "theme-name",
      type: "text",
      value: store.get().theme.name,
      maxLength: 60,
      oninput: () => store.updateTheme((t) => { t.name = input.value; }),
    });
    return panel("name", "Theme name",
      h("div", { class: "field" }, h("label", { htmlFor: "theme-name" }, "Name"), input),
      hint("Also names the downloaded files."),
    );
  };

  function render() {
    const key = focusKey;
    focusKey = null;
    const more = store.get().mode === "beginner"
      ? [h("p", { class: "hint more-hint" }, "Switch to Advanced for text and status colors, font sizes, line widths and the zero line.")]
      : [];
    rebuild(root, () => [namePanel(), colorsPanel(), fontsPanel(), linesPanel(), backgroundsPanel(), ...more], key);
  }

  /** Opens the panel for `key`, switches palette tab if needed, and moves focus to that control. */
  function reveal(key: string) {
    const { mode, tool } = store.get();
    const panelId = panelFor(key);
    if (!panelId || !isAvailable(key, mode, tool)) return;
    collapsed.delete(panelId);
    if (key.startsWith("cat-")) tab = "categorical";
    else if (key.startsWith("sequential-")) tab = "sequential";
    else if (key.startsWith("diverging-")) tab = "diverging";
    focusKey = key;
    render();
    root.querySelector<HTMLElement>(`[data-key="${CSS.escape(key)}"]`)?.scrollIntoView({ block: "center" });
  }

  store.subscribe((_state, kind) => {
    if (kind === "structure") render();
  });
  render();
  return { element: root, reveal };
}
