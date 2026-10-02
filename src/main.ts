import "./style.css";
import { playfair } from "./presets";
import { hasOnboarded } from "./state/onboarding";
import { loadState, saveState } from "./state/persist";
import { createStore } from "./state/store";
import { mountApp } from "./ui/app";

const root = document.querySelector<HTMLDivElement>("#app");
if (root) {
  const saved = loadState();
  const store = createStore(saved ?? { theme: structuredClone(playfair), tool: "powerbi", mode: "beginner" });
  store.subscribe((state) => saveState(state));
  // Returning users, and anyone with a saved theme from before the flow existed, go straight to the editor.
  mountApp(root, store, { showOnboarding: saved === null && !hasOnboarded() });
}
