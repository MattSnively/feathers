import { describe, expect, it } from "vitest";
import { exportPowerBi } from "../src/export/powerbi";
import { exportTableauTheme, TABLEAU_MAX_BYTES } from "../src/export/tableauTheme";
import { exportTableauTps } from "../src/export/tableauTps";
import { ThemeError } from "../src/model/validate";
import type { Theme } from "../src/model/theme";
import { playfair } from "./fixtures";
import { validatePowerBi, validateTableau } from "./validators";

const withTheme = (patch: Partial<Theme>): Theme => ({ ...playfair, ...patch });

describe("Power BI export", () => {
  const out = JSON.parse(exportPowerBi(playfair));

  it("validates against schema 2.157", () => {
    expect(validatePowerBi(out), JSON.stringify(validatePowerBi.errors?.slice(0, 3))).toBe(true);
  });

  it("maps the palette, fonts, backgrounds and gridlines", () => {
    expect(out.dataColors).toEqual(playfair.palette.categorical);
    expect(out.textClasses.label.fontFace).toBe("Segoe UI");
    expect(out.visualStyles.page["*"].outspace[0].color.solid.color).toBe("#F3F4EF");
    expect(out.visualStyles["*"]["*"].valueAxis[0].gridlineStyle).toBe("dotted");
    expect(out.visualStyles["*"]["*"].categoryAxis[0].gridlineColor.solid.color).toBe("#DDDAD3");
  });

  it("writes the global visual border, off by default and black when switched on", () => {
    expect(out.visualStyles["*"]["*"].border).toEqual([{ show: false, color: { solid: { color: "#000000" } } }]);
    const on = JSON.parse(exportPowerBi(withTheme({ visualBorder: { visible: true, color: "#000000" } })));
    expect(validatePowerBi(on), JSON.stringify(validatePowerBi.errors?.slice(0, 3))).toBe(true);
    expect(on.visualStyles["*"]["*"].border[0]).toEqual({ show: true, color: { solid: { color: "#000000" } } });
  });
});

describe("Tableau theme export", () => {
  const raw = exportTableauTheme(playfair);
  const out = JSON.parse(raw);

  it("validates against Tableau's published schema", () => {
    expect(validateTableau(out), JSON.stringify(validateTableau.errors?.slice(0, 3))).toBe(true);
  });

  it("uses the first categorical color as the single mark-color", () => {
    expect(out.styles.mark["mark-color"]).toBe("#0A3746");
  });

  it("stays under Tableau's 15 KB limit", () => {
    expect(new TextEncoder().encode(raw).length).toBeLessThan(TABLEAU_MAX_BYTES);
  });

  it("maps fonts, backgrounds and lines", () => {
    expect(out.styles.all["font-family"]).toBe("Tableau Book");
    expect(out.styles.view["background-color"]).toBe("#FFFFFF");
    expect(out.styles.gridline).toEqual({
      "line-visibility": "on",
      "line-pattern": "dotted",
      "line-width": 1,
      "line-color": "#DDDAD3",
    });
  });
});

describe("Tableau tps export", () => {
  const xml = exportTableauTps(playfair);

  it("emits one palette of each type with straight quotes", () => {
    expect(xml).toContain('type="regular"');
    expect(xml).toContain('type="ordered-sequential"');
    expect(xml).toContain('type="ordered-diverging"');
    expect(xml).not.toMatch(/[“”‘’]/);
  });

  it("lists every categorical color in order", () => {
    const regular = xml.split("</color-palette>")[0]!;
    const colors = [...regular.matchAll(/<color>(#[0-9A-Fa-f]{6})<\/color>/g)].map((m) => m[1]);
    expect(colors).toEqual(playfair.palette.categorical);
  });

  it("escapes XML-special characters in palette names", () => {
    const named = exportTableauTps(withTheme({ name: 'R&D "Q3" <draft>' }));
    expect(named).toContain('name="R&amp;D &quot;Q3&quot; &lt;draft&gt;"');
  });
});

// Guards the guards: if these pass, the schema checks above are actually capable of failing.
describe("schema validators have teeth", () => {
  it("Power BI schema rejects an unknown top-level key", () => {
    expect(validatePowerBi({ ...JSON.parse(exportPowerBi(playfair)), bogus: 1 })).toBe(false);
  });

  it("Tableau schema rejects line-width 6 and 8-digit font colors", () => {
    const out = JSON.parse(exportTableauTheme(playfair));
    expect(validateTableau({ ...out, styles: { gridline: { "line-width": 6 } } })).toBe(false);
    expect(validateTableau({ ...out, styles: { all: { "font-color": "#FF000080" } } })).toBe(false);
  });
});

describe("input validation", () => {
  it("rejects hex colors Tableau's schema would refuse", () => {
    const bad = withTheme({ text: { ...playfair.text, primary: "#FFF" } });
    expect(() => exportTableauTheme(bad)).toThrow(ThemeError);
    expect(() => exportPowerBi(bad)).toThrow(ThemeError);
    expect(() => exportTableauTps(bad)).toThrow(ThemeError);
  });

  it("rejects line widths above Tableau's real cap of 5", () => {
    const bad = withTheme({ gridline: { ...playfair.gridline, width: 6 } });
    expect(() => exportTableauTheme(bad)).toThrow(/1 to 5/);
  });

  it("rejects an empty palette", () => {
    const bad = withTheme({ palette: { ...playfair.palette, categorical: [] } });
    expect(() => exportPowerBi(bad)).toThrow(/at least one color/);
  });
});
