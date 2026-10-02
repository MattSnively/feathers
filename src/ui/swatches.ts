import { hexToHsl, hslToHex, type Hsl } from "../model/hsl";
import { h } from "./dom";
import { colorControl, rangeControl } from "./fields";

/** Hue, saturation and lightness sliders whose tracks preview what dragging will do. */
export function hslSliders(initial: string, onChange: (hex: string) => void) {
  let hsl: Hsl = hexToHsl(initial);

  const paintTracks = () => {
    const { h: hue, s, l } = hsl;
    hueCtl.setTrack(
      "linear-gradient(to right, hsl(0 100% 50%), hsl(60 100% 50%), hsl(120 100% 50%), hsl(180 100% 50%), hsl(240 100% 50%), hsl(300 100% 50%), hsl(360 100% 50%))",
    );
    satCtl.setTrack(`linear-gradient(to right, hsl(${hue} 0% ${l}%), hsl(${hue} 100% ${l}%))`);
    litCtl.setTrack(`linear-gradient(to right, hsl(${hue} ${s}% 0%), hsl(${hue} ${s}% 50%), hsl(${hue} ${s}% 100%))`);
  };
  // Slider positions are kept locally while dragging; re-deriving them from the rounded hex each time would make them jitter.
  const emit = () => {
    paintTracks();
    onChange(hslToHex(hsl));
  };

  const hueCtl = rangeControl("Hue", hsl.h, { min: 0, max: 360, unit: "°" }, (v) => { hsl = { ...hsl, h: v }; emit(); });
  const satCtl = rangeControl("Saturation", hsl.s, { min: 0, max: 100, unit: "%" }, (v) => { hsl = { ...hsl, s: v }; emit(); });
  const litCtl = rangeControl("Lightness", hsl.l, { min: 0, max: 100, unit: "%" }, (v) => { hsl = { ...hsl, l: v }; emit(); });
  paintTracks();

  return {
    element: h("div", { class: "hsl-sliders" }, hueCtl.element, satCtl.element, litCtl.element),
    /** Re-sync after the color changed some other way (hex field, picker). */
    set(hex: string) {
      hsl = hexToHsl(hex);
      hueCtl.set(hsl.h);
      satCtl.set(hsl.s);
      litCtl.set(hsl.l);
      paintTracks();
    },
  };
}

/** Hex field, native picker and HSL sliders for one color, kept in sync with each other. */
export function colorEditor(label: string, value: string, onChange: (hex: string) => void, opts: { key?: string } = {}): HTMLElement {
  const color = colorControl(label, value, (hex) => {
    sliders.set(hex);
    onChange(hex);
  }, opts);
  const sliders = hslSliders(value, (hex) => {
    color.set(hex);
    onChange(hex);
  });
  return h("div", { class: "color-editor-body" }, color.element, sliders.element);
}
