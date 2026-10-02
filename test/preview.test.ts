import { changedLines } from "../src/export/lineDiff";
import { describe, expect, it } from "vitest";
import { donutAngles, layoutBars, layoutStacked, ringPath, scaleX, scaleY, stackValues, type Plot } from "../src/preview/geometry";
import { calloutPx, fontStyle, lineAttrs, px, rampColor } from "../src/preview/style";

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

  it("maps x domain ends to the plot's left and right edges", () => {
    const x = scaleX(plot, [0, 50, 100]);
    expect(x(0)).toBe(40);
    expect(x(100)).toBe(240);
    expect(x(25)).toBe(90);
  });

  it("places negative x values left of zero when the domain spans it", () => {
    const x = scaleX(plot, [-50, 0, 50]);
    expect(x(0)).toBe(140);
    expect(x(-50)).toBe(40);
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

describe("stacked and ring geometry", () => {
  const plot: Plot = { left: 0, top: 0, width: 100, height: 100 };

  it("stacks series cumulatively per category", () => {
    const cells = stackValues([[1, 2], [3, 4]]);
    expect(cells.map((c) => [c.from, c.to])).toEqual([[0, 1], [0, 2], [1, 4], [2, 6]]);
  });

  it("lays stacked segments edge to edge, top of the stack at the cumulative value", () => {
    const [first, second] = layoutStacked(plot, [0, 100], [[20], [30]]);
    expect(first!.y + first!.height).toBeCloseTo(100);
    expect(second!.y + second!.height).toBeCloseTo(first!.y);
    expect(second!.y).toBeCloseTo(50);
  });

  it("splits a donut into angles that cover the full circle", () => {
    const angles = donutAngles([1, 1, 2]);
    expect(angles[0]!.start).toBe(0);
    expect(angles[2]!.end).toBeCloseTo(Math.PI * 2);
    expect(angles[1]!.end - angles[1]!.start).toBeCloseTo(Math.PI / 2);
  });

  it("flags large arcs so a share over half a turn draws the long way round", () => {
    expect(ringPath(50, 50, 40, 20, 0, Math.PI * 1.5)).toContain("A40 40 0 1 1");
    expect(ringPath(50, 50, 40, 20, 0, Math.PI / 2)).toContain("A40 40 0 0 1");
  });
});

describe("rampColor", () => {
  it("returns the stops at the ends and the midpoint of a three-stop ramp", () => {
    const ramp = ["#000000", "#FF0000", "#FFFFFF"];
    expect(rampColor(ramp, 0)).toBe("#000000");
    expect(rampColor(ramp, 0.5)).toBe("#FF0000");
    expect(rampColor(ramp, 1)).toBe("#FFFFFF");
  });
  it("clamps out-of-range positions", () => {
    expect(rampColor(["#000000", "#FFFFFF"], 2)).toBe("#FFFFFF");
    expect(rampColor(["#000000", "#FFFFFF"], -1)).toBe("#000000");
  });
});

describe("changedLines", () => {
  it("marks only edited lines", () => {
    expect([...changedLines("a\nb\nc", "a\nB\nc")]).toEqual([1]);
  });
  it("doesn't mark lines below an insertion", () => {
    expect([...changedLines("a\nb\nc", "a\nx\nb\nc")]).toEqual([1]);
  });
  it("counts duplicates, so a repeated line added later is flagged", () => {
    expect([...changedLines("a\nb", "a\nb\nb")]).toEqual([2]);
  });
  it("reports nothing for identical text", () => {
    expect(changedLines("a\nb", "a\nb").size).toBe(0);
  });
});
