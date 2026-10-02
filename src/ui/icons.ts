import { s } from "./dom";

/** 24x24 line icons. Paths are drawn with round caps at a 1.75 stroke so they read as one family. */
const PATHS = {
  palette: [
    "M12 3a9 9 0 1 0 0 18c1.1 0 1.8-.8 1.8-1.7 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-1 .8-1.7 1.8-1.7H17a4 4 0 0 0 4-4c0-4.4-4-8.2-9-8.2z",
    "M7.5 12h.01M9.5 7.5h.01M14.5 7.5h.01",
  ],
  type: ["M5 6V4h14v2", "M12 4v16", "M9 20h6"],
  lines: ["M3 5h18", "M3 12h18", "M3 19h18"],
  frame: ["M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z", "M8 8h8v8H8z"],
  shield: ["M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z", "M9 12l2 2 4-4"],
  download: ["M12 4v11", "M7.5 10.5L12 15l4.5-4.5", "M5 20h14"],
  plus: ["M12 5v14", "M5 12h14"],
  close: ["M6 6l12 12", "M18 6L6 18"],
  left: ["M15 6l-6 6 6 6"],
  right: ["M9 6l6 6-6 6"],
  pencil: ["M4 20h4L19 9l-4-4L4 16v4z"],
  grip: ["M9 6h.01M9 12h.01M9 18h.01M15 6h.01M15 12h.01M15 18h.01"],
  check: ["M5 12.5l4.5 4.5L19 7.5"],
  code: ["M8 7l-5 5 5 5", "M16 7l5 5-5 5", "M14 4l-4 16"],
  upload: ["M12 16V4", "M7.5 8.5L12 4l4.5 4.5", "M5 20h14"],
} as const;

export type IconName = keyof typeof PATHS;

export function icon(name: IconName, size = 20): SVGSVGElement {
  return s(
    "svg",
    {
      viewBox: "0 0 24 24",
      width: size,
      height: size,
      fill: "none",
      stroke: "currentColor",
      "stroke-width": name === "palette" || name === "grip" ? 2 : 1.75,
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      "aria-hidden": "true",
      focusable: "false",
      class: "icon",
    },
    ...PATHS[name].map((d) => s("path", { d })),
  );
}

/** The wordmark glyph: a single feather stroke. */
export function logoMark(size = 28): SVGSVGElement {
  return s(
    "svg",
    { viewBox: "0 0 32 32", width: size, height: size, "aria-hidden": "true", focusable: "false", class: "logo-mark" },
    s("rect", { width: 32, height: 32, rx: 9, fill: "currentColor" }),
    s("path", { d: "M8 25C8 14.5 14.5 8 25 8c0 10.5-6.5 17-17 17z", fill: "var(--logo-fg, #fff)" }),
    s("path", { d: "M8 25L18 15", stroke: "currentColor", "stroke-width": 1.6, "stroke-linecap": "round" }),
  );
}
