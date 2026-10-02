import type { Theme } from "../model/theme";
import { validateTheme } from "../model/validate";

const SCHEMA_URL =
  "https://raw.githubusercontent.com/microsoft/powerbi-desktop-samples/main/Report%20Theme%20JSON%20Schema/reportThemeSchema-2.157.json";

// Inside visualStyles, Power BI wants colors wrapped as { solid: { color } }.
const fill = (color: string) => ({ solid: { color } });

export function exportPowerBi(theme: Theme): string {
  validateTheme(theme);
  const { palette, status, text, background, gridline, fonts, sizes } = theme;
  const pbiFonts = fonts.powerBi;

  const axisGridlines = [
    {
      gridlineShow: gridline.visible,
      gridlineStyle: gridline.style,
      gridlineThickness: gridline.width,
      gridlineColor: fill(gridline.color),
    },
  ];

  const json = {
    $schema: SCHEMA_URL,
    name: theme.name,
    dataColors: palette.categorical,
    good: status.good,
    neutral: status.neutral,
    bad: status.bad,
    // Conditional-formatting gradient; Power BI's maximum/center/minimum map to the diverging palette.
    maximum: palette.diverging[2],
    center: palette.diverging[1],
    minimum: palette.diverging[0],
    foreground: text.primary,
    firstLevelElements: text.primary,
    secondLevelElements: text.secondary,
    thirdLevelElements: gridline.color,
    fourthLevelElements: text.muted,
    background: background.container,
    secondaryBackground: gridline.color,
    tableAccent: palette.categorical[0],
    textClasses: {
      title: { fontFace: pbiFonts.title, fontSize: sizes.title, color: text.primary },
      label: { fontFace: pbiFonts.body, fontSize: sizes.body, color: text.secondary },
      callout: { fontFace: pbiFonts.title, fontSize: sizes.callout, color: palette.categorical[0] },
      header: { fontFace: pbiFonts.title, fontSize: sizes.title, color: text.primary },
    },
    visualStyles: {
      page: {
        "*": {
          background: [{ color: fill(background.page), transparency: 0 }],
          outspace: [{ color: fill(background.canvas), transparency: 0 }],
        },
      },
      // "*" > "*" applies to every visual type.
      "*": {
        "*": {
          background: [{ show: true, color: fill(background.container), transparency: 0 }],
          categoryAxis: axisGridlines,
          valueAxis: axisGridlines,
        },
      },
    },
  };

  return JSON.stringify(json, null, 2);
}
