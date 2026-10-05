import "./style.css";
import { playfair } from "./presets";
import { loadState, saveState } from "./state/persist";
import { createStore } from "./state/store";
import { mountApp } from "./ui/app";

const root = document.querySelector<HTMLDivElement>("#app");
if (root) {
  const saved = loadState();
  const store = createStore(saved ?? { theme: structuredClone(playfair), tool: "powerbi", mode: "beginner" });
  store.subscribe((state) => saveState(state));
  // Everyone starts on the landing page, saved work or not. "#editor" opens the editor directly.
  mountApp(root, store, { showOnboarding: location.hash !== "#editor", returning: saved !== null });
}
