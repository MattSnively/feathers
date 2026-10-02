/** Six-digit hex color, e.g. "#0A3746". Tableau's theme schema rejects 3- and 8-digit forms for several fields. */
export type Hex = string;

export type LineStyle = "solid" | "dashed" | "dotted";

export interface Line {
  visible: boolean;
  style: LineStyle;
  /** 1-5: Tableau's schema caps line-width at 5 (its docs wrongly say 99). */
  width: number;
  color: Hex;
}

export interface Palette {
  /** Ordered data colors. The first one also becomes Tableau's single theme `mark-color`. */
  categorical: Hex[];
  /** Low-to-high endpoints; Tableau interpolates between them. */
  sequential: [Hex, Hex];
  /** Low, center, high. */
  diverging: [Hex, Hex, Hex];
}

/** Font families differ per tool because each tool ships a different default set. */
export interface FontSet {
  body: string;
  title: string;
}

export interface Theme {
  name: string;
  palette: Palette;
  status: { good: Hex; neutral: Hex; bad: Hex };
  text: {
    primary: Hex;
    secondary: Hex;
    /** Disabled and category-label text. */
    muted: Hex;
  };
  background: {
    /** Area around the report page (Power BI "outspace"). */
    canvas: Hex;
    /** The report page itself. */
    page: Hex;
    /** Visual container and Tableau view background. */
    container: Hex;
  };
  gridline: Line;
  zeroline: Line;
  fonts: { powerBi: FontSet; tableau: FontSet };
  /** Point sizes shared by both tools. */
  sizes: { body: number; title: number; callout: number };
}
