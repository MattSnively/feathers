import { analyzeTheme } from "../a11y/analyze";
import { ALL_FONTS, applyFont, currentFont, fontLabel, fontNotice, type FontRole } from "../model/fonts";
import type { LineStyle, Theme } from "../model/theme";
import type { Store } from "../state/store";
import { buildA11yPanel } from "./a11yPanel";
import { h, rebuild } from "./dom";
import { colorField, segmentedControl, selectField, sliderField, switchField } from "./fields";
import { icon, type IconName } from "./icons";
import { colorEditor } from "./swatches";
import { isAvailable } from "./visibility";

type TabId = "colors" | "text" | "lines" | "canvas" | "checks";
type PaletteKind = "categorical" | "sequential" | "diverging";

const TABS: { id: TabId; label: string; icon: IconName; blurb: string }[] = [
  { id: "colors", label: "Colors", icon: "palette", blurb: "Click anything in the preview to jump to its setting." },
  { id: "text", label: "Text", icon: "type", blurb: "Only fonts that ship with the tool, so what you see is what imports." },
  { id: "lines", label: "Lines", icon: "lines", blurb: "Gridlines and the zero line." },
  { id: "canvas", label: "Canvas", icon: "frame", blurb: "Backgrounds behind and inside your visuals." },
  { id: "checks", label: "Checks", icon: "shield", blurb: "Contrast and color-blindness checks on this theme." },
];

const PALETTE_KINDS = [
  ["categorical", "Categorical"],
  ["sequential", "Sequential"],
  ["diverging", "Diverging"],
] as const;

const LINE_STYLES = [
  ["solid", "Solid"],
  ["dashed", "Dashed"],
  ["dotted", "Dotted"],
] as const;

/** Tableau's Edit Colors dialog only shows 20 colors of a palette. */
const MAX_CATEGORICAL = 20;

/** Which tab holds the control a data-key belongs to, so clicking the preview can open it first. */
function tabFor(key: string): TabId | null {
  if (/^(cat|status|text|sequential|diverging)-/.test(key)) return "colors";
  if (/^(font|size)-/.test(key)) return "text";
  if (/^(gridline|zeroline)/.test(key)) return "lines";
  if (key.startsWith("bg-")) return "canvas";
  return null;
}

const keyOf = (kind: PaletteKind, i: number) => `${kind === "categorical" ? "cat" : kind}-${i}`;
const labelOf = (kind: PaletteKind, i: number) =>
  kind === "categorical" ? `Color ${i + 1}` : (kind === "sequential" ? ["Low end", "High end"] : ["Low end", "Center", "High end"])[i]!;

function setColor(t: Theme, kind: PaletteKind, i: number, hex: string) {
  if (kind === "categorical") t.palette.categorical[i] = hex;
  else t.palette[kind][i] = hex;
}

export function buildSidebar(store: Store): { rail: HTMLElement; panel: HTMLElement; reveal: (key: string) => void } {
  const panel = h("div", { class: "panel", id: "settings-panel", role: "region", "aria-label": "Settings" });
  let tab: TabId = "colors";
  let paletteKind: PaletteKind = "categorical";
  const selected: Record<PaletteKind, number> = { categorical: 0, sequential: 0, diverging: 0 };
  let focusKey: string | null = null;

  const a11y = buildA11yPanel(store);

  const hint = (text: string) => h("p", { class: "hint" }, text);
  const section = (title: string, aside: string | null, ...body: (Node | null)[]) =>
    h("section", { class: "section" },
      h("div", { class: "section-head" }, h("h3", {}, title), aside ? h("span", { class: "aside" }, aside) : null),
      h("div", { class: "section-body" }, ...body));

  // ---- Colors ---------------------------------------------------------------------------------

  function paletteSection(): HTMLElement {
    const kind = paletteKind;
    const initial = store.get().theme.palette;
    const colors = kind === "categorical" ? initial.categorical : initial[kind];
    selected[kind] = Math.min(selected[kind], colors.length - 1);
    const sel = selected[kind];
    const isCat = kind === "categorical";

    const move = (from: number, to: number, button?: "move-earlier" | "move-later") => {
      const last = colors.length - 1;
      // Keep focus on the same kind of button so repeated key presses keep moving the same color.
      if (button) {
        const stuck = button === "move-earlier" ? to === 0 : to === last;
        focusKey = stuck ? (button === "move-earlier" ? "move-later" : "move-earlier") : button;
      } else {
        focusKey = `chip-categorical-${to}`;
      }
      selected.categorical = to;
      store.updateTheme((t) => {
        const [moved] = t.palette.categorical.splice(from, 1);
        t.palette.categorical.splice(to, 0, moved!);
      }, "structure");
    };

    const chips = colors.map((hex, i) => {
      const chip = h("button", {
        type: "button",
        class: "sw",
        style: `--c:${hex}`,
        draggable: isCat,
        "aria-pressed": String(i === sel),
        "aria-label": `Select ${labelOf(kind, i)}, ${hex}`,
        "data-key": `chip-${kind}-${i}`,
        onclick: () => {
          selected[kind] = i;
          chips.forEach((c, j) => c.setAttribute("aria-pressed", String(j === i)));
          renderEditor();
        },
      }, h("span", { class: "sw-n" }, String(i + 1)));
      if (isCat) {
        chip.addEventListener("dragstart", (e) => {
          e.dataTransfer?.setData("text/plain", String(i));
          if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
        });
        chip.addEventListener("dragover", (e) => e.preventDefault());
        chip.addEventListener("drop", (e) => {
          e.preventDefault();
          const from = Number(e.dataTransfer?.getData("text/plain"));
          if (Number.isInteger(from) && from !== i) move(from, i);
        });
      }
      return chip;
    });

    const strip = isCat ? null : h("div", { class: "ramp", "aria-hidden": "true" });
    const paintStrip = (list: readonly string[]) => strip?.style.setProperty("background", `linear-gradient(to right, ${list.join(", ")})`);
    paintStrip(colors);

    const editor = h("div", { class: "color-editor" });
    function renderEditor() {
      const i = selected[kind];
      const hex = (kind === "categorical" ? store.get().theme.palette.categorical : store.get().theme.palette[kind])[i]!;
      const apply = (value: string) => {
        store.updateTheme((t) => setColor(t, kind, i, value));
        chips[i]!.style.setProperty("--c", value);
        chips[i]!.setAttribute("aria-label", `Select ${labelOf(kind, i)}, ${value}`);
        if (kind !== "categorical") paintStrip(store.get().theme.palette[kind]);
      };
      const n = colors.length;
      editor.replaceChildren(
        h("div", { class: "color-editor-head" },
          h("strong", {}, "Selected color"),
          isCat
            ? h("div", { class: "btn-row" },
                h("button", { type: "button", class: "icon-btn", title: "Move earlier", "aria-label": `Move ${labelOf(kind, i)} earlier`, disabled: i === 0, "data-key": "move-earlier", onclick: () => move(i, i - 1, "move-earlier") }, icon("left", 18)),
                h("button", { type: "button", class: "icon-btn", title: "Move later", "aria-label": `Move ${labelOf(kind, i)} later`, disabled: i === n - 1, "data-key": "move-later", onclick: () => move(i, i + 1, "move-later") }, icon("right", 18)))
            : null),
        colorEditor(labelOf(kind, i), hex, apply, { key: keyOf(kind, i) }),
        // Spelled out, and apart from the move arrows, so it can't be mistaken for a "close" button.
        ...(isCat
          ? [h("button", {
              type: "button",
              class: "btn ghost danger remove-color",
              disabled: n === 1,
              "data-key": "remove-color",
              onclick: () => {
                selected.categorical = Math.min(i, n - 2);
                focusKey = `chip-categorical-${selected.categorical}`;
                store.updateTheme((t) => { t.palette.categorical.splice(i, 1); }, "structure");
              },
            }, icon("trash", 16), `Remove ${labelOf(kind, i)} from palette`)]
          : []),
      );
    }
    renderEditor();

    const add = isCat
      ? h("button", {
          type: "button",
          class: "sw sw-add",
          "aria-label": colors.length >= MAX_CATEGORICAL ? `Maximum ${MAX_CATEGORICAL} colors` : "Add color",
          title: colors.length >= MAX_CATEGORICAL ? `Tableau shows at most ${MAX_CATEGORICAL} colors` : "Add color",
          disabled: colors.length >= MAX_CATEGORICAL,
          "data-key": "add-color",
          onclick: () => {
            selected.categorical = colors.length;
            focusKey = `chip-categorical-${colors.length}`;
            store.updateTheme((t) => { t.palette.categorical.push("#888888"); }, "structure");
          },
        }, icon("plus", 18))
      : null;

    return section("Data colors", isCat ? "Drag to reorder" : null,
      segmentedControl(PALETTE_KINDS, () => paletteKind, (k) => { paletteKind = k; render(); }, { label: "Palette type", class: "wide" }),
      h("div", { class: "swatch-grid", role: "group", "aria-label": `${kind} colors` }, ...chips, add),
      strip,
      editor,
      hint(isCat
        ? "Colors apply in order. The first is also Tableau's single mark color."
        : kind === "sequential" ? "Tableau fills in the shades between the two ends." : "Tableau blends each end into the center color."));
  }

  function colorsTab(): Node[] {
    const { theme, mode } = store.get();
    const roles = (group: "status" | "text", items: [string, string][]) =>
      items.map(([key, label]) =>
        colorField(label, (theme[group] as Record<string, string>)[key]!,
          (hex) => store.updateTheme((t) => { (t[group] as Record<string, string>)[key] = hex; }), { key: `${group}-${key}` }));
    return [
      paletteSection(),
      ...(mode === "advanced"
        ? [
            section("Status", "KPI arrows, waterfall, scale", ...roles("status", [["good", "Good"], ["neutral", "Neutral"], ["bad", "Bad"]])),
            section("Text", "Titles, labels, captions", ...roles("text", [["primary", "Primary"], ["secondary", "Secondary"], ["muted", "Muted"]])),
          ]
        : []),
    ];
  }

  // ---- Text -----------------------------------------------------------------------------------

  /** A font picker over one list for both tools, with a line that says which tools the choice works in. */
  function fontField(role: FontRole, key: string, both: boolean) {
    const { theme } = store.get();
    const notice = h("p", { class: "hint font-notice" }, fontNotice(currentFont(theme.fonts, role)).text);
    const field = selectField("Font", ALL_FONTS, currentFont(theme.fonts, role), (v) => {
      store.updateTheme((t) => applyFont(t.fonts, v, both ? "both" : role));
      notice.textContent = fontNotice(v).text;
    }, { key, label: fontLabel });
    return [field, notice];
  }

  function textTab(): Node[] {
    const { theme, tool, mode } = store.get();
    if (mode === "beginner") {
      return [section("Font", "All text",
        ...fontField("body", "font-body", true),
        hint("One font is used for all text, in both tools. Advanced sets titles and sizes separately."))];
    }
    return [
      section("Body", "Labels, axes, tables",
        ...fontField("body", "font-body", false),
        sliderField("Font size", theme.sizes.body, { min: 8, max: 24, unit: "pt", key: "size-body" }, (n) => store.updateTheme((t) => { t.sizes.body = n; }))),
      section("Titles", "Page and visual titles",
        ...fontField("title", "font-title", false),
        sliderField("Font size", theme.sizes.title, { min: 10, max: 36, unit: "pt", key: "size-title" }, (n) => store.updateTheme((t) => { t.sizes.title = n; }))),
      tool === "powerbi"
        ? section("Card values", "Big KPI numbers",
            sliderField("Font size", theme.sizes.callout, { min: 16, max: 72, unit: "pt", key: "size-callout" }, (n) => store.updateTheme((t) => { t.sizes.callout = n; })))
        : null,
    ].filter((x): x is HTMLElement => x !== null);
  }

  // ---- Lines ----------------------------------------------------------------------------------

  function lineSection(id: "gridline" | "zeroline", title: string, aside: string, withWidth: boolean): HTMLElement {
    const line = store.get().theme[id];
    return section(title, aside,
      switchField("Show", line.visible, (v) => store.updateTheme((t) => { t[id].visible = v; })),
      h("div", { class: "field" }, h("span", { class: "label" }, "Style"),
        segmentedControl(LINE_STYLES, () => store.get().theme[id].style, (v) => store.updateTheme((t) => { t[id].style = v as LineStyle; }), { label: `${title} style`, class: "wide" })),
      withWidth ? sliderField("Width", line.width, { min: 1, max: 5, unit: "px", key: `${id}-width` }, (n) => store.updateTheme((t) => { t[id].width = n; })) : null,
      colorField("Color", line.color, (hex) => store.updateTheme((t) => { t[id].color = hex; }), { key: `${id}-color` }));
  }

  function linesTab(): Node[] {
    // Beginner gets gridlines without width, and no zero line.
    return store.get().mode === "advanced"
      ? [lineSection("gridline", "Gridlines", "Behind the data", true), lineSection("zeroline", "Zero line", "Tableau charts", true)]
      : [lineSection("gridline", "Gridlines", "Behind the data", false)];
  }

  // ---- Canvas ---------------------------------------------------------------------------------

  function canvasTab(): Node[] {
    const { theme: { background }, mode, tool } = store.get();
    const show = (key: string) => isAvailable(`bg-${key}`, mode, tool);
    const field = (key: "canvas" | "page" | "container", label: string) =>
      colorField(label, background[key], (hex) => store.updateTheme((t) => { t.background[key] = hex; }), { key: `bg-${key}` });
    return [
      section("Backgrounds", null,
        show("canvas") ? field("canvas", "Canvas (Power BI)") : null,
        show("page") ? field("page", "Page (Power BI)") : null,
        field("container", "Chart area"),
        hint("Chart area is the visual container in Power BI and the view background in Tableau.")),
    ];
  }

  // ---- Shell ----------------------------------------------------------------------------------

  const bodyFor = (id: TabId): Node[] =>
    id === "colors" ? colorsTab() : id === "text" ? textTab() : id === "lines" ? linesTab() : id === "canvas" ? canvasTab() : [a11y];

  const railButtons = new Map<TabId, HTMLButtonElement>();
  const badge = h("span", { class: "rail-badge" });
  const rail = h("nav", { class: "rail", "aria-label": "Settings sections" },
    ...TABS.map((t) => {
      const btn = h("button", {
        type: "button",
        class: "rail-btn",
        "data-tab": t.id,
        "aria-controls": "settings-panel",
        onclick: () => { tab = t.id; render(); },
      }, icon(t.icon, 22), h("span", { class: "rail-label" }, t.label), t.id === "checks" ? badge : null);
      railButtons.set(t.id, btn);
      return btn;
    }));

  function syncRail() {
    railButtons.forEach((btn, id) => btn.setAttribute("aria-pressed", String(id === tab)));
  }
  function syncBadge() {
    const n = analyzeTheme(store.get().theme).findings.length;
    badge.textContent = n > 0 ? String(n) : "";
    badge.hidden = n === 0;
    railButtons.get("checks")?.setAttribute("aria-label", n > 0 ? `Checks, ${n} to review` : "Checks, no problems found");
  }

  function render() {
    const key = focusKey;
    focusKey = null;
    const meta = TABS.find((t) => t.id === tab)!;
    const more = store.get().mode === "beginner" && tab !== "checks"
      ? h("p", { class: "hint more-hint" }, "More settings are in Advanced: text and status colors, font sizes, line widths and the zero line.")
      : null;
    rebuild(panel, () => [
      h("header", { class: "panel-head" }, h("h2", {}, meta.label), hint(meta.blurb)),
      h("div", { class: "panel-body" }, ...bodyFor(tab), more),
    ], key);
    syncRail();
  }

  /** Switches to the right tab, selects the swatch if needed, and moves focus to the control. */
  function reveal(key: string) {
    const { mode, tool } = store.get();
    const target = tabFor(key);
    if (!target || !isAvailable(key, mode, tool)) return;
    tab = target;
    const m = /^(cat|sequential|diverging)-(\d+)$/.exec(key);
    if (m) {
      paletteKind = m[1] === "cat" ? "categorical" : (m[1] as PaletteKind);
      selected[paletteKind] = Number(m[2]);
    }
    focusKey = key;
    render();
    panel.querySelector<HTMLElement>(`[data-key="${CSS.escape(key)}"]`)?.scrollIntoView({ block: "center" });
  }

  store.subscribe((_state, kind) => {
    syncBadge();
    if (kind === "structure") render();
  });
  syncBadge();
  render();
  return { rail, panel, reveal };
}
