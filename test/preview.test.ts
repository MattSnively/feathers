import { describe, expect, it } from "vitest";
import { layoutBars, scaleY, type Plot } from "../src/preview/geometry";
import { calloutPx, fontStyle, lineAttrs, px } from "../src/preview/style";

describe("fontStyle", () => {
  it("keeps plain families at regular weight with a generic fallback", () => {
    expect(fontStyle("Verdana")).toEqual({ family: '"Verdana", sans-serif', weight: 400 });
  });

  it("splits weight variants into base family plus weight", () => {
    expect(fontStyle("Segoe UI Semibold")).toEqual({ family: '"Segoe UI Semibold", "Segoe UI", sans-serif', weight: 600 });
    expect(fontStyle("Segoe UI Light").weight).toBe(300);
    expect(fontStyle("Tableau Medium").weight).toBe(500);
    expect(fontStyle("Tableau Bold").weight).toBe(700);
    expect(fontStyle("Arial Black").weight).toBe(900);
  });

  it("understands Power BI's 'Segoe (Bold)' label", () => {
    const f = fontStyle("Segoe (Bold)");
    expect(f.weight).toBe(700);
    expect(f.family).toContain('"Segoe UI"');
  });

  it("falls back to Segoe UI for Tableau's own fonts, which may not be installed", () => {
    expect(fontStyle("Tableau Book").family).toBe('"Tableau Book", "Tableau", "Segoe UI", sans-serif');
  });

  it("picks serif and monospace generics", () => {
    expect(fontStyle("Georgia").family.endsWith("serif")).toBe(true);
    expect(fontStyle("Georgia").family.endsWith("sans-serif")).toBe(false);
    expect(fontStyle("Consolas").family.endsWith("monospace")).toBe(true);
  });
});

describe("units", () => {
  it("converts points to pixels", () => expect(px(12)).toBe(16));
  it("caps huge card values so they fit the preview", () => {
    expect(calloutPx(40)).toBe(32);
    expect(calloutPx(12)).toBe(16);
  });
});

describe("lineAttrs", () => {
  const base = { visible: true, width: 2, color: "#DDDAD3" } as const;
  it("draws solid lines without a dash array", () => {
    expect(lineAttrs({ ...base, style: "solid" })["stroke-dasharray"]).toBeUndefined();
  });
  it("scales dashes with width", () => {
    expect(lineAttrs({ ...base, style: "dashed" })["stroke-dasharray"]).toBe("8 6");
  });
  it("draws dots with round caps", () => {
    const a = lineAttrs({ ...base, style: "dotted" });
    expect(a["stroke-linecap"]).toBe("round");
    expect(a["stroke-dasharray"]).toBe("0.1 5");
  });
});

describe("chart geometry", () => {
  const plot: Plot = { left: 40, top: 10, width: 200, height: 100 };

  it("maps domain ends to plot edges", () => {
    const y = scaleY(plot, [0, 50, 100]);
    expect(y(0)).toBe(110);
    expect(y(100)).toBe(10);
    expect(y(50)).toBe(60);
  });

  it("stands positive bars on the baseline with proportional heights", () => {
    const bars = layoutBars(plot, [0, 50, 100], [[25, 50, 100]]);
    for (const b of bars) expect(b.y + b.height).toBeCloseTo(110, 6);
    expect(bars.map((b) => b.height)).toEqual([25, 50, 100]);
  });

  it("hangs negative bars below the zero line", () => {
    const ticks = [-50, 0, 50, 100];
    const y = scaleY(plot, ticks);
    const [neg, pos] = layoutBars(plot, ticks, [[-30, 60]]);
    expect(neg!.y).toBeCloseTo(y(0), 6);
    expect(neg!.y + neg!.height).toBeCloseTo(y(-30), 6);
    expect(pos!.y + pos!.height).toBeCloseTo(y(0), 6);
  });

  it("keeps grouped bars inside their band without overlapping", () => {
    const bars = layoutBars(plot, [0, 100], [[10, 20], [30, 40], [50, 60]]);
    const group0 = bars.filter((b) => b.category === 0).sort((a, b) => a.x - b.x);
    for (let i = 1; i < group0.length; i++) {
      expect(group0[i]!.x).toBeCloseTo(group0[i - 1]!.x + group0[i - 1]!.width, 6);
    }
    for (const b of bars) {
      expect(b.x).toBeGreaterThanOrEqual(plot.left);
      expect(b.x + b.width).toBeLessThanOrEqual(plot.left + plot.width);
    }
  });
});
