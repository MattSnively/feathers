import { describe, expect, it } from "vitest";
import { exportPowerBi } from "../src/export/powerbi";
import { exportTableauTheme } from "../src/export/tableauTheme";
import { exportTableauTps } from "../src/export/tableauTps";
import { POWER_BI_FONTS, TABLEAU_FONTS } from "../src/model/fonts";
import { presets } from "../src/presets";
import { validatePowerBi, validateTableau } from "./validators";

describe.each(presets.map((p) => [p.name, p] as const))("preset: %s", (_name, theme) => {
  it("exports a Power BI theme that validates against schema 2.157", () => {
    const out = JSON.parse(exportPowerBi(theme));
    expect(validatePowerBi(out), JSON.stringify(validatePowerBi.errors?.slice(0, 3))).toBe(true);
  });

  it("exports a Tableau theme that validates against Tableau's schema", () => {
    const out = JSON.parse(exportTableauTheme(theme));
    expect(validateTableau(out), JSON.stringify(validateTableau.errors?.slice(0, 3))).toBe(true);
  });

  it("exports .tps XML with three balanced palettes of valid colors", () => {
    const xml = exportTableauTps(theme);
    expect(xml.match(/<color-palette /g)).toHaveLength(3);
    expect(xml.match(/<\/color-palette>/g)).toHaveLength(3);
    const colors = [...xml.matchAll(/<color>([^<]*)<\/color>/g)].map((m) => m[1]);
    expect(colors.length).toBe(theme.palette.categorical.length + 2 + 3);
    for (const c of colors) expect(c).toMatch(/^#[0-9A-F]{6}$/);
  });

  it("only uses fonts from the curated per-tool lists", () => {
    const { powerBi, tableau } = theme.fonts;
    expect(POWER_BI_FONTS).toContain(powerBi.body);
    expect(POWER_BI_FONTS).toContain(powerBi.title);
    expect(TABLEAU_FONTS).toContain(tableau.body);
    expect(TABLEAU_FONTS).toContain(tableau.title);
  });
});

describe("preset catalog", () => {
  it("has the agreed presets with their published color counts", () => {
    expect(presets.map((p) => p.palette.categorical.length)).toEqual([8, 8, 9, 10, 8, 7]);
  });

  it("uses uppercase 6-digit hex so palettes diff cleanly", () => {
    for (const p of presets) {
      for (const c of p.palette.categorical) expect(c).toMatch(/^#[0-9A-F]{6}$/);
    }
  });
});
