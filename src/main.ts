import "./style.css";
import { playfair } from "./presets";
import { loadState, saveState } from "./state/persist";
import { createStore } from "./state/store";
import { mountApp } from "./ui/app";

const root = document.querySelector<HTMLDivElement>("#app");
if (root) {
  const store = createStore(loadState() ?? { theme: structuredClone(playfair), tool: "powerbi", mode: "beginner" });
  store.subscribe((state) => saveState(state));
  mountApp(root, store);
}
