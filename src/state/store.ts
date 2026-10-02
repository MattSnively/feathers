import type { Theme } from "../model/theme";

export type Tool = "powerbi" | "tableau";

/** Beginner hides the settings most people never need to change; Advanced shows everything. */
export type Mode = "beginner" | "advanced";

/**
 * "value" changes (typing in a field) must not rebuild the controls, or inputs lose focus;
 * "structure" changes (preset load, add/remove/reorder, tool switch) do.
 */
export type ChangeKind = "value" | "structure";

export interface AppState {
  theme: Theme;
  tool: Tool;
  mode: Mode;
}

export type Listener = (state: AppState, kind: ChangeKind) => void;

export function createStore(initial: AppState) {
  let state = initial;
  const listeners = new Set<Listener>();
  const emit = (kind: ChangeKind) => listeners.forEach((l) => l(state, kind));

  return {
    get: (): AppState => state,

    subscribe(listener: Listener): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    setTool(tool: Tool): void {
      state = { ...state, tool };
      emit("structure");
    },

    setMode(mode: Mode): void {
      state = { ...state, mode };
      emit("structure");
    },

    /** Replaces the theme with a copy, so presets are never mutated by later edits. */
    loadTheme(theme: Theme): void {
      state = { ...state, theme: structuredClone(theme) };
      emit("structure");
    },

    updateTheme(mutate: (draft: Theme) => void, kind: ChangeKind = "value"): void {
      const theme = structuredClone(state.theme);
      mutate(theme);
      state = { ...state, theme };
      emit(kind);
    },
  };
}

export type Store = ReturnType<typeof createStore>;
