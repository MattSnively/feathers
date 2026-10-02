import { describe, expect, it } from "vitest";
import { analyzeTheme, MIN_DISTINCT } from "../src/a11y/analyze";
import { colorDifference, contrastRatio, deltaE2000, luminance } from "../src/a11y/color";
import { simulate, VISIONS } from "../src/a11y/cvd";
import type { Theme } from "../src/model/theme";
import { okabeIto, playfair, tolMuted } from "../src/presets";

describe("color math", () => {
  it("matches published CIEDE2000 test pairs (Sharma, Wu & Dalal 2005)", () => {
    expect(deltaE2000([50, 2.6772, -79.7751], [50, 0, -82.7485])).toBeCloseTo(2.0425, 4);
    expect(deltaE2000([50, 2.5, 0], [50, 3.1736, 0.5854])).toBeCloseTo(1.0, 4);
  });

  it("is zero for identical colors and symmetric", () => {
    expect(colorDifference("#0A3746", "#0A3746")).toBeCloseTo(0, 6);
    expect(colorDifference("#0A3746", "#F99A2B")).toBeCloseTo(colorDifference("#F99A2B", "#0A3746"), 6);
  });

  it("computes WCAG contrast against known values", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 5);
    expect(contrastRatio("#FFFFFF", "#FFFFFF")).toBeCloseTo(1, 5);
    // #767676 is the lightest gray that passes AA on white; #777777 just misses.
    expect(contrastRatio("#767676", "#FFFFFF")).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio("#777777", "#FFFFFF")).toBeLessThan(4.5);
    expect(luminance("#FFFFFF")).toBeCloseTo(1, 5);
  });
});

describe("colorblind simulation", () => {
  it.each(VISIONS)("leaves grays, white and black unchanged under %s", (vision) => {
    // Rows of each matrix sum to 1, so achromatic colors must not shift.
    for (const gray of ["#000000", "#808080", "#FFFFFF", "#4D4D4D"]) {
      const out = simulate(gray, vision);
      for (let i = 1; i <= 5; i += 2) {
        expect(Math.abs(parseInt(out.slice(i, i + 2), 16) - parseInt(gray.slice(i, i + 2), 16))).toBeLessThanOrEqual(1);
      }
    }
  });

  it("turns pure red dark and olive for protanopia", () => {
    // Regression anchor: pure red loses most of its brightness and reads as dark yellow-brown.
    const out = simulate("#FF0000", "protanopia");
    expect(luminance(out)).toBeLessThan(0.15);
    expect(parseInt(out.slice(1, 3), 16)).toBeGreaterThan(parseInt(out.slice(5, 7), 16));
  });

  it("always returns a valid hex color, even for saturated inputs", () => {
    for (const c of ["#FF0000", "#00FF00", "#0000FF", "#FF00FF", "#00FFFF"]) {
      for (const v of VISIONS) expect(simulate(c, v)).toMatch(/^#[0-9A-F]{6}$/);
    }
  });
});

describe("theme analysis on the shipped presets", () => {
  const ids = (t: Theme) => analyzeTheme(t).findings.map((f) => f.id);

  it("flags Playfair's real problems", () => {
    const found = ids(playfair);
    // Brand red and green collapse for people without red cones.
    expect(found).toContain("similar-Status colors-protanopia");
    // Blue Wing and Dark Blue Wing are near-identical even with typical vision.
    expect(found).toContain("similar-Data colors-normal");
    // Muted text (#9C8F82) on white is about 3.2:1.
    expect(found).toContain("text-contrast-muted");
    // Orange Feather and Dark Yellow are faint on a white chart area.
    expect(found).toContain("graphic-contrast");
  });

  it.each([okabeIto, tolMuted])("finds no color-confusion problems in $name", (theme) => {
    expect(ids(theme).filter((id) => id.startsWith("similar-"))).toEqual([]);
  });

  it("reports faint data colors on the accessible presets rather than hiding them", () => {
    expect(ids(okabeIto)).toContain("graphic-contrast");
    const detail = analyzeTheme(okabeIto).findings.find((f) => f.id === "graphic-contrast")!.detail;
    expect(detail).toContain("color 4"); // yellow #F0E442 on white is ~1.3:1
  });

  it("passes a well-separated, high-contrast theme with no findings", () => {
    const clean: Theme = {
      ...okabeIto,
      palette: { ...okabeIto.palette, categorical: ["#000000", "#0072B2", "#D55E00"] },
      status: { good: "#0072B2", neutral: "#767676", bad: "#D55E00" },
    };
    expect(analyzeTheme(clean).findings).toEqual([]);
  });

  it("returns one simulation per vision type, one color per data color", () => {
    const { simulations } = analyzeTheme(playfair);
    expect(simulations.map((s) => s.vision)).toEqual([...VISIONS]);
    for (const s of simulations) expect(s.categorical).toHaveLength(playfair.palette.categorical.length);
  });
});

describe("analysis behavior", () => {
  const withColors = (categorical: string[]): Theme => ({ ...okabeIto, palette: { ...okabeIto.palette, categorical } });

  it("reports a near-identical pair once, not again under every vision type", () => {
    const found = analyzeTheme(withColors(["#0072B2", "#0072B3", "#D55E00"])).findings.filter((f) => f.id.startsWith("similar-Data"));
    expect(found.map((f) => f.id)).toEqual(["similar-Data colors-normal"]);
  });

  it("caps the pairs it lists and says how many more there are", () => {
    const sameish = Array.from({ length: 8 }, (_, i) => `#0072B${i}`);
    const finding = analyzeTheme(withColors(sameish)).findings.find((f) => f.id === "similar-Data colors-normal")!;
    expect(finding.detail).toMatch(/and \d+ more pairs?/);
    expect(finding.colors.length).toBeLessThanOrEqual(8);
  });

  it("uses the documented threshold in its explanation", () => {
    const finding = analyzeTheme(withColors(["#0072B2", "#0072B3"])).findings[0]!;
    expect(finding.detail).toContain(`${MIN_DISTINCT} or more`);
  });
});
