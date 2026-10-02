import { normalizeHex } from "../model/hex";
import { h, uid } from "./dom";

const HEX_HELP = "Use a 6-digit hex color like #0A3746";

export interface ColorControl {
  element: HTMLElement;
  /** Updates the displayed color without firing onCommit; used when another control changed it. */
  set: (hex: string) => void;
}

/**
 * Label on the left, swatch and hex on the right. Invalid text is flagged and never committed, so the
 * theme stays exportable at every keystroke; on blur the field snaps back to the last valid color.
 */
export function colorControl(
  label: string,
  value: string,
  onCommit: (hex: string) => void,
  opts: { key?: string } = {},
): ColorControl {
  const id = uid("color");
  let last = value;

  const picker = h("input", {
    type: "color",
    class: "swatch-input",
    value: value.toLowerCase(),
    "aria-label": `${label}, color picker`,
    "data-key": opts.key && `${opts.key}-picker`,
  });
  const text = h("input", {
    id,
    type: "text",
    class: "hex-input",
    value,
    maxLength: 7,
    spellcheck: false,
    autocomplete: "off",
    "data-key": opts.key,
  });
  const msg = h("span", { class: "field-msg", role: "alert" });

  const clear = () => {
    text.removeAttribute("aria-invalid");
    msg.textContent = "";
  };
  const show = (hex: string) => {
    last = hex;
    picker.value = hex.toLowerCase();
    text.value = hex;
    clear();
  };

  picker.addEventListener("input", () => {
    const hex = picker.value.toUpperCase();
    show(hex);
    onCommit(hex);
  });
  text.addEventListener("input", () => {
    const hex = normalizeHex(text.value);
    if (hex) {
      last = hex;
      picker.value = hex.toLowerCase();
      clear();
      onCommit(hex);
    } else {
      text.setAttribute("aria-invalid", "true");
      msg.textContent = HEX_HELP;
    }
  });
  text.addEventListener("blur", () => {
    text.value = last;
    clear();
  });

  const element = h(
    "div",
    { class: "field-block" },
    h("div", { class: "row" }, h("label", { htmlFor: id }, label), h("div", { class: "color-inputs" }, picker, text)),
    msg,
  );
  return { element, set: show };
}

export const colorField = (
  label: string,
  value: string,
  onCommit: (hex: string) => void,
  opts: { key?: string } = {},
): HTMLElement => colorControl(label, value, onCommit, opts).element;

export interface RangeControl {
  element: HTMLElement;
  set: (value: number) => void;
  /** CSS background for the track, e.g. a hue gradient; null restores the filled-progress look. */
  setTrack: (css: string | null) => void;
}

/** Slider with a live value readout, in the style of a design tool's property pane. */
export function rangeControl(
  label: string,
  value: number,
  opts: { min: number; max: number; step?: number; unit?: string; key?: string },
  onInput: (value: number) => void,
): RangeControl {
  const id = uid("range");
  const unit = opts.unit ?? "";
  const out = h("output", { class: "range-out", for: id });
  const input = h("input", {
    id,
    type: "range",
    class: "range",
    min: String(opts.min),
    max: String(opts.max),
    step: String(opts.step ?? 1),
    value: String(value),
    "data-key": opts.key,
  });

  const paint = () => {
    const pct = ((Number(input.value) - opts.min) / (opts.max - opts.min)) * 100;
    input.style.setProperty("--pct", `${pct}%`);
    out.textContent = `${input.value}${unit}`;
    input.setAttribute("aria-valuetext", `${input.value}${unit}`);
  };
  input.addEventListener("input", () => {
    paint();
    onInput(Number(input.value));
  });
  paint();

  const element = h("div", { class: "range-field" }, h("div", { class: "range-head" }, h("label", { htmlFor: id }, label), out), input);
  return {
    element,
    set: (v) => {
      input.value = String(v);
      paint();
    },
    setTrack: (css) => {
      if (css) input.style.setProperty("--track", css);
      else input.style.removeProperty("--track");
    },
  };
}

export const sliderField = (
  label: string,
  value: number,
  opts: { min: number; max: number; step?: number; unit?: string; key?: string },
  onInput: (value: number) => void,
): HTMLElement => rangeControl(label, value, opts, onInput).element;

export function selectField(
  label: string,
  options: readonly string[],
  value: string,
  onChange: (value: string) => void,
  opts: { key?: string } = {},
): HTMLElement {
  const id = uid("select");
  // A restored theme may name a font that has since left the curated list; keep it selectable.
  const all = options.includes(value) ? options : [value, ...options];
  const select = h(
    "select",
    { id, class: "select", "data-key": opts.key, onchange: () => onChange(select.value) },
    ...all.map((o) => h("option", { value: o, selected: o === value }, o)),
  );
  return h("div", { class: "field" }, h("label", { htmlFor: id }, label), select);
}

/** On/off switch with its label on the left. */
export function switchField(label: string, checked: boolean, onChange: (v: boolean) => void): HTMLElement {
  const id = uid("switch");
  const input = h("input", { id, type: "checkbox", class: "switch", role: "switch", checked, onchange: () => onChange(input.checked) });
  return h("div", { class: "row" }, h("label", { htmlFor: id }, label), input);
}

/** Row of mutually exclusive buttons. State lives in aria-pressed, so nothing is rebuilt on change. */
export function segmentedControl<T extends string>(
  options: readonly (readonly [T, string])[],
  current: () => T,
  onChange: (value: T) => void,
  opts: { label: string; class?: string },
): HTMLElement {
  const buttons = options.map(([value, text]) =>
    h("button", { type: "button", class: "seg", onclick: () => { onChange(value); sync(); } }, text));
  const sync = () => buttons.forEach((b, i) => b.setAttribute("aria-pressed", String(options[i]![0] === current())));
  sync();
  return h("div", { class: `seg-group ${opts.class ?? ""}`.trim(), role: "group", "aria-label": opts.label }, ...buttons);
}
