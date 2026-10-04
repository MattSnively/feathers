import type { Hex, Line, Theme } from "./theme";

export class ThemeError extends Error {}

const HEX6 = /^#[0-9a-fA-F]{6}$/;

export function assertHex(value: Hex, label: string): void {
  if (!HEX6.test(value)) {
    throw new ThemeError(`${label}: "${value}" is not a 6-digit hex color like #0A3746`);
  }
}

function assertLine(line: Line, label: string): void {
  assertHex(line.color, `${label}.color`);
  if (!Number.isInteger(line.width) || line.width < 1 || line.width > 5) {
    throw new ThemeError(`${label}.width: ${line.width} must be an integer from 1 to 5`);
  }
}

/** Checks the constraints shared by every exporter; each exporter adds its own on top. */
export function validateTheme(theme: Theme): void {
  if (theme.name.trim() === "") throw new ThemeError("name must not be empty");
  if (theme.palette.categorical.length === 0) {
    throw new ThemeError("palette.categorical needs at least one color");
  }
  theme.palette.categorical.forEach((c, i) => assertHex(c, `palette.categorical[${i}]`));
  theme.palette.sequential.forEach((c, i) => assertHex(c, `palette.sequential[${i}]`));
  theme.palette.diverging.forEach((c, i) => assertHex(c, `palette.diverging[${i}]`));
  for (const [key, c] of Object.entries(theme.status)) assertHex(c, `status.${key}`);
  for (const [key, c] of Object.entries(theme.text)) assertHex(c, `text.${key}`);
  for (const [key, c] of Object.entries(theme.background)) assertHex(c, `background.${key}`);
  assertHex(theme.visualBorder.color, "visualBorder.color");
  assertLine(theme.gridline, "gridline");
  assertLine(theme.zeroline, "zeroline");
}
