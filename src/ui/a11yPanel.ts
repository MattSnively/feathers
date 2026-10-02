import { analyzeTheme } from "../a11y/analyze";
import { VISION_LABEL } from "../a11y/cvd";
import type { Store } from "../state/store";
import { h } from "./dom";

const chip = (color: string, label: string) =>
  h("span", { class: "chip small", style: `background:${color}`, title: color, role: "img", "aria-label": label });

export function buildA11yPanel(store: Store): HTMLElement {
  const root = h("section", { class: "a11y", "aria-labelledby": "a11y-title" });
  // Persistent live region: only its text changes, and only when the count does, so typing
  // in a color field doesn't make a screen reader announce on every keystroke.
  const summary = h("p", { class: "a11y-summary", role: "status" });
  const body = h("div", {});

  const render = () => {
    const report = analyzeTheme(store.get().theme);
    const n = report.findings.length;
    const text = n === 0 ? "No problems found by these checks." : `${n} thing${n === 1 ? "" : "s"} to check.`;
    if (summary.textContent !== text) summary.textContent = text;

    body.replaceChildren(
      n === 0
        ? h("p", { class: "hint" }, "Colors are distinguishable under the simulations below, and text and marks meet contrast limits.")
        : h("ul", { class: "findings" }, ...report.findings.map((f) =>
            h("li", { class: "finding" },
              h("div", { class: "finding-chips", "aria-hidden": "true" }, ...f.colors.map((c) => chip(c, c))),
              h("div", {}, h("strong", {}, `Check: ${f.title}`), h("p", {}, f.detail))))),
      h("h4", {}, "How your data colors look with color blindness"),
      ...report.simulations.flatMap((s) => [
        h("p", { class: "strip-label" }, VISION_LABEL[s.vision][0]!.toUpperCase() + VISION_LABEL[s.vision].slice(1)),
        h("div", { class: "chips" }, ...s.categorical.map((c, i) => chip(c, `Color ${i + 1} as seen with ${s.vision}: ${c}`))),
      ]),
      h("p", { class: "hint" },
        "These are automated checks: WCAG contrast limits and a simulation of complete color blindness. They help, but they can't certify accessibility. The tritanopia simulation is approximate. Don't rely on color alone: add labels, shapes or patterns."),
    );
  };

  root.append(h("h3", { id: "a11y-title" }, "Accessibility checks"), summary, body);
  store.subscribe(render);
  render();
  return root;
}
