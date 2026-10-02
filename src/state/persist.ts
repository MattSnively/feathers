import { exportPowerBi } from "../export/powerbi";
import { exportTableauTheme } from "../export/tableauTheme";
import { exportTableauTps } from "../export/tableauTps";
import type { AppState } from "./store";

const KEY = "feathers.state.v1";

export type StorageLike = Pick<Storage, "getItem" | "setItem">;

// Storage can be missing or throw (private windows, blocked site data), so every access is guarded
// and the app must work without it.
export function defaultStorage(): StorageLike | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function saveState(state: AppState, storage: StorageLike | null = defaultStorage()): void {
  try {
    storage?.setItem(KEY, JSON.stringify({ theme: state.theme, tool: state.tool, mode: state.mode }));
  } catch {
    // Quota or blocked storage: losing persistence is acceptable.
  }
}

/** Returns null for anything missing, corrupt or from an incompatible older shape. */
export function loadState(storage: StorageLike | null = defaultStorage()): AppState | null {
  try {
    const raw = storage?.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AppState;
    if (parsed.tool !== "powerbi" && parsed.tool !== "tableau") return null;
    // Running every exporter proves the stored theme is complete, not just well-typed.
    exportPowerBi(parsed.theme);
    exportTableauTheme(parsed.theme);
    exportTableauTps(parsed.theme);
    // `mode` arrived after the first release, so older saved states have none: default to Beginner.
    return { theme: parsed.theme, tool: parsed.tool, mode: parsed.mode === "advanced" ? "advanced" : "beginner" };
  } catch {
    return null;
  }
}
