import type { Theme } from "../../model/theme";
import { DESIGN_WIDTH } from "../../preview/zoom";
import { buildNotes, noteFamily } from "../../sheet/buildSheet";
import { h } from "../dom";
import type { Edit } from "../preview/chart";
import { powerBiPreview } from "../preview/powerbi";

/** Width of a sheet page's content: a landscape page with half-inch margins, at 96 px per inch. */
export const SHEET_WIDTH = 960;
/** Tallest the dashboard may be, so its heading and the dashboard share one page. */
const MAX_DASHBOARD_HEIGHT = 600;
const MARKER_SIZE = 20;

/**
 * The sample Power BI dashboard with numbered markers on the parts the theme controls, and a legend that
 * says what each number sets. The markers come from the preview's own `edit` hooks, so they can't drift
 * from the preview. Call `annotate` once the page is in the document, because placing a marker needs layout.
 */
export function dashboardPage(theme: Theme, head: HTMLElement, keyHead: HTMLElement): { elements: HTMLElement[]; annotate: () => void } {
  const keys: string[] = [];
  const firstOfFamily = new Map<string, Element>();
  // Same shape as the preview's click-to-edit hook, but it only records which part uses which setting.
  const record: Edit = (el, key) => {
    keys.push(key);
    const family = noteFamily(key);
    if (!firstOfFamily.has(family)) firstOfFamily.set(family, el);
    return el;
  };

  const frame = h("div", { class: "pv-frame fixed sheet-frame" }, powerBiPreview(theme, record, "overview"));
  const box = h("div", { class: "sheet-dash" }, frame);
  const notes = buildNotes(theme, keys);

  const legend = h("ol", { class: "sheet-legend" }, ...notes.map((n) =>
    h("li", {},
      h("span", { class: "sheet-marker static" }, String(notes.indexOf(n) + 1)),
      h("div", {},
        h("strong", {}, n.label),
        n.hexes.length > 0
          ? h("div", { class: "sheet-legend-colors" }, ...n.hexes.map((hex) =>
              h("span", { class: "sheet-legend-color" }, h("span", { class: "sheet-chip small", style: `background:${hex}` }), h("code", {}, hex.toUpperCase()))))
          : null,
        n.detail ? h("div", { class: "sheet-legend-detail" }, n.detail) : null))));

  // The key gets its own page: the dashboard needs nearly a full page to stay readable.
  const elements = [
    h("section", { class: "sheet-page" },
      head,
      h("p", { class: "sheet-lede" }, "Where each color and font in this theme shows up on a report page. The numbers are explained on the next page."),
      box),
    h("section", { class: "sheet-page" }, keyHead, h("h2", {}, "What each number sets"), legend),
  ];

  function annotate() {
    // Shrink the 1100px-wide dashboard to the page, and further if it would be too tall for one page.
    const k = Math.min(SHEET_WIDTH / DESIGN_WIDTH, MAX_DASHBOARD_HEIGHT / frame.offsetHeight);
    frame.style.transform = `scale(${k})`;
    box.style.width = `${DESIGN_WIDTH * k}px`;
    box.style.height = `${frame.offsetHeight * k}px`;

    const base = frame.getBoundingClientRect();
    const placed: { x: number; y: number }[] = [];
    notes.forEach((note, i) => {
      const el = firstOfFamily.get(note.family);
      if (!el) return;
      const r = el.getBoundingClientRect();
      // Just outside the part's top-left corner, so it doesn't cover the text it points at. Lines are flat, so
      // those get the marker above their right end instead of covering the axis label at the left.
      const flat = r.height < 4;
      let x = Math.max(2, ((flat ? r.right : r.left) - base.left) / k - MARKER_SIZE);
      let y = Math.max(2, (r.top - base.top) / k - MARKER_SIZE);
      // Several settings can share a corner (canvas, page, first card). Try the empty margin to the left and the
      // gap above first, because stepping right lands on the text the marker is meant to point at.
      const step = MARKER_SIZE + 4;
      const clear = (cx: number, cy: number) => !placed.some((p) => Math.abs(p.x - cx) < MARKER_SIZE + 2 && Math.abs(p.y - cy) < MARKER_SIZE + 2);
      const spot = [[0, 0], [-step, 0], [0, -step], [-2 * step, 0], [-step, -step], [step, 0], [2 * step, 0], [3 * step, 0]]
        .map(([dx, dy]) => ({ x: x + dx!, y: y + dy! }))
        .find((c) => c.x >= 2 && c.y >= 2 && clear(c.x, c.y)) ?? { x, y };
      x = spot.x;
      y = spot.y;
      placed.push({ x, y });
      frame.append(h("span", { class: "sheet-marker", style: `left:${x}px;top:${y}px` }, String(i + 1)));
    });
  }

  return { elements, annotate };
}
