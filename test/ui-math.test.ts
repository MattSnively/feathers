import { describe, expect, it } from "vitest";
import { hexToHsl, hslToHex } from "../src/model/hsl";
import { DESIGN_WIDTH, fitZoom } from "../src/preview/zoom";
import { parseHex } from "../src/a11y/color";
import { playfair, okabeIto, tolMuted } from "../src/presets";

describe("hsl conversion", () => {
  it("matches known colors", () => {
    expect(hexToHsl("#FF0000")).toEqual({ h: 0, s: 100, l: 50 });
    expect(hexToHsl("#00FF00")).toEqual({ h: 120, s: 100, l: 50 });
    expect(hexToHsl("#0000FF")).toEqual({ h: 240, s: 100, l: 50 });
    expect(hexToHsl("#FFFFFF")).toEqual({ h: 0, s: 0, l: 100 });
    expect(hexToHsl("#000000")).toEqual({ h: 0, s: 0, l: 0 });
  });

  it("reports grays as zero saturation", () => {
    expect(hexToHsl("#808080").s).toBe(0);
  });

  it("produces known hex values", () => {
    expect(hslToHex({ h: 0, s: 100, l: 50 })).toBe("#FF0000");
    expect(hslToHex({ h: 240, s: 100, l: 50 })).toBe("#0000FF");
    expect(hslToHex({ h: 0, s: 0, l: 100 })).toBe("#FFFFFF");
    expect(hslToHex({ h: 60, s: 100, l: 50 })).toBe("#FFFF00");
  });

  it("round-trips every shipped preset color to within rounding error", () => {
    // Slider positions are whole numbers, so a hex -> HSL -> hex trip may drift by a few levels.
    const all = [playfair, okabeIto, tolMuted].flatMap((t) => [...t.palette.categorical, ...t.palette.sequential, ...t.palette.diverging]);
    for (const hex of all) {
      const back = parseHex(hslToHex(hexToHsl(hex)));
      const orig = parseHex(hex);
      for (let i = 0; i < 3; i++) expect(Math.abs(back[i]! - orig[i]!), `${hex} channel ${i}`).toBeLessThanOrEqual(4);
    }
  });

  it("keeps hue stable when only lightness changes", () => {
    const base = hexToHsl("#0A3746");
    expect(Math.abs(hexToHsl(hslToHex({ ...base, l: base.l + 20 })).h - base.h)).toBeLessThanOrEqual(2);
  });
});

describe("fitZoom", () => {
  it("is 1 at the design width", () => expect(fitZoom(DESIGN_WIDTH)).toBe(1));
  it("scales proportionally inside the range", () => expect(fitZoom(DESIGN_WIDTH * 1.5)).toBeCloseTo(1.5, 6));
  it("clamps for very wide and very narrow stages", () => {
    expect(fitZoom(4000)).toBe(1.75);
    expect(fitZoom(200)).toBe(0.5);
  });
});
