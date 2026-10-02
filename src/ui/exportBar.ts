import { EXPORTS, runExport, type ExportId, type ExportSpec } from "../export/files";
import { tableauPaletteBlocks } from "../export/tableauTps";
import { fillFile, GUIDES, WHICH_FILES } from "../guides/content";
import type { Store } from "../state/store";
import { h, rebuild } from "./dom";
import { copyText, downloadText } from "./download";

export function buildExportBar(store: Store): HTMLElement {
  const root = h("section", { class: "export-bar", "aria-labelledby": "export-title" });
  const status = h("p", { class: "export-status", role: "status" });
  let viewing: ExportId | null = null;
  const openGuides = new Set<ExportId>();

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
            status.textContent = `Downloaded ${result.filename}. The steps to import it are below.`;
            openGuides.add(spec.id);
            render();
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

  const guide = (spec: ExportSpec) => {
    const g = GUIDES[spec.id];
    const filename = runExport(spec, store.get().theme).filename;
    return h(
      "details",
      {
        class: "guide",
        open: openGuides.has(spec.id),
        ontoggle: (e: Event) => {
          if ((e.currentTarget as HTMLDetailsElement).open) openGuides.add(spec.id);
          else openGuides.delete(spec.id);
        },
      },
      h("summary", { "data-key": `${spec.id}-guide` }, g.title),
      h(
        "div",
        { class: "guide-body" },
        h("p", { class: "hint" }, `You need: ${g.requires}`),
        h("ol", {}, ...g.steps.map((step) => h("li", {}, fillFile(step, filename)))),
        h("h4", {}, "Check it worked"),
        h("p", {}, g.verify),
        h("h4", {}, "If something goes wrong"),
        h("dl", {}, ...g.troubleshooting.flatMap((t) => [h("dt", {}, t.problem), h("dd", {}, t.fix)])),
      ),
    );
  };

  function render() {
    const { tool } = store.get();
    // The selected tool's guides come first; sort is stable, so catalog order holds within each group.
    const ordered = [...EXPORTS].sort((a, b) => Number(b.tool === tool) - Number(a.tool === tool));
    rebuild(root, () => [
      h("h2", { id: "export-title" }, "Download your theme"),
      h("p", { class: "hint which-files" }, WHICH_FILES[tool]),
      h("div", { class: "export-cards" }, ...EXPORTS.map(card)),
      status,
      h("h2", { class: "guides-title" }, "How to import"),
      h("div", { class: "guides" }, ...ordered.map(guide)),
    ]);
  }

  store.subscribe(render);
  render();
  return root;
}
