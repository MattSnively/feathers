import { describe, expect, it, vi } from "vitest";
import { EXPORTS, runExport, slugify } from "../src/export/files";
import { tableauPaletteBlocks, exportTableauTps } from "../src/export/tableauTps";
import { normalizeHex } from "../src/model/hex";
import { loadState, saveState } from "../src/state/persist";
import { createStore } from "../src/state/store";
import { isAvailable, resolveKey } from "../src/ui/visibility";
import { okabeIto, playfair } from "../src/presets";

describe("normalizeHex", () => {
  it.each([
    ["#0a3746", "#0A3746"],
    ["0a3746", "#0A3746"],
    ["  #abc ", "#AABBCC"],
    ["FFF", "#FFFFFF"],
  ])("normalizes %s", (input, expected) => expect(normalizeHex(input)).toBe(expected));

  it.each(["", "#12", "#12345", "#1234567", "#GGGGGG", "rgb(1,2,3)", "#FF000080"])(
    "rejects %s",
    (input) => expect(normalizeHex(input)).toBeNull(),
  );
});

describe("slugify", () => {
  it("lowercases and hyphenates", () => expect(slugify("Playfair Data")).toBe("playfair-data"));
  it("strips characters Tableau's file-name rule disallows", () => {
    expect(slugify('Okabe-Ito (colorblind-safe) / "v2"?')).toBe("okabe-ito-colorblind-safe-v2");
  });
  it("falls back when nothing usable remains", () => expect(slugify("***")).toBe("theme"));
  it("caps length without leaving a trailing hyphen", () => {
    const slug = slugify(`${"a".repeat(59)} bbbb`);
    expect(slug.length).toBeLessThanOrEqual(60);
    expect(slug.endsWith("-")).toBe(false);
  });
  it("only ever emits [a-z0-9-]", () => expect(slugify("Ünïcode ☃ Théme")).toMatch(/^[a-z0-9-]+$/));
});

describe("export registry", () => {
  it("names files per tool and never as Preferences.tps", () => {
    const names = EXPORTS.map((e) => e.filename("my-theme"));
    expect(names).toEqual(["my-theme.powerbi.json", "my-theme.tableau.json", "feathers-my-theme.tps"]);
    expect(names).not.toContain("Preferences.tps");
  });

  it("returns content for a valid theme", () => {
    for (const spec of EXPORTS) expect(runExport(spec, playfair).ok).toBe(true);
  });

  it("returns the validation message instead of throwing for a bad theme", () => {
    const bad = { ...playfair, text: { ...playfair.text, primary: "nope" } };
    const result = runExport(EXPORTS[0]!, bad);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/6-digit hex/);
  });
});

describe("tableauPaletteBlocks", () => {
  it("is exactly the palette section of the full .tps", () => {
    expect(exportTableauTps(playfair)).toContain(tableauPaletteBlocks(playfair));
    expect(tableauPaletteBlocks(playfair)).not.toContain("<preferences>");
  });
});

describe("store", () => {
  const make = () => createStore({ theme: playfair, tool: "powerbi", mode: "beginner" });

  it("updates immutably and does not mutate the preset", () => {
    const store = make();
    const before = store.get().theme;
    store.updateTheme((t) => {
      t.palette.categorical[0] = "#000000";
    });
    expect(store.get().theme.palette.categorical[0]).toBe("#000000");
    expect(before.palette.categorical[0]).toBe("#0A3746");
    expect(playfair.palette.categorical[0]).toBe("#0A3746");
  });

  it("copies a loaded preset so edits never reach it", () => {
    const store = make();
    store.loadTheme(okabeIto);
    store.updateTheme((t) => {
      t.name = "Changed";
    });
    expect(okabeIto.name).not.toBe("Changed");
  });

  it("tags changes so typing doesn't rebuild controls", () => {
    const store = make();
    const kinds: string[] = [];
    store.subscribe((_s, kind) => kinds.push(kind));
    store.updateTheme(() => {});
    store.updateTheme(() => {}, "structure");
    store.setTool("tableau");
    store.loadTheme(playfair);
    expect(kinds).toEqual(["value", "structure", "structure", "structure"]);
  });

  it("switches mode as a structural change, keeping the theme", () => {
    const store = make();
    const kinds: string[] = [];
    store.subscribe((_s, kind) => kinds.push(kind));
    store.setMode("advanced");
    expect(store.get().mode).toBe("advanced");
    expect(store.get().theme).toEqual(playfair);
    expect(kinds).toEqual(["structure"]);
  });

  it("stops notifying after unsubscribe", () => {
    const store = make();
    const spy = vi.fn();
    const off = store.subscribe(spy);
    off();
    store.setTool("tableau");
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("persistence", () => {
  const fakeStorage = () => {
    const data = new Map<string, string>();
    return {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
    };
  };

  it("round-trips theme and tool", () => {
    const storage = fakeStorage();
    saveState({ theme: okabeIto, tool: "tableau", mode: "advanced" }, storage);
    expect(loadState(storage)).toEqual({ theme: okabeIto, tool: "tableau", mode: "advanced" });
  });

  it("restores a theme saved before the visual border existed, with the border off", () => {
    const { visualBorder: _omit, ...legacy } = okabeIto;
    const storage = fakeStorage();
    storage.setItem("feathers.state.v1", JSON.stringify({ theme: legacy, tool: "powerbi", mode: "beginner" }));
    expect(loadState(storage)?.theme.visualBorder).toEqual({ visible: false, color: "#000000" });
  });

  it("returns null when nothing is stored, storage is absent, or JSON is corrupt", () => {
    expect(loadState(fakeStorage())).toBeNull();
    expect(loadState(null)).toBeNull();
    const storage = fakeStorage();
    storage.setItem("feathers.state.v1", "{not json");
    expect(loadState(storage)).toBeNull();
  });

  it("defaults to Beginner for saved states from before modes existed, or with a bad mode", () => {
    const storage = fakeStorage();
    storage.setItem("feathers.state.v1", JSON.stringify({ theme: playfair, tool: "powerbi" }));
    expect(loadState(storage)?.mode).toBe("beginner");
    storage.setItem("feathers.state.v1", JSON.stringify({ theme: playfair, tool: "powerbi", mode: "expert" }));
    expect(loadState(storage)?.mode).toBe("beginner");
  });

  it("discards a stored theme that is incomplete", () => {
    const storage = fakeStorage();
    const { fonts: _fonts, ...incomplete } = playfair;
    storage.setItem("feathers.state.v1", JSON.stringify({ theme: incomplete, tool: "powerbi" }));
    expect(loadState(storage)).toBeNull();
  });

  it("survives storage that throws", () => {
    const throwing = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    expect(() => saveState({ theme: playfair, tool: "powerbi", mode: "beginner" }, throwing)).not.toThrow();
    expect(loadState(throwing)).toBeNull();
  });
});

describe("mode visibility", () => {
  it("shows everything in Advanced", () => {
    for (const key of ["text-muted", "status-good", "size-callout", "zeroline-color", "font-title", "bg-canvas"]) {
      expect(isAvailable(key, "advanced", "tableau")).toBe(true);
    }
  });

  it("keeps the essentials in Beginner", () => {
    for (const key of ["cat-0", "cat-7", "sequential-1", "diverging-2", "bg-container", "gridline-color", "font-body"]) {
      expect(isAvailable(key, "beginner", "powerbi"), key).toBe(true);
    }
  });

  it("hides detail controls in Beginner", () => {
    for (const key of ["text-primary", "text-muted", "status-bad", "size-body", "size-callout", "zeroline-color", "font-title"]) {
      expect(isAvailable(key, "beginner", "powerbi"), key).toBe(false);
    }
  });

  it("offers canvas and page backgrounds only for Power BI in Beginner", () => {
    expect(isAvailable("bg-canvas", "beginner", "powerbi")).toBe(true);
    expect(isAvailable("bg-page", "beginner", "powerbi")).toBe(true);
    expect(isAvailable("bg-canvas", "beginner", "tableau")).toBe(false);
    expect(isAvailable("bg-page", "beginner", "tableau")).toBe(false);
  });

  it("sends title-font clicks to the single Beginner font control", () => {
    expect(resolveKey("font-title", "beginner")).toBe("font-body");
    expect(resolveKey("font-title", "advanced")).toBe("font-title");
    expect(resolveKey("cat-1", "beginner")).toBe("cat-1");
  });
});
