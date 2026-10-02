import { normalizeHex } from "../model/hex";
import { h, uid } from "./dom";

const HEX_HELP = "Use a 6-digit hex color like #0A3746";

/**
 * A color picker paired with a hex text field. Invalid text is flagged and never committed, so the
 * theme stays exportable at every keystroke; on blur the field snaps back to the last valid color.
 */
export function colorField(
  label: string,
  value: string,
  onCommit: (hex: string) => void,
  opts: { key?: string } = {},
): HTMLElement {
  const id = uid("color");
  let last = value;

  const picker = h("input", {
    type: "color",
    value: value.toLowerCase(),
    "aria-label": `${label}, color picker`,
    "data-key": opts.key && `${opts.key}-picker`,
  });
  const text = h("input", {
    id,
    type: "text",
    value,
    maxLength: 7,
    spellcheck: false,
    autocomplete: "off",
    "data-key": opts.key,
  });
  const msg = h("span", { class: "field-msg", role: "alert" });

  const commit = (hex: string) => {
    last = hex;
    picker.value = hex.toLowerCase();
    text.value = hex;
    text.removeAttribute("aria-invalid");
    msg.textContent = "";
    onCommit(hex);
  };

  picker.addEventListener("input", () => commit(picker.value.toUpperCase()));
  text.addEventListener("input", () => {
    const hex = normalizeHex(text.value);
    if (hex) {
      last = hex;
      picker.value = hex.toLowerCase();
      text.removeAttribute("aria-invalid");
      msg.textContent = "";
      onCommit(hex);
    } else {
      text.setAttribute("aria-invalid", "true");
      msg.textContent = HEX_HELP;
    }
  });
  text.addEventListener("blur", () => {
    text.value = last;
    text.removeAttribute("aria-invalid");
    msg.textContent = "";
  });

  return h(
    "div",
    { class: "field color-field" },
    h("label", { htmlFor: id }, label),
    h("div", { class: "color-inputs" }, picker, text),
    msg,
  );
}

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
    { id, "data-key": opts.key, onchange: () => onChange(select.value) },
    ...all.map((o) => h("option", { value: o, selected: o === value }, o)),
  );
  return h("div", { class: "field" }, h("label", { htmlFor: id }, label), select);
}

export function numberField(
  label: string,
  value: number,
  range: { min: number; max: number },
  onCommit: (n: number) => void,
  opts: { key?: string } = {},
): HTMLElement {
  const id = uid("num");
  const msg = h("span", { class: "field-msg", role: "alert" });
  const input = h("input", { id, type: "number", value: String(value), min: range.min, max: range.max, step: 1, "data-key": opts.key });
  input.addEventListener("input", () => {
    const n = Number(input.value);
    if (Number.isInteger(n) && n >= range.min && n <= range.max) {
      input.removeAttribute("aria-invalid");
      msg.textContent = "";
      onCommit(n);
    } else {
      input.setAttribute("aria-invalid", "true");
      msg.textContent = `Enter a whole number from ${range.min} to ${range.max}`;
    }
  });
  return h("div", { class: "field" }, h("label", { htmlFor: id }, label), input, msg);
}

export function checkboxField(label: string, checked: boolean, onChange: (v: boolean) => void): HTMLElement {
  const id = uid("check");
  const input = h("input", { id, type: "checkbox", checked, onchange: () => onChange(input.checked) });
  return h("div", { class: "field check-field" }, input, h("label", { htmlFor: id }, label));
}
