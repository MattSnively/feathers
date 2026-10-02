type Child = Node | string | null | false | undefined;

/**
 * Tiny element builder. Props that exist on the element are set as properties (value, checked, disabled,
 * htmlFor...); everything else, including aria-* and data-*, becomes an attribute. `onX` adds a listener.
 */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Record<string, unknown> = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value == null || value === false) continue;
    if (key.startsWith("on") && typeof value === "function") {
      el.addEventListener(key.slice(2).toLowerCase(), value as EventListener);
    } else if (key === "class") {
      el.className = String(value);
    } else if (key in el) {
      (el as unknown as Record<string, unknown>)[key] = value;
    } else {
      el.setAttribute(key, value === true ? "" : String(value));
    }
  }
  for (const child of children) {
    if (child == null || child === false) continue;
    el.append(child);
  }
  return el;
}

/** SVG counterpart of `h`: elements need the SVG namespace, and everything is an attribute. */
export function s<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number | boolean | null | undefined | EventListener> = {},
  ...children: Child[]
): SVGElementTagNameMap[K] {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value == null || value === false) continue;
    if (key.startsWith("on") && typeof value === "function") el.addEventListener(key.slice(2).toLowerCase(), value);
    else el.setAttribute(key, value === true ? "" : String(value));
  }
  for (const child of children) {
    if (child == null || child === false) continue;
    el.append(child);
  }
  return el;
}

/**
 * Replaces a container's children and puts keyboard focus back on the element carrying the same
 * data-key (or on `focusKey` when the caller knows where focus should land), so rebuilding after a
 * reorder or toggle doesn't drop a keyboard user back at the top of the page.
 */
export function rebuild(root: HTMLElement, build: () => Node[], focusKey?: string | null): void {
  const active = document.activeElement;
  const key = focusKey ?? (active instanceof HTMLElement && root.contains(active) ? active.dataset.key : undefined);
  root.replaceChildren(...build());
  if (key) root.querySelector<HTMLElement>(`[data-key="${CSS.escape(key)}"]`)?.focus();
}

let counter = 0;
/** Unique id so every input can be tied to a visible <label>. */
export const uid = (prefix: string): string => `${prefix}-${++counter}`;
