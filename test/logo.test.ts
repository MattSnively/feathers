import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { peacockMarkup, peacockSvg } from "../src/ui/logoMarkup";

describe("logo", () => {
  it("draws seven feathers, each with an eye, plus the bird", () => {
    const m = peacockMarkup();
    expect((m.match(/<ellipse/g) ?? []).length).toBeGreaterThanOrEqual(7 * 2 + 1); // feathers + eyes + body
    expect(m).toContain("#F99A2B");
  });

  it("keeps every shape inside the 32px mark", () => {
    for (const [, cx, cy] of peacockMarkup().matchAll(/cx="(-?[\d.]+)" cy="(-?[\d.]+)"/g)) {
      expect(Number(cx)).toBeGreaterThan(0);
      expect(Number(cx)).toBeLessThan(32);
      expect(Number(cy)).toBeGreaterThan(0);
      expect(Number(cy)).toBeLessThan(32);
    }
  });

  it("uses the same drawing for the favicon", () => {
    const html = readFileSync(new URL("../index.html", import.meta.url), "utf-8");
    const href = /href="data:image\/svg\+xml,([^"]*)"/.exec(html)?.[1];
    expect(decodeURIComponent(href ?? "")).toBe(peacockSvg());
  });
});
