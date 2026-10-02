import { describe, expect, it } from "vitest";
import { ALL_FONTS, applyFont, currentFont, fontLabel, fontNotice, fontSupport, POWER_BI_FONTS, TABLEAU_FONTS } from "../src/model/fonts";
import { blank } from "../src/presets/blank";

const fonts = () => structuredClone(blank.fonts);

describe("font support", () => {
  it("knows which tool ships a font", () => {
    expect(fontSupport("Arial")).toEqual({ powerBi: true, tableau: true });
    expect(fontSupport("Segoe UI")).toEqual({ powerBi: true, tableau: false });
    expect(fontSupport("Tableau Book")).toEqual({ powerBi: false, tableau: true });
  });

  it("lists every font once, shared fonts first", () => {
    expect(new Set(ALL_FONTS).size).toBe(ALL_FONTS.length);
    expect(ALL_FONTS.length).toBe(new Set([...POWER_BI_FONTS, ...TABLEAU_FONTS]).size);
    expect(ALL_FONTS.slice(0, 7).every((f) => fontSupport(f).powerBi && fontSupport(f).tableau)).toBe(true);
  });
});

describe("applyFont", () => {
  it("sets a shared font in both tools", () => {
    const f = fonts();
    applyFont(f, "Verdana");
    expect(f.powerBi).toEqual({ body: "Verdana", title: "Verdana" });
    expect(f.tableau).toEqual({ body: "Verdana", title: "Verdana" });
  });

  it("gives the other tool its default when it doesn't ship the font", () => {
    const f = fonts();
    applyFont(f, "Segoe UI Light");
    expect(f.powerBi.body).toBe("Segoe UI Light");
    expect(f.tableau).toEqual({ body: "Tableau Book", title: "Tableau Book" });
    applyFont(f, "Tableau Medium");
    expect(f.tableau.body).toBe("Tableau Medium");
    expect(f.powerBi).toEqual({ body: "Segoe UI", title: "Segoe UI" });
  });

  it("only ever writes fonts each tool ships", () => {
    for (const name of ALL_FONTS) {
      const f = fonts();
      applyFont(f, name);
      expect(POWER_BI_FONTS).toContain(f.powerBi.body);
      expect(TABLEAU_FONTS).toContain(f.tableau.body);
    }
  });
});

describe("currentFont and notices", () => {
  it("reads back what applyFont chose, including Tableau-only fonts", () => {
    // Tableau Book is the one exception: it is also Tableau's default, so a theme can't tell it from "untouched".
    for (const name of ALL_FONTS.filter((f) => f !== "Tableau Book")) {
      const f = fonts();
      applyFont(f, name);
      expect(currentFont(f), name).toBe(name);
    }
  });

  it("says which tool a font works in", () => {
    expect(fontNotice("Arial")).toEqual({ kind: "both", text: "Arial works in both Power BI and Tableau." });
    expect(fontNotice("DIN").text).toContain("Tableau theme will use Tableau Book");
    expect(fontNotice("Tableau Bold").text).toContain("Power BI theme will use Segoe UI");
  });
});

describe("applyFont by role", () => {
  it("changes only the body or only the titles", () => {
    const f = fonts();
    applyFont(f, "Verdana", "body");
    expect(f.powerBi).toEqual({ body: "Verdana", title: blank.fonts.powerBi.title });
    applyFont(f, "Georgia", "title");
    expect(f.tableau.title).toBe("Georgia");
    expect(f.tableau.body).toBe("Verdana");
  });

  it("falls back per tool for one role without touching the other", () => {
    const f = fonts();
    applyFont(f, "Verdana");
    applyFont(f, "DIN", "title");
    expect(f.powerBi).toEqual({ body: "Verdana", title: "DIN" });
    expect(f.tableau).toEqual({ body: "Verdana", title: "Tableau Book" });
    expect(currentFont(f, "title")).toBe("DIN");
    expect(currentFont(f, "body")).toBe("Verdana");
  });

  it("labels options with where they work", () => {
    expect(fontLabel("Arial")).toBe("Arial · both");
    expect(fontLabel("DIN")).toBe("DIN · Power BI");
    expect(fontLabel("Tableau Bold")).toBe("Tableau Bold · Tableau");
  });
});
