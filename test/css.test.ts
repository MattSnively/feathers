import { describe, expect, it } from "vitest";
import { exportCss } from "../src/export/css";
import { presets, playfair } from "../src/presets";

const declarations = (css: string) => [...css.matchAll(/^\s+--feathers-([\w-]+): (.+);$/gm)];

describe("exportCss", () => {
  it.each(presets.map((p) => [p.name, p] as const))("%s: color tokens are valid hex and all else is a token", (_, theme) => {
    const css = exportCss(theme);
    const tokens = declarations(css);
    expect(tokens.length).toBeGreaterThan(20);
    for (const [, name, value] of tokens) {
      if (!/^(font|size)-/.test(name!) && name !== "border") expect(value, name).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
    // Rules may only reference tokens; a raw hex outside :root would drift from the theme.
    const afterRoot = css.slice(css.indexOf("}") + 1);
    expect(afterRoot).not.toMatch(/#[0-9A-Fa-f]{3,8}\b/);
  });

  it("emits one cat token and series class per categorical color", () => {
    const css = exportCss(playfair);
    const n = playfair.palette.categorical.length;
    expect(declarations(css).filter(([, name]) => name!.startsWith("cat-"))).toHaveLength(n);
    expect(css).toContain(`.feathers-series-${n} {`);
    expect(css).not.toContain(`.feathers-series-${n + 1} {`);
  });

  it("scopes element rules under .feathers-root and has a single :root block", () => {
    const css = exportCss(playfair);
    expect(css.match(/^:root \{/gm)).toHaveLength(1);
    expect(css).not.toMatch(/^(body|h1|h2|h3|a)\b/m);
  });

  it("gives the Power BI font web-safe fallbacks that end in a generic family", () => {
    const css = exportCss({ ...playfair, fonts: { ...playfair.fonts, powerBi: { body: "Georgia", title: "Segoe (Bold)" } } });
    expect(css).toContain('--feathers-font-body: "Georgia", serif;');
    expect(css).toContain('--feathers-font-title: "Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif;');
  });

  it("keeps a hidden visual border the same width but transparent", () => {
    const css = exportCss({ ...playfair, visualBorder: { visible: false, color: "#123456" } });
    expect(css).toContain("--feathers-border: transparent;");
  });

  it("is deterministic and rejects an invalid theme", () => {
    expect(exportCss(playfair)).toBe(exportCss(playfair));
    expect(() => exportCss({ ...playfair, text: { ...playfair.text, primary: "nope" } })).toThrow(/6-digit hex/);
  });
});
