import { describe, expect, it } from "vitest";
import { exportCss } from "../src/export/css";
import { exportPowerBi } from "../src/export/powerbi";
import { playfair, presets } from "../src/presets";
import { buildNotes, buildSheet, noteFamily } from "../src/sheet/buildSheet";

const allSwatches = (theme = playfair) => buildSheet(theme).groups.flatMap((g) => g.swatches);

describe("buildSheet", () => {
  it.each(presets.map((p) => [p.name, p] as const))("%s: every swatch is a valid hex", (_, theme) => {
    for (const s of allSwatches(theme)) expect(s.hex, s.key).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it("lists one data swatch per categorical color, keyed the way the preview keys them", () => {
    const data = buildSheet(playfair).groups.find((g) => g.title === "Data colors")!;
    expect(data.swatches.map((s) => s.key)).toEqual(playfair.palette.categorical.map((_, i) => `cat-${i}`));
    expect(data.swatches.map((s) => s.hex)).toEqual(playfair.palette.categorical);
  });

  it("agrees with the other exports: every sheet hex appears in the CSS file", () => {
    const css = exportCss(playfair).toUpperCase();
    for (const s of allSwatches()) expect(css, s.key).toContain(s.hex.toUpperCase());
  });

  it("agrees with the Power BI file on fonts and sizes", () => {
    const { textClasses } = JSON.parse(exportPowerBi(playfair));
    for (const row of buildSheet(playfair).fonts) {
      expect(textClasses[row.textClass].fontFace, row.textClass).toBe(row.font);
      expect(textClasses[row.textClass].fontSize, row.textClass).toBe(row.size);
    }
  });

  it("lists extra styles only when the theme overrides them, matching the Power BI export", () => {
    const theme = { ...playfair, textStyles: { smallLabel: { font: "Arial", size: 8, weight: "bold" as const } } };
    const data = buildSheet(theme);
    expect(data.fonts.map((f) => f.textClass)).toEqual(["title", "header", "callout", "label", "smallLabel"]);
    const { textClasses } = JSON.parse(exportPowerBi(theme));
    const row = data.fonts.find((f) => f.textClass === "smallLabel")!;
    expect([row.font, row.size, row.weight]).toEqual([textClasses.smallLabel.fontFace, textClasses.smallLabel.fontSize, textClasses.smallLabel.fontWeight]);
  });

  it("measures text against the worse of the two surfaces and thresholds text at 4.5:1, graphics at 3:1", () => {
    const light = { ...playfair, text: { ...playfair.text, muted: "#EEEEEE" } };
    const muted = buildSheet(light).groups.find((g) => g.title === "Text")!.swatches[2]!;
    expect(muted.contrast!.need).toBe(4.5);
    expect(muted.contrast!.meets).toBe(false);
    const data = buildSheet(playfair).groups.find((g) => g.title === "Data colors")!.swatches[0]!;
    expect(data.contrast!.need).toBe(3);
  });

  it("carries the accessibility report and rejects an invalid theme", () => {
    expect(buildSheet(playfair).simulations).toHaveLength(3);
    expect(() => buildSheet({ ...playfair, text: { ...playfair.text, primary: "nope" } })).toThrow(/6-digit hex/);
  });

  it("only mentions Windows-font fallbacks when a Windows font is in use", () => {
    expect(buildSheet(playfair).fontNote).toMatch(/Segoe/);
    const arial = { ...playfair, fonts: { ...playfair.fonts, powerBi: { body: "Arial", title: "Georgia" } } };
    expect(buildSheet(arial).fontNote).toBeNull();
  });

  it("shows the visual border swatch only when the border is visible", () => {
    expect(allSwatches().some((s) => s.key === "border-color")).toBe(false);
    const bordered = { ...playfair, visualBorder: { visible: true, color: "#123456" } };
    expect(allSwatches(bordered).find((s) => s.key === "border-color")?.hex).toBe("#123456");
  });
});

describe("buildNotes", () => {
  it("groups per-point keys into one family", () => {
    expect(noteFamily("cat-3")).toBe("cat");
    expect(noteFamily("diverging-0")).toBe("diverging");
    expect(noteFamily("bg-page")).toBe("bg-page");
  });

  it("collapses data colors into one note listing only the colors used, once each", () => {
    const notes = buildNotes(playfair, ["cat-2", "cat-0", "cat-2", "bg-page"]);
    const data = notes.find((n) => n.family === "cat")!;
    expect(data.hexes).toEqual([playfair.palette.categorical[0], playfair.palette.categorical[2]]);
  });

  it("orders notes the same way regardless of the order keys were seen in", () => {
    const keys = ["font-body", "cat-1", "bg-canvas", "text-muted", "bg-container"];
    const a = buildNotes(playfair, keys).map((n) => n.family);
    const b = buildNotes(playfair, [...keys].reverse()).map((n) => n.family);
    expect(a).toEqual(b);
    expect(a).toEqual(["bg-canvas", "bg-container", "cat", "font-body", "text-muted"]);
  });

  it("describes fonts with their size and drops keys it doesn't know", () => {
    const notes = buildNotes(playfair, ["font-title", "size-callout", "not-a-key"]);
    expect(notes.map((n) => n.detail)).toEqual([`Segoe UI Semibold, 14 pt`, `Segoe UI Semibold, 40 pt`]);
  });
});
