/**
 * The Feathers mark: a peacock with its tail fanned out in palette colors. Pure markup (no DOM) so the
 * in-app logo and the favicon are drawn from the same source.
 */
const PIVOT = { x: 16, y: 24 };
const GREEN = "#0F542C";
const BLUE = "#0A3746";
const RUST = "#B36000";
const ORANGE = "#F99A2B";
const PAPER = "#F3F4EF";

/** Fan, left to right: angle from vertical in degrees, and the feather's color. */
const FEATHERS: [number, string][] = [
  [-58, BLUE], [-38, GREEN], [-19, RUST], [0, ORANGE], [19, RUST], [38, GREEN], [58, BLUE],
];

const n = (v: number) => v.toFixed(2).replace(/\.?0+$/, "");

function feather(angle: number, color: string): string {
  const rad = (angle * Math.PI) / 180;
  const at = (dist: number) => ({ x: PIVOT.x + dist * Math.sin(rad), y: PIVOT.y - dist * Math.cos(rad) });
  const body = at(9.5);
  const eye = at(14.5);
  const light = color === ORANGE;
  return [
    `<ellipse cx="${n(body.x)}" cy="${n(body.y)}" rx="3" ry="7" fill="${color}" transform="rotate(${angle} ${n(body.x)} ${n(body.y)})"/>`,
    `<ellipse cx="${n(eye.x)}" cy="${n(eye.y)}" rx="1.6" ry="2.2" fill="${light ? BLUE : ORANGE}" transform="rotate(${angle} ${n(eye.x)} ${n(eye.y)})"/>`,
    `<circle cx="${n(eye.x)}" cy="${n(eye.y)}" r="0.7" fill="${light ? PAPER : BLUE}"/>`,
  ].join("");
}

/** SVG children for a 32x32 viewBox. Paper outlines keep the bird legible against the dark feathers. */
export function peacockMarkup(): string {
  const outer = FEATHERS.filter(([a]) => a !== 0 && Math.abs(a) > 30);
  const inner = FEATHERS.filter(([a]) => a !== 0 && Math.abs(a) <= 30);
  const centre = FEATHERS.filter(([a]) => a === 0);
  const fan = [...outer, ...inner, ...centre].map(([a, c]) => feather(a, c)).join("");
  // The bird is drawn twice: first as a paper-colored silhouette that outlines it against the feathers,
  // then filled, so the head, neck and body read as one shape without seams.
  const shapes = (fill: string) => [
    `<rect x="14.9" y="17" width="2.2" height="7" fill="${fill}"/>`,
    `<ellipse cx="16" cy="25.6" rx="3.2" ry="3.8" fill="${fill}"/>`,
    `<circle cx="16" cy="17" r="2.3" fill="${fill}"/>`,
  ].join("");
  const outline = `<g stroke="${PAPER}" stroke-width="1.8" stroke-linejoin="round">${shapes(PAPER)}</g>`;
  const bird = [
    outline,
    shapes(BLUE),
    `<path d="M18 17.1L20.4 17.9L18 18.7Z" fill="${RUST}"/>`,
    `<path d="M16 14.7V12.6M14.9 15L13.8 13.2M17.1 15L18.2 13.2" stroke="${BLUE}" stroke-width="0.9" stroke-linecap="round" fill="none"/>`,
    `<circle cx="16" cy="12.2" r="0.9" fill="${ORANGE}"/><circle cx="13.5" cy="12.8" r="0.8" fill="${ORANGE}"/><circle cx="18.5" cy="12.8" r="0.8" fill="${ORANGE}"/>`,
    `<circle cx="16.8" cy="16.7" r="0.45" fill="${PAPER}"/>`,
  ].join("");
  return fan + bird;
}

export const peacockSvg = (): string => `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'>${peacockMarkup()}</svg>`.replace(/"/g, "'");
