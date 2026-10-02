import type { Line, Theme } from "../model/theme";
import { ThemeError, validateTheme } from "../model/validate";

/** Tableau rejects theme files over 15,000 bytes. */
export const TABLEAU_MAX_BYTES = 15_000;

const line = (l: Line) => ({
  "line-visibility": l.visible ? "on" : "off",
  "line-pattern": l.style,
  "line-width": l.width,
  "line-color": l.color,
});

export function exportTableauTheme(theme: Theme): string {
  validateTheme(theme);
  const { palette, text, background, gridline, zeroline, fonts, sizes } = theme;
  const tf = fonts.tableau;

  const json = {
    version: "1.0.0",
    "base-theme": "smooth",
    styles: {
      all: { "font-family": tf.body, "font-color": text.secondary },
      worksheet: { "font-family": tf.body, "font-size": sizes.body, "font-color": text.secondary },
      "worksheet-title": { "font-family": tf.title, "font-size": sizes.title, "font-color": text.primary },
      "dashboard-title": {
        "font-family": tf.title,
        "font-size": sizes.title,
        "font-color": text.primary,
        "font-weight": "bold",
      },
      tooltip: { "font-family": tf.body, "font-size": sizes.body, "font-color": text.primary },
      view: { "background-color": background.container },
      gridline: line(gridline),
      zeroline: line(zeroline),
      // Theme files hold one mark color only; full palettes ship via Preferences.tps.
      mark: { "mark-color": palette.categorical[0] },
    },
  };

  const out = JSON.stringify(json, null, 2);
  const bytes = new TextEncoder().encode(out).length;
  if (bytes > TABLEAU_MAX_BYTES) {
    throw new ThemeError(`Tableau theme is ${bytes} bytes; the limit is ${TABLEAU_MAX_BYTES}`);
  }
  return out;
}
