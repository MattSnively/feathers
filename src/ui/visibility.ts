import type { Mode, Tool } from "../state/store";

const PALETTE_KEY = /^(cat|sequential|diverging)-\d+$/;

/**
 * Beginner shows one font control for both body and titles, so a click on title text lands there.
 */
export function resolveKey(key: string, mode: Mode): string {
  return mode === "beginner" && key === "font-title" ? "font-body" : key;
}

/**
 * Whether the control behind a data-key is shown. Preview parts only become clickable when their
 * control exists, so Beginner never jumps to something it hides. Keep in step with controls.ts.
 */
export function isAvailable(key: string, mode: Mode, tool: Tool): boolean {
  if (mode === "advanced") return true;
  if (PALETTE_KEY.test(key)) return true;
  switch (key) {
    case "bg-container":
    case "gridline-color":
    case "font-body":
      return true;
    // Canvas and page backgrounds exist only in Power BI.
    case "bg-canvas":
    case "bg-page":
    case "border-color":
      return tool === "powerbi";
    default:
      return false;
  }
}
