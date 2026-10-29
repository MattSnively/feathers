import { describe, expect, it } from "vitest";
import { exportPowerBi } from "../src/export/powerbi";
import { exportTableauTheme } from "../src/export/tableauTheme";
import { resolveTextStyle, TEXT_STYLES } from "../src/model/textStyles";
import type { Theme } from "../src/model/theme";
import { ThemeError, validateTheme } from "../src/model/validate";
import { playfair } from "./fixtures";
import { validatePowerBi } from "./validators";

const withStyles = (textStyles: Theme["textStyles"]): Theme => ({ ...playfair, textStyles });

describe("per-style Power BI text", () => {
  it("lists the 14 schema classes", () => {
    expect(TEXT_STYLES).toHaveLength(14);
    expect(new Set(TEXT_STYLES.map((s) => s.id)).size).toBe(14);
  });

  it("writes only the four core classes when nothing is overridden", () => {
    const out = JSON.parse(exportPowerBi(playfair));
    expect(Object.keys(out.textClasses).sort()).toEqual(["callout", "header", "label", "title"]);
    expect(JSON.parse(exportPowerBi(withStyles({}))).textClasses).toEqual(out.textClasses);
  });

  it("applies overrides to a core class and writes extra classes only when overridden", () => {
    const out = JSON.parse(exportPowerBi(withStyles({
      label: { size: 11, weight: "bold" },
      smallLabel: { font: "Arial", size: 8 },
    })));
    expect(out.textClasses.label).toMatchObject({ fontFace: playfair.fonts.powerBi.body, fontSize: 11, fontWeight: "bold" });
    expect(out.textClasses.smallLabel).toMatchObject({ fontFace: "Arial", fontSize: 8 });
    expect(out.textClasses.smallLabel).not.toHaveProperty("fontWeight");
    expect(out.textClasses.boldLabel).toBeUndefined();
  });

  it("fills an override's missing fields from body or title", () => {
    const r = resolveTextStyle(withStyles({ largeTitle: { weight: "bold" } }), "largeTitle");
    expect(r).toEqual({ font: playfair.fonts.powerBi.title, size: playfair.sizes.title, weight: "bold" });
  });

  it("passes the Power BI schema with every class overridden", () => {
    const all = Object.fromEntries(TEXT_STYLES.map((s) => [s.id, { size: 12, weight: "bold" as const }]));
    const out = JSON.parse(exportPowerBi(withStyles(all)));
    expect(Object.keys(out.textClasses)).toHaveLength(14);
    expect(validatePowerBi(out), JSON.stringify(validatePowerBi.errors?.slice(0, 3))).toBe(true);
  });

  it("leaves the Tableau export alone", () => {
    expect(exportTableauTheme(withStyles({ label: { size: 20 } }))).toBe(exportTableauTheme(playfair));
  });

  it("rejects unknown styles, fonts, sizes and weights", () => {
    const bad = (s: unknown) => () => validateTheme(withStyles(s as Theme["textStyles"]));
    expect(bad({ nope: {} })).toThrow(ThemeError);
    expect(bad({ label: { font: "Tableau Book" } })).toThrow(/Power BI font/);
    expect(bad({ label: { size: 2 } })).toThrow(/size/);
    expect(bad({ label: { size: 10.5 } })).toThrow(/size/);
    expect(bad({ label: { weight: "heavy" } })).toThrow(/weight/);
  });
});
