export interface Plot {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface Bar {
  series: number;
  category: number;
  value: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Maps a data value to a y pixel; `ticks` gives the axis domain (first = bottom, last = top). */
export function scaleY(plot: Plot, ticks: number[]): (value: number) => number {
  const min = ticks[0]!;
  const max = ticks[ticks.length - 1]!;
  return (v) => plot.top + (1 - (v - min) / (max - min)) * plot.height;
}

/** Maps a data value to an x pixel; `ticks` gives the axis domain (first = left, last = right). */
export function scaleX(plot: Plot, ticks: number[]): (value: number) => number {
  const min = ticks[0]!;
  const max = ticks[ticks.length - 1]!;
  return (v) => plot.left + ((v - min) / (max - min)) * plot.width;
}

/**
 * Grouped columns: one group per category, one bar per series. Bars rise from the zero line
 * (or the bottom edge when the domain doesn't include zero) and hang below it when negative.
 */
export function layoutBars(plot: Plot, ticks: number[], values: number[][], pad = 0.2): Bar[] {
  const y = scaleY(plot, ticks);
  const min = ticks[0]!;
  const max = ticks[ticks.length - 1]!;
  const baseline = y(Math.min(Math.max(0, min), max));
  const categories = values[0]?.length ?? 0;
  const band = plot.width / Math.max(categories, 1);
  const barWidth = (band * (1 - pad)) / values.length;

  const bars: Bar[] = [];
  values.forEach((row, series) =>
    row.forEach((value, category) => {
      const top = y(value);
      bars.push({
        series,
        category,
        value,
        x: plot.left + category * band + (band * pad) / 2 + series * barWidth,
        y: Math.min(top, baseline),
        width: barWidth,
        height: Math.abs(top - baseline),
      });
    }),
  );
  return bars;
}
