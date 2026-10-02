import { EXPORTS, runExport, type ExportId, type ExportSpec } from "../export/files";
import { tableauPaletteBlocks } from "../export/tableauTps";
import type { Store } from "../state/store";
import { h, rebuild } from "./dom";
import { copyText, downloadText } from "./download";

export function buildExportBar(store: Store): HTMLElement {
  const root = h("section", { class: "export-bar", "aria-labelledby": "export-title" });
  const status = h("p", { class: "export-status", role: "status" });
  let viewing: ExportId | null = null;

  const card = (spec: ExportSpec) => {
    const { theme, tool } = store.get();
    const result = runExport(spec, theme);
    const active = spec.tool === tool;

    const copyXml = async () => {
      const ok = await copyText(tableauPaletteBlocks(theme));
      status.textContent = ok
        ? "Copied the palette XML. Paste it between <preferences> and </preferences> in your Preferences.tps."
        : "Couldn't copy automatically. Use View file and copy the XML by hand.";
    };

    return h(
      "article",
      { class: `export-card${active ? " active" : ""}` },
      h("h3", {}, spec.label, active ? h("span", { class: "badge" }, "Your tool") : null),
      h("p", { class: "hint" }, spec.hint),
      h("p", { class: "filename" }, result.filename),
      result.ok ? null : h("p", { class: "error", role: "alert" }, result.error),
      h(
        "div",
        { class: "actions" },
        h("button", {
          type: "button",
          class: "primary",
          disabled: !result.ok,
          "data-key": `${spec.id}-download`,
          onclick: () => {
            if (!result.ok) return;
            downloadText(result.filename, result.content, spec.mime);
            status.textContent = `Downloaded ${result.filename}.`;
          },
        }, "Download"),
        spec.id === "tableau-tps"
          ? h("button", { type: "button", class: "secondary", disabled: !result.ok, "data-key": `${spec.id}-copy`, onclick: copyXml }, "Copy XML")
          : null,
        h("button", {
          type: "button",
          class: "secondary",
          disabled: !result.ok,
          "aria-expanded": String(viewing === spec.id),
          "data-key": `${spec.id}-view`,
          onclick: () => { viewing = viewing === spec.id ? null : spec.id; render(); },
        }, viewing === spec.id ? "Hide file" : "View file"),
      ),
      viewing === spec.id && result.ok ? h("pre", { class: "code", tabIndex: 0 }, result.content) : null,
    );
  };

  function render() {
    rebuild(root, () => [
      h("h2", { id: "export-title" }, "Download your theme"),
      h("div", { class: "export-cards" }, ...EXPORTS.map(card)),
      status,
    ]);
  }

  store.subscribe(render);
  render();
  return root;
}
