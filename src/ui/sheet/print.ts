import type { Theme } from "../../model/theme";
import { h } from "../dom";
import { buildSheetPages } from "./sheetPages";

/**
 * Opens the browser's print dialog on the example sheet. The sheet is built off-screen, then the print
 * stylesheet hides the app and shows only it, so "Save as PDF" produces just the sheet.
 */
export async function printSheet(theme: Theme, slug: string): Promise<void> {
  const { element, annotate } = buildSheetPages(theme);
  const host = h("div", { class: "sheet-host", "aria-hidden": "true" }, element);
  document.body.append(host);

  // The print dialog proposes the page title as the file name.
  const originalTitle = document.title;
  document.title = `${slug}-example-sheet`;
  const cleanUp = () => {
    host.remove();
    document.title = originalTitle;
    window.removeEventListener("afterprint", cleanUp);
  };
  window.addEventListener("afterprint", cleanUp);

  // Markers are placed from measured positions, which shift if a font loads afterwards.
  await document.fonts.ready;
  annotate();
  window.print();
}
