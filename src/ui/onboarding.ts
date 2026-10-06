import { contrastRatio } from "../a11y/color";
import { EXPORTS, slugify } from "../export/files";
import { ALL_FONTS, applyFont, currentFont, fontNotice, fontSupport } from "../model/fonts";
import { parseHexList } from "../model/hexlist";
import { importPowerBiTheme } from "../model/importPowerBi";
import { deriveRamps } from "../model/ramps";
import type { Theme } from "../model/theme";
import { fontStyle } from "../preview/style";
import { DESIGN_WIDTH } from "../preview/zoom";
import { blank } from "../presets/blank";
import { dark2, midnight, okabeIto, playfair, presets, tableau10, tolMuted } from "../presets";
import { COLOR_LINKS } from "./colorLinks";
import { h } from "./dom";
import { icon, logoMark } from "./icons";
import type { Edit } from "./preview/chart";
import { powerBiPreview } from "./preview/powerbi";

const PALETTES = [
  { id: "playfair", title: "Playfair Data", blurb: "Kingfisher blue with an orange feather accent, from the Playfair Data brand.", theme: playfair },
  { id: "okabe", title: "Okabe-Ito", blurb: "Eight colors designed to stay distinct for color-blind viewers.", theme: okabeIto },
  { id: "tol", title: "Paul Tol Muted", blurb: "Nine soft, balanced colors that are also color-blind safe.", theme: tolMuted },
  { id: "tableau10", title: "Tableau 10", blurb: "Tableau's familiar ten-color palette.", theme: tableau10 },
  { id: "dark2", title: "ColorBrewer Dark2", blurb: "Eight saturated colors that read well on white.", theme: dark2 },
  { id: "midnight", title: "Midnight", blurb: "A dark theme on color-blind-safe colors.", theme: midnight },
  { id: "starter", title: "Starter", blurb: "Four clean colors to build your own palette from.", theme: blank },
] as const;

const STEP_COUNT = 3;

const HEADINGS: [string, string][] = [
  ["Customize your colors and fonts before you even start your dashboard.", "Import custom .json and .tps files directly into Tableau or Power BI with Feathers. Your styles made easy."],
  ["Pick a font", "Choose one font. We'll tell you whether it works in Power BI, Tableau or both. You can change it later."],
  ["Name your theme", "This names your downloaded files. You can rename it any time."],
];

/** Fonts that work in both tools: the ones the headline's "fonts" cycles through. */
const SHARED_FONTS = ALL_FONTS.filter((f) => fontSupport(f).powerBi && fontSupport(f).tableau);
const COLOR_CYCLE_MS = 1500;
const FONT_CYCLE_MS = 2100;
const BUTTON_CYCLE_MS = 1800;

/**
 * Calls `apply` with the next value every `ms` until the element leaves the page. Does nothing for people
 * who ask for reduced motion, so the headline just stays as plain text.
 */
function cycle<T>(el: HTMLElement, values: () => readonly T[], ms: number, apply: (value: T) => void): void {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  let i = 0;
  const timer = window.setInterval(() => {
    if (!el.isConnected) return window.clearInterval(timer);
    if (document.hidden) return;
    const list = values();
    if (list.length > 0) apply(list[++i % list.length]!);
  }, ms);
}

/** The first step's headline, with "colors" and "fonts" animated. The text itself never changes. */
function animatedHeadline(title: string, palette: () => readonly string[]): (Node | string)[] {
  const [before, rest] = title.split("colors") as [string, string];
  const [between, after] = rest.split("fonts") as [string, string];
  const colors = h("span", { class: "cycle-colors" }, "colors");
  const fonts = h("span", { class: "cycle-fonts" }, "fonts");
  // Light colors wouldn't read as headline text, so only those with enough contrast on white take part.
  cycle(colors, () => palette().filter((c) => contrastRatio(c, "#FFFFFF") >= 3), COLOR_CYCLE_MS, (c) => colors.style.setProperty("color", c));
  cycle(fonts, () => SHARED_FONTS, FONT_CYCLE_MS, (name) => {
    // Only the family changes; the heading's own weight keeps the word as bold as its neighbours.
    fonts.style.setProperty("font-family", fontStyle(name).family);
  });
  // A hard break after "fonts" keeps the rest of the sentence still while the word changes width. The space
  // before it keeps the words apart for anything that reads the heading as text.
  return [before, colors, between, fonts, " ", h("br"), after.trimStart()];
}

const CONTINUE_LABELS = ["Continue to fonts", "Continue", "Open the editor"];

const sameColors = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((c, i) => c === b[i]);

/** Which palette card (if any) a theme's colors came from, so reopening the flow selects the right one. */
function sourceOf(theme: Theme): string {
  return PALETTES.find((p) => sameColors(p.theme.palette.categorical, theme.palette.categorical))?.id ?? "own";
}

/** Takes a palette's colors and chrome but leaves fonts, sizes and the name alone. */
function applyPalette(draft: Theme, preset: Theme) {
  const p = structuredClone(preset);
  draft.palette = p.palette;
  draft.status = p.status;
  draft.text = p.text;
  draft.background = p.background;
  draft.gridline = p.gridline;
  draft.zeroline = p.zeroline;
}

const noEdit: Edit = (el) => el;

export interface OnboardingHandlers {
  onFinish: (theme: Theme) => void;
  onSkip: () => void;
  skipLabel: string;
}

/**
 * The first-run flow: Colors, Fonts, Start. The example dashboard stays on the left while the choices change on the right. Works on a private draft of the theme and hands it back
 * only when the user launches the editor, so skipping never changes anything.
 */
export function buildOnboarding(initial: Theme, handlers: OnboardingHandlers): { element: HTMLElement; focusStart: () => void } {
  const draft: Theme = structuredClone(initial);
  let source = sourceOf(initial);
  let step = 0;
  // Tracked apart from the theme: picking Tableau's default font leaves the theme looking untouched.
  let chosenFont = currentFont(draft.fonts);
  // Where the name came from decides whether a palette choice may rename the theme: only typed names are sticky.
  // A saved theme with its own name keeps it; only a preset's or the placeholder name follows the palette.
  const generated = new Set<string>([...presets.map((p) => p.name), ...PALETTES.map((p) => p.title), "My theme", "Untitled theme"]);
  let nameSource: "default" | "import" | "typed" = generated.has(initial.name) ? "default" : "typed";

  // ---- Example dashboard ----------------------------------------------------------------------

  const frame = h("div", { class: "ob-pv-frame" });
  const clip = h("div", { class: "ob-pv-clip" }, frame);
  // The report is laid out at a fixed design width and scaled to whatever column it lands in.
  new ResizeObserver(() => {
    if (clip.clientWidth > 0) frame.style.setProperty("zoom", String(clip.clientWidth / DESIGN_WIDTH));
  }).observe(clip);
  const example = h("section", { class: "ob-example", "aria-labelledby": "ob-example-title" },
    h("div", { class: "ob-example-head" }, h("h2", { id: "ob-example-title" }, "Example dashboard"), h("span", {}, "Updates as you choose")),
    // Decorative: the same choices are all available as text on the right.
    h("div", { "aria-hidden": "true" }, clip));

  function renderPreview() {
    // Show the font that was picked even when Power BI itself would fall back, so the choice is always visible.
    const shown = structuredClone(draft);
    shown.fonts.powerBi = { body: chosenFont, title: chosenFont };
    frame.replaceChildren(powerBiPreview(shown, noEdit));
  }
  let queued = false;
  const schedulePreview = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      renderPreview();
    });
  };

  // ---- Step 1: colors -------------------------------------------------------------------------

  function colorsStep(): HTMLElement[] {
    const feedback = h("div", { class: "ob-feedback", role: "status" });
    const say = (kind: "info" | "error", ...lines: string[]) => {
      feedback.className = `ob-feedback${kind === "error" ? " error" : ""}`;
      feedback.replaceChildren(...lines.map((l) => h("p", {}, l)));
    };

    const tilesHost = h("div", { class: "ob-tiles" });
    const own = h("section", { class: "ob-card ob-own", "aria-labelledby": "ob-own-title" });
    const palettes = h("div", { class: "ob-palettes" });

    const check = () => h("span", { class: "ob-check", "aria-hidden": "true" }, icon("check", 16));

    function syncSelection() {
      own.classList.toggle("is-selected", source === "own");
      palettes.querySelectorAll<HTMLButtonElement>("[data-palette]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.palette === source)));
    }
    const setOwn = () => {
      source = "own";
      syncSelection();
      schedulePreview();
    };
    const reramp = () => {
      const r = deriveRamps(draft.palette.categorical);
      draft.palette.sequential = r.sequential;
      draft.palette.diverging = r.diverging;
    };

    function renderTiles() {
      // Balanced rows: one row up to six colors, then as many even rows as needed, never a lone orphan tile.
      const count = draft.palette.categorical.length;
      tilesHost.style.setProperty("--cols", String(count <= 6 ? count : Math.ceil(count / Math.ceil(count / 6))));
      tilesHost.replaceChildren(...draft.palette.categorical.map((hex, i) => {
        const num = h("span", { class: "ob-tile-n" }, String(i + 1));
        const code = h("span", { class: "ob-tile-hex" }, hex);
        const input = h("input", { type: "color", value: hex.toLowerCase(), "aria-label": `Color ${i + 1}, ${hex}. Change` });
        const tile = h("label", { class: "ob-tile" }, num, code, input);
        const paint = (value: string) => {
          tile.style.setProperty("--c", value);
          tile.style.setProperty("--fg", contrastRatio(value, "#FFFFFF") >= 3 ? "#FFFFFF" : "#0F1218");
          code.textContent = value;
          input.setAttribute("aria-label", `Color ${i + 1}, ${value}. Change`);
        };
        paint(hex);
        input.addEventListener("input", () => {
          const value = input.value.toUpperCase();
          draft.palette.categorical[i] = value;
          reramp();
          paint(value);
          setOwn();
        });
        return tile;
      }));
    }

    const paste = h("input", {
      type: "text",
      class: "ob-paste",
      placeholder: "Paste hex codes, e.g. #0045E5 #FFB81C",
      "aria-label": "Paste hex codes",
      autocomplete: "off",
      spellcheck: false,
      oninput: () => {
        if (paste.value.trim() === "") return say("info");
        const { colors, ignored } = parseHexList(paste.value);
        if (colors.length === 0) return say("error", "No hex colors found. Try something like #0045E5.");
        draft.palette.categorical = colors;
        reramp();
        renderTiles();
        setOwn();
        say("info", `Using ${colors.length} color${colors.length === 1 ? "" : "s"}.${ignored.length ? ` Skipped: ${ignored.slice(0, 4).join(", ")}${ignored.length > 4 ? "…" : ""}.` : ""}`);
      },
    });

    const file = h("input", {
      type: "file",
      accept: ".json,application/json",
      class: "visually-hidden",
      tabIndex: -1,
      "aria-label": "Power BI theme file",
      onchange: async () => {
        const f = file.files?.[0];
        if (!f) return;
        const result = importPowerBiTheme(await f.text(), draft);
        file.value = "";
        if (!result.ok) return say("error", result.error);
        Object.assign(draft, structuredClone(result.theme));
        chosenFont = currentFont(draft.fonts);
        nameSource = "import";
        paste.value = "";
        renderTiles();
        setOwn();
        say("info", `Imported "${result.theme.name}": ${result.applied.join(", ")}.`, ...result.notes);
      },
    });
    const importBtn = h("button", { type: "button", class: "btn big", onclick: () => file.click() }, icon("upload", 18), "Import a Power BI theme");

    own.append(
      h("div", { class: "ob-card-head" }, h("h2", { id: "ob-own-title" }, "Your own colors"), check()),
      h("p", { class: "ob-card-text" }, "Click a color to change it, paste your hex codes, or take them from a Power BI theme."),
      tilesHost,
      h("div", { class: "ob-paste-row" }, paste, importBtn, file),
      feedback,
    );

    palettes.append(...PALETTES.map((p) =>
      h("button", {
        type: "button",
        class: "ob-card ob-palette",
        "data-palette": p.id,
        "aria-pressed": String(source === p.id),
        onclick: () => {
          applyPalette(draft, p.theme);
          source = p.id;
          if (nameSource === "import") nameSource = "default";
          paste.value = "";
          say("info");
          renderTiles();
          syncSelection();
          schedulePreview();
        },
      },
      h("div", { class: "ob-strip", "aria-hidden": "true" }, ...p.theme.palette.categorical.map((c) => h("span", { style: `background:${c}` }))),
      h("div", { class: "ob-card-foot" }, h("div", {}, h("strong", {}, p.title), h("p", {}, p.blurb)), check()))));

    renderTiles();
    syncSelection();
    const learn = h("ul", { class: "ob-links" }, ...COLOR_LINKS.map((l) =>
      h("li", {}, h("a", { href: l.href, target: "_blank", rel: "noopener noreferrer" }, l.title, h("span", { class: "sr-only" }, " (opens in a new tab)")), h("span", {}, l.blurb))));
    return [own, h("h2", { class: "ob-sub" }, "Or start from a palette"), palettes, h("h2", { class: "ob-sub" }, "Learn more about color"), learn];
  }

  // ---- Step 2: fonts --------------------------------------------------------------------------

  function fontsStep(): HTMLElement[] {
    // The box is sized for the longest message, so picking a font never moves the grid below it. A hidden copy
    // of that message shares the same grid cell as the live text.
    const longest = ALL_FONTS.map((f) => fontNotice(f).text).reduce((a, b) => (b.length > a.length ? b : a));
    const live = h("span", { class: "ob-font-notice-live" });
    const notice = h("p", { class: "ob-font-notice", role: "status" },
      live, h("span", { class: "ob-font-notice-live ghost", "aria-hidden": "true" }, longest));
    const showNotice = (name: string) => {
      const n = fontNotice(name);
      notice.className = `ob-font-notice ${n.kind}`;
      live.replaceChildren(icon(n.kind === "both" ? "check" : "info", 18), n.text);
    };
    const buttons = ALL_FONTS.map((name) => {
      const st = fontStyle(name);
      const { powerBi, tableau } = fontSupport(name);
      const b = h("button", {
        type: "button",
        class: `ob-font ${powerBi && tableau ? "both" : powerBi ? "powerbi" : "tableau"}`,
        "aria-pressed": String(chosenFont === name),
        style: `font-family:${st.family};font-weight:${st.weight}`,
        onclick: () => {
          applyFont(draft.fonts, name);
          chosenFont = name;
          buttons.forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
          showNotice(name);
          schedulePreview();
        },
      },
      h("span", { class: "ob-font-aa" }, "Aa"),
      h("span", { class: "ob-font-name" }, name),
      h("span", { class: "ob-font-tools" }, powerBi && tableau ? "Power BI + Tableau" : powerBi ? "Power BI only" : "Tableau only"));
      return b;
    });
    showNotice(chosenFont);
    // The card edges carry the same information as the tag text, so color is never the only signal.
    const key = h("div", { class: "ob-font-key", "aria-hidden": "true" },
      h("span", { class: "powerbi" }, "Power BI"), h("span", { class: "tableau" }, "Tableau"), h("span", { class: "both" }, "Both tools"));
    return [
      notice,
      key,
      h("div", { class: "ob-fonts" }, ...buttons),
      h("p", { class: "ob-note" }, "Fonts show as installed on your computer. Tableau's own fonts appear as a stand-in unless Tableau is installed."),
    ];
  }

  // ---- Step 3: name and launch ----------------------------------------------------------------

  function startStep(): HTMLElement[] {
    if (nameSource === "default") draft.name = source === "own" ? "My theme" : PALETTES.find((p) => p.id === source)!.title;
    const files = h("div", { class: "ob-files" });
    const renderFiles = () => {
      const slug = slugify(draft.name);
      files.replaceChildren(...EXPORTS.map((spec) => h("div", {}, h("span", {}, spec.label), h("code", {}, spec.filename(slug)))));
    };
    const name = h("input", {
      id: "ob-name",
      type: "text",
      class: "ob-name",
      maxLength: 60,
      value: draft.name,
      placeholder: "Untitled theme",
      "aria-label": "Theme name",
      oninput: () => {
        nameSource = "typed";
        draft.name = name.value;
        renderFiles();
      },
      onkeydown: (e: KeyboardEvent) => {
        if (e.key === "Enter") finish();
      },
    });
    renderFiles();
    const n = draft.palette.categorical.length;
    return [
      name,
      h("p", { class: "ob-note" }, `${n} color${n === 1 ? "" : "s"} · ${draft.fonts.powerBi.body} in Power BI · ${draft.fonts.tableau.body} in Tableau`),
      h("h2", { class: "ob-sub" }, "You'll get these files"),
      files,
    ];
  }

  function finish() {
    if (draft.name.trim() === "") draft.name = "Untitled theme";
    handlers.onFinish(draft);
  }

  // ---- Shell ----------------------------------------------------------------------------------

  const copy = h("div", { class: "ob-copy" });
  const content = h("div", { class: "ob-content" });

  function go(next: number) {
    step = next;
    const [title, lead] = HEADINGS[step]!;
    const heading = h("h1", { tabIndex: -1 }, ...(step === 0 ? animatedHeadline(title, () => draft.palette.categorical) : [title]));
    const last = step === STEP_COUNT - 1;
    const forward = h("button", { type: "button", class: "btn primary big", onclick: last ? finish : () => go(step + 1) }, CONTINUE_LABELS[step]!, last ? null : icon("right", 18));
    // The first step's button cycles through the palette too; only colors that keep its white label readable take part.
    if (step === 0) {
      forward.classList.add("cycle-btn");
      cycle(forward, () => draft.palette.categorical.filter((c) => contrastRatio(c, "#FFFFFF") >= 4.5), BUTTON_CYCLE_MS, (c) => {
        forward.style.setProperty("background", c);
        forward.style.setProperty("border-color", c);
      });
    }
    // The way forward sits right under the header so it can't be missed below a long list of choices.
    copy.replaceChildren(
      heading,
      h("p", { class: "ob-lead" }, lead),
      h("div", { class: "ob-actions" },
        forward,
        step > 0 ? h("button", { type: "button", class: "btn big", onclick: () => go(step - 1) }, "Back") : null));
    content.replaceChildren(...(step === 0 ? colorsStep() : step === 1 ? fontsStep() : startStep()));
    heading.focus({ preventScroll: true });
    renderPreview();
    document.querySelector(".onboard")?.scrollTo({ top: 0 });
  }

  const element = h("div", { class: "onboard", role: "region", "aria-label": "Get started" },
    h("header", { class: "ob-head" },
      h("div", { class: "brand" }, logoMark(44), h("span", { class: "brand-name" }, "Feathers")),
      h("button", { type: "button", class: "ob-skip", onclick: handlers.onSkip }, handlers.skipLabel)),
    h("div", { class: "ob-body" }, h("div", { class: "ob-left" }, copy, example), content));

  return {
    element,
    focusStart: () => go(0),
  };
}
