import { DESIGN_WIDTH, fitZoom, ZOOM_STEPS } from "../../preview/zoom";
import type { Store } from "../../state/store";
import { h } from "../dom";
import { icon } from "../icons";
import { isAvailable, resolveKey } from "../visibility";
import type { Edit } from "./chart";
import { powerBiPreview } from "./powerbi";
import { tableauPreview } from "./tableau";

const CAPTION: Record<"powerbi" | "tableau", string> = {
  powerbi: "An approximation of a Power BI report. It uses fonts installed on your computer, so Segoe and DIN may look different if they aren't.",
  tableau:
    "An approximation of a Tableau dashboard. Marks use your full palette as if assigned with Edit Colors; the theme file itself only sets one mark color. Tableau's own fonts show as a stand-in unless Tableau is installed.",
};

const STAGE_PADDING = 32;
/** Space kept below the report for its caption and status line. */
const CAPTION_ROOM = 170;
const MIN_FIT = 0.5;
const WIDE = "(min-width: 900px)";

/**
 * The stage: a sample report that redraws with every change and scales to fill the available width.
 * Every themed part jumps to its control when clicked.
 */
export function buildPreview(store: Store, reveal: (key: string) => void): HTMLElement {
  const frame = h("div", { class: "pv-frame" });
  // Persistent live region so jumping to a control is announced even though the report redraws.
  const status = h("p", { class: "pv-status", role: "status" });
  const caption = h("p", { class: "hint pv-caption" });
  const scroller = h("div", { class: "stage-scroll" }, frame, caption, status);
  const root = h("main", { class: "stage", id: "preview", "aria-label": "Preview" });

  let zoomChoice: "fit" | number = "fit";

  const edit: Edit = (el, requested, label) => {
    // Read at call time (the report redraws on every change), so this always reflects the current mode.
    const { mode, tool } = store.get();
    const key = resolveKey(requested, mode);
    // Parts whose control is hidden in this mode stay plain, so Beginner never jumps to something it hides.
    if (!isAvailable(key, mode, tool)) return el;
    el.classList.add("editable");
    el.setAttribute("role", "button");
    el.setAttribute("tabindex", "0");
    el.setAttribute("aria-label", `Edit ${label}`);
    // Native tooltip for sighted mouse users; HTML elements get a title attribute, SVG gets a <title> child.
    if (el instanceof SVGElement) {
      const t = document.createElementNS("http://www.w3.org/2000/svg", "title");
      t.textContent = `Edit ${label}`;
      el.prepend(t);
    } else {
      el.setAttribute("title", `Edit ${label}`);
    }
    const jump = (e: Event) => {
      // Innermost target wins: a bar inside a chart area must not also trigger the area.
      e.stopPropagation();
      status.textContent = `Editing ${label}.`;
      reveal(key);
    };
    el.addEventListener("click", jump);
    el.addEventListener("keydown", (e) => {
      const k = (e as KeyboardEvent).key;
      if (k === "Enter" || k === " ") {
        e.preventDefault();
        jump(e);
      }
    });
    return el;
  };

  // ---- Toolbar --------------------------------------------------------------------------------

  const zoomSelect = h("select", {
    class: "select compact",
    "aria-label": "Zoom",
    onchange: () => {
      zoomChoice = zoomSelect.value === "fit" ? "fit" : Number(zoomSelect.value);
      applyZoom();
    },
  },
    h("option", { value: "fit" }, "Fit"),
    ...ZOOM_STEPS.map((z) => h("option", { value: String(z) }, `${Math.round(z * 100)}%`)));

  const hintsBtn = h("button", {
    type: "button",
    class: "btn ghost",
    "aria-pressed": "false",
    title: "Outline every part you can click",
    onclick: () => {
      const on = !root.classList.contains("hints");
      root.classList.toggle("hints", on);
      hintsBtn.setAttribute("aria-pressed", String(on));
    },
  }, icon("pencil", 16), "Edit hints");

  const toolbar = h("div", { class: "stage-toolbar" }, zoomSelect, hintsBtn);

  /**
   * Scales the report to the stage on wide screens; on narrow ones it reflows at full width instead.
   * "Fit" shows the whole report at once, so it is limited by the stage's height as well as its width.
   */
  function applyZoom() {
    const wide = window.matchMedia(WIDE).matches;
    frame.classList.toggle("fixed", wide);
    if (!wide) {
      frame.style.removeProperty("zoom");
      (zoomSelect.options[0] as HTMLOptionElement).textContent = "Fit";
      return;
    }
    // Measure the report at 100% to learn its natural height.
    frame.style.setProperty("zoom", "1");
    const naturalHeight = frame.offsetHeight;
    const availableHeight = scroller.clientHeight - CAPTION_ROOM;
    const byWidth = fitZoom(scroller.clientWidth - 2 * STAGE_PADDING, DESIGN_WIDTH);
    const byHeight = naturalHeight > 0 ? availableHeight / naturalHeight : byWidth;
    const fit = Math.min(byWidth, Math.max(byHeight, MIN_FIT));
    const z = zoomChoice === "fit" ? fit : zoomChoice;
    frame.style.setProperty("zoom", String(z));
    (zoomSelect.options[0] as HTMLOptionElement).textContent = `Fit (${Math.round(fit * 100)}%)`;
  }

  function render() {
    const { theme, tool } = store.get();
    frame.replaceChildren(tool === "powerbi" ? powerBiPreview(theme, edit) : tableauPreview(theme, edit));
    caption.textContent = CAPTION[tool];
    applyZoom();
  }

  root.append(h("h2", { class: "visually-hidden" }, "Preview"), toolbar, scroller);
  store.subscribe(render);
  render();
  new ResizeObserver(applyZoom).observe(scroller);
  applyZoom();
  return root;
}
