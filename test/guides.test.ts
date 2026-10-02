import { describe, expect, it } from "vitest";
import { EXPORTS } from "../src/export/files";
import { fillFile, GUIDES, WHICH_FILES } from "../src/guides/content";

describe("import guides", () => {
  it("has a guide for every export", () => {
    for (const spec of EXPORTS) expect(GUIDES[spec.id], spec.id).toBeDefined();
  });

  it.each(EXPORTS.map((e) => [e.id] as const))("%s guide is complete", (id) => {
    const g = GUIDES[id];
    expect(g.steps.length).toBeGreaterThanOrEqual(4);
    expect(g.verify.length).toBeGreaterThan(20);
    expect(g.troubleshooting.length).toBeGreaterThanOrEqual(4);
    expect(g.requires.length).toBeGreaterThan(0);
    // The first step must name the file so users can find what they just downloaded.
    expect(g.steps[0]).toContain("{file}");
  });

  it("substitutes the real filename everywhere", () => {
    const text = GUIDES["powerbi"].steps.map((s) => fillFile(s, "x.powerbi.json")).join(" ");
    expect(text).toContain("x.powerbi.json");
    expect(text).not.toContain("{file}");
  });

  // These guard the must-have gap: the places novices actually get stuck.
  it("Power BI guide names the real menu command", () => {
    expect(GUIDES["powerbi"].steps.join(" ")).toContain("Import theme");
  });

  it("Tableau theme guide names the menu path and the Tableau version gate", () => {
    const g = GUIDES["tableau-theme"];
    expect(g.steps.join(" ")).toContain("Format > Import Custom Theme");
    expect(g.requires).toContain("2025.1");
    expect(g.steps.join(" ")).toMatch(/Override[\s\S]*Preserve/);
  });

  it("Tableau palette guide protects existing palettes and requires a restart", () => {
    const g = GUIDES["tableau-tps"];
    const steps = g.steps.join(" ");
    expect(steps).toMatch(/backup/i);
    expect(steps).toMatch(/restart/i);
    expect(steps).toContain("Copy XML");
    expect(steps).toContain("</preferences>");
    expect(steps).toContain("Assign Palette");
  });

  it("only tells novices to use a plain-text editor, never a rich one", () => {
    expect(GUIDES["tableau-tps"].requires).toMatch(/plain-text/);
  });

  it("recommends the right files per tool", () => {
    expect(WHICH_FILES.powerbi).toContain("one file");
    expect(WHICH_FILES.tableau).toContain("both files");
  });
});
