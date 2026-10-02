import type { Store } from "../../state/store";
import { h } from "../dom";
import { isAvailable, resolveKey } from "../visibility";
import type { Edit } from "./chart";
import { powerBiPreview } from "./powerbi";
import { tableauPreview } from "./tableau";

const CAPTION: Record<"powerbi" | "tableau", string> = {
  powerbi: "An approximation of a Power BI report. It uses fonts installed on your computer, so Segoe and DIN may look different if they aren't.",
  tableau:
    "An approximation of a Tableau dashboard. Marks use your full palette as if assigned with Edit Colors; the theme file itself only sets one mark color. Tableau's own fonts show as a stand-in unless Tableau is installed.",
};

/** Sample report that redraws with every change; every themed part jumps to its control when clicked. */
export function buildPreview(store: Store, reveal: (key: string) => void): HTMLElement {
  const root = h("div", { class: "report-preview" });
  // Persistent live region so jumping to a control is announced even though the preview redraws.
  const status = h("p", { class: "pv-status", role: "status" });

  const edit: Edit = (el, requested, label) => {
    // Read at call time (the preview redraws on every change), so this always reflects the current mode.
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

  const render = () => {
    const { theme, tool, mode } = store.get();
    root.replaceChildren(
      h("h3", {}, tool === "powerbi" ? "Power BI preview" : "Tableau preview"),
      h("p", { class: "hint" }, mode === "beginner"
        ? "Click a part, or tab to it and press Enter, to jump to its setting. Switch to Advanced to edit more parts."
        : "Click any part, or tab to it and press Enter, to jump to its setting."),
      tool === "powerbi" ? powerBiPreview(theme, edit) : tableauPreview(theme, edit),
      h("p", { class: "hint" }, CAPTION[tool]),
      status,
    );
  };

  store.subscribe(render);
  render();
  return root;
}
