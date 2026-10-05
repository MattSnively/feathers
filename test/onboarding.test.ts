import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { colorDifference, contrastRatio, mix } from "../src/a11y/color";
import { exportPowerBi } from "../src/export/powerbi";
import { MAX_COLORS, parseHexList } from "../src/model/hexlist";
import { importPowerBiTheme } from "../src/model/importPowerBi";
import { deriveRamps } from "../src/model/ramps";
import { blank } from "../src/presets/blank";
import { okabeIto, playfair, presets } from "../src/presets";

describe("parseHexList", () => {
  it("reads codes separated by spaces, commas, semicolons and line breaks", () => {
    expect(parseHexList("#0045E5 #FFB81C, #FF5C39;\n#00A878").colors).toEqual(["#0045E5", "#FFB81C", "#FF5C39", "#00A878"]);
  });

  it("accepts six digits without a hash and three digits with one", () => {
    expect(parseHexList("0045e5 #abc").colors).toEqual(["#0045E5", "#AABBCC"]);
  });

  it("does not mistake words for three-digit hex", () => {
    const { colors, ignored } = parseHexList("bad add #0045E5");
    expect(colors).toEqual(["#0045E5"]);
    expect(ignored).toEqual(["bad", "add"]);
  });

  it("reports what it skipped", () => {
    const r = parseHexList("Brand colors: #0045E5, #XYZ123, 12");
    expect(r.colors).toEqual(["#0045E5"]);
    expect(r.ignored).toEqual(["Brand", "colors:", "#XYZ123", "12"]);
  });

  it("drops duplicates, keeping the first position, case-insensitively", () => {
    expect(parseHexList("#0045e5 #FFB81C #0045E5").colors).toEqual(["#0045E5", "#FFB81C"]);
  });

  it("caps at Tableau's 20-color limit and reports the overflow", () => {
    const many = Array.from({ length: 25 }, (_, i) => `#${(i + 1).toString(16).padStart(6, "0")}`).join(" ");
    const r = parseHexList(many);
    expect(r.colors).toHaveLength(MAX_COLORS);
    expect(r.ignored).toHaveLength(5);
  });

  it("returns nothing for empty input", () => {
    expect(parseHexList("   ")).toEqual({ colors: [], ignored: [] });
  });
});

describe("mix and deriveRamps", () => {
  it("mixes toward white", () => {
    expect(mix("#000000", "#FFFFFF", 0)).toBe("#000000");
    expect(mix("#000000", "#FFFFFF", 1)).toBe("#FFFFFF");
    expect(mix("#000000", "#FFFFFF", 0.5)).toBe("#808080");
  });

  it("builds a sequential ramp from a light tint up to the first color", () => {
    const { sequential } = deriveRamps(["#0045E5", "#FFB81C"]);
    expect(sequential[1]).toBe("#0045E5");
    expect(contrastRatio(sequential[0], "#FFFFFF")).toBeLessThan(1.5);
  });

  it("pairs the first color with the one furthest from it for the diverging ramp", () => {
    const { diverging } = deriveRamps(["#0045E5", "#0050F0", "#FF5C39"]);
    expect(diverging[0]).toBe("#0045E5");
    expect(diverging[2]).toBe("#FF5C39");
  });

  it("gives a single color a partner on the opposite side of the hue wheel", () => {
    const { diverging } = deriveRamps(["#0045E5"]);
    expect(colorDifference(diverging[0], diverging[2])).toBeGreaterThan(30);
  });
});

describe("importPowerBiTheme", () => {
  it("round-trips every preset through our own exporter", () => {
    for (const preset of presets) {
      const r = importPowerBiTheme(exportPowerBi(preset), blank);
      expect(r.ok, preset.name).toBe(true);
      if (!r.ok) continue;
      const t = r.theme;
      expect(t.name).toBe(preset.name);
      expect(t.palette.categorical).toEqual(preset.palette.categorical);
      expect(t.palette.diverging).toEqual(preset.palette.diverging);
      expect(t.status).toEqual(preset.status);
      expect(t.text).toEqual(preset.text);
      expect(t.background).toEqual(preset.background);
      expect(t.gridline).toEqual(preset.gridline);
      expect(t.visualBorder).toEqual(preset.visualBorder);
      expect(t.fonts.powerBi).toEqual(preset.fonts.powerBi);
      expect(t.sizes).toEqual(preset.sizes);
    }
  });

  it("derives the sequential palette, which Power BI themes don't carry", () => {
    const r = importPowerBiTheme(exportPowerBi(playfair), blank);
    expect(r.ok && r.theme.palette.sequential[1]).toBe(playfair.palette.categorical[0]);
    expect(r.ok && r.notes.join(" ")).toContain("derived");
  });

  it("imports the theme file that was hand-tested in Power BI Desktop", () => {
    const text = readFileSync(new URL("../research/handtest/feathers-playfair.powerbi.json", import.meta.url), "utf-8");
    const r = importPowerBiTheme(text, blank);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.theme.palette.categorical[0]).toBe("#0A3746");
      expect(r.theme.fonts.powerBi.title).toBe("Segoe UI Semibold");
      expect(r.applied).toContain("data colors".replace("data colors", `${r.theme.palette.categorical.length} data colors`));
    }
  });

  it("reads a minimal community-style theme (name and colors only)", () => {
    const r = importPowerBiTheme('{"name":"Valentine","dataColors":["#990011","#cc1144","#ee7799"],"background":"#FFFFFF","foreground":"#ee7799"}', blank);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.theme.name).toBe("Valentine");
      expect(r.theme.palette.categorical).toEqual(["#990011", "#CC1144", "#EE7799"]);
      expect(r.theme.text.primary).toBe("#EE7799");
      expect(r.theme.background.container).toBe("#FFFFFF");
      // Everything the file didn't mention keeps the base theme's value.
      expect(r.theme.fonts).toEqual(blank.fonts);
    }
  });

  it("normalizes three-digit and eight-digit colors", () => {
    const r = importPowerBiTheme('{"dataColors":["#abc","#11223380"]}', blank);
    expect(r.ok && r.theme.palette.categorical).toEqual(["#AABBCC", "#112233"]);
  });

  it("takes the first family from a font stack and skips fonts Power BI doesn't ship", () => {
    const stack = importPowerBiTheme('{"textClasses":{"label":{"fontFace":"\'Segoe UI\', wf_segoe-ui_normal, helvetica"}}}', blank);
    expect(stack.ok && stack.theme.fonts.powerBi.body).toBe("Segoe UI");
    const unknown = importPowerBiTheme('{"dataColors":["#112233"],"textClasses":{"title":{"fontFace":"Papyrus"}}}', blank);
    expect(unknown.ok && unknown.theme.fonts.powerBi.title).toBe(blank.fonts.powerBi.title);
    expect(unknown.ok && unknown.notes.join(" ")).toContain("Papyrus");
  });

  it("ignores out-of-range sizes and clamps gridline thickness", () => {
    const r = importPowerBiTheme('{"textClasses":{"label":{"fontSize":0},"title":{"fontSize":16}},"visualStyles":{"*":{"*":{"valueAxis":[{"gridlineThickness":12}]}}}}', blank);
    expect(r.ok && r.theme.sizes.body).toBe(blank.sizes.body);
    expect(r.ok && r.theme.sizes.title).toBe(16);
    expect(r.ok && r.theme.gridline.width).toBe(5);
  });

  it("notes that per-visual formatting isn't imported", () => {
    const r = importPowerBiTheme('{"dataColors":["#112233"],"visualStyles":{"barChart":{"*":{}}}}', okabeIto);
    expect(r.ok && r.notes.join(" ")).toContain("individual visual types");
  });

  it.each([
    ["not json", "{nope"],
    ["an array", "[1,2]"],
    ["an empty object", "{}"],
    ["only unknown keys", '{"hello":"world"}'],
    ["only unusable colors", '{"dataColors":["red","blue"]}'],
  ])("rejects %s with a readable error", (_label, text) => {
    const r = importPowerBiTheme(text, blank);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.length).toBeGreaterThan(10);
  });

  it("never mutates the base theme", () => {
    const before = JSON.stringify(blank);
    importPowerBiTheme(exportPowerBi(playfair), blank);
    expect(JSON.stringify(blank)).toBe(before);
  });
});

describe("importPowerBiTheme visual border", () => {
  it("reads a switched-on border and its color", () => {
    const file = JSON.parse(exportPowerBi(blank));
    file.visualStyles["*"]["*"].border = [{ show: true, color: { solid: { color: "#111111" } } }];
    const r = importPowerBiTheme(JSON.stringify(file), blank);
    expect(r.ok && r.theme.visualBorder).toEqual({ visible: true, color: "#111111" });
    expect(r.ok && r.applied).toContain("visual border");
  });
});
