import { EXPORTS, runExport, slugify, type ExportId } from "../../export/files";
import { changedLines } from "../../export/lineDiff";
import type { Store } from "../../state/store";
import { h } from "../dom";
import { copyText } from "../download";

/**
 * A live view of the files being generated. It sits beside the preview and redraws on every edit,
 * marking the lines that just changed so a click or slider move can be traced to the exact output.
 */
export function buildCodePanel(store: Store): { element: HTMLElement; setOpen: (open: boolean) => void } {
  const tabs = h("div", { class: "code-tabs", role: "tablist", "aria-label": "File" });
  const meta = h("span", { class: "code-meta" });
  const status = h("span", { class: "code-status", role: "status" });
  const body = h("div", { class: "code-body", tabIndex: 0, role: "region", "aria-label": "File contents" });
  const copyBtn = h("button", { type: "button", class: "btn ghost", onclick: copy }, "Copy");
  const element = h("aside", { class: "code-panel", "aria-label": "Generated file", hidden: true },
    h("div", { class: "code-head" }, tabs, copyBtn),
    body,
    h("div", { class: "code-foot" }, meta, status));

  let open = false;
  let selected: ExportId | null = null;
  // The last text shown per file, so only genuine edits are highlighted (not a tab or tool switch).
  const previous = new Map<ExportId, string>();
  let current = "";

  async function copy() {
    status.textContent = (await copyText(current)) ? "Copied." : "Couldn't copy automatically; select the text instead.";
  }

  function render() {
    if (!open) return;
    const { theme, tool } = store.get();
    const specs = EXPORTS.filter((s) => s.tool === tool);
    if (!selected || !specs.some((s) => s.id === selected)) selected = specs[0]!.id;
    const spec = specs.find((s) => s.id === selected)!;
    const result = runExport(spec, theme);

    tabs.replaceChildren(...specs.map((s) => h("button", {
      type: "button",
      role: "tab",
      class: "code-tab",
      "aria-selected": String(s.id === selected),
      onclick: () => {
        selected = s.id;
        status.textContent = "";
        render();
      },
    }, s.filename(slugify(theme.name)))));

    if (!result.ok) {
      current = "";
      copyBtn.disabled = true;
      body.replaceChildren(h("p", { class: "error", role: "alert" }, result.error));
      meta.textContent = "";
      return;
    }
    copyBtn.disabled = false;
    current = result.content;
    const lines = current.split("\n");
    const before = previous.get(spec.id);
    const changed = before === undefined ? new Set<number>() : changedLines(before, current);
    previous.set(spec.id, current);

    body.replaceChildren(...lines.map((text, i) => h("div", { class: `code-line${changed.has(i) ? " changed" : ""}` }, h("span", { class: "code-no" }, String(i + 1)), h("span", { class: "code-text" }, text || " "))));
    // Bring the edit into view without yanking the view when it's already visible.
    body.querySelector(".changed")?.scrollIntoView({ block: "nearest" });
    const bytes = new TextEncoder().encode(current).length;
    meta.textContent = `${lines.length} lines · ${(bytes / 1024).toFixed(1)} KB`;
  }

  store.subscribe(render);
  return {
    element,
    setOpen(value) {
      open = value;
      element.hidden = !value;
      // Start fresh each time it opens so stale highlights don't greet the user.
      previous.clear();
      status.textContent = "";
      render();
    },
  };
}
