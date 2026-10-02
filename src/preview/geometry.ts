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

export interface StackedValue {
  series: number;
  category: number;
  /** Cumulative value below this segment and at its top. */
  from: number;
  to: number;
}

/** Stacks series on top of each other per category. Values are assumed non-negative. */
export function stackValues(values: number[][]): StackedValue[] {
  const categories = values[0]?.length ?? 0;
  const running = new Array<number>(categories).fill(0);
  return values.flatMap((row, series) =>
    row.map((value, category) => {
      const from = running[category]!;
      running[category] = from + value;
      return { series, category, from, to: from + value };
    }),
  );
}

/** Stacked columns: one column per category, segments rising from the bottom of the domain. */
export function layoutStacked(plot: Plot, ticks: number[], values: number[][], pad = 0.3): (Bar & { value: number })[] {
  const y = scaleY(plot, ticks);
  const categories = values[0]?.length ?? 0;
  const band = plot.width / Math.max(categories, 1);
  return stackValues(values).map(({ series, category, from, to }) => ({
    series,
    category,
    value: to - from,
    x: plot.left + category * band + (band * pad) / 2,
    y: y(to),
    width: band * (1 - pad),
    height: Math.max(y(from) - y(to), 0),
  }));
}

/** Start and end angles (radians, clockwise from 12 o'clock) for each share of a donut. */
export function donutAngles(weights: number[]): { start: number; end: number }[] {
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  let angle = 0;
  return weights.map((w) => {
    const start = angle;
    angle += (w / total) * Math.PI * 2;
    return { start, end: angle };
  });
}

/** SVG path for one ring segment. */
export function ringPath(cx: number, cy: number, outer: number, inner: number, start: number, end: number): string {
  const point = (r: number, a: number) => `${(cx + r * Math.sin(a)).toFixed(2)} ${(cy - r * Math.cos(a)).toFixed(2)}`;
  const large = end - start > Math.PI ? 1 : 0;
  return `M${point(outer, start)} A${outer} ${outer} 0 ${large} 1 ${point(outer, end)} L${point(inner, end)} A${inner} ${inner} 0 ${large} 0 ${point(inner, start)} Z`;
}
