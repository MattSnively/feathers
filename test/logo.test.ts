import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { fanMarkup, fanSvg } from "../src/ui/logoMarkup";

describe("logo", () => {
  it("draws seven feathers, each with an eye, and no bird", () => {
    const m = fanMarkup();
    expect((m.match(/<ellipse/g) ?? []).length).toBe(7 * 2); // feathers + eyes
    expect(m).not.toContain("<rect");
    for (const c of ["#4E79A7", "#F28E2B", "#E15759", "#59A14F", "#EDC948", "#B07AA1", "#76B7B2"]) expect(m).toContain(c); // Tableau 10
  });

  it("keeps every shape inside the 32px mark", () => {
    for (const [, cx, cy] of fanMarkup().matchAll(/cx="(-?[\d.]+)" cy="(-?[\d.]+)"/g)) {
      expect(Number(cx)).toBeGreaterThan(0);
      expect(Number(cx)).toBeLessThan(32);
      expect(Number(cy)).toBeGreaterThan(0);
      expect(Number(cy)).toBeLessThan(32);
    }
  });

  it("uses the same fan for the favicon", () => {
    const html = readFileSync(new URL("../index.html", import.meta.url), "utf-8");
    const href = /href="data:image\/svg\+xml,([^"]*)"/.exec(html)?.[1];
    expect(decodeURIComponent(href ?? "")).toBe(fanSvg());
    expect(fanSvg()).not.toContain("<rect");
  });
});
