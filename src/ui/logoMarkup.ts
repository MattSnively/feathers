/**
 * The Feathers mark: a peacock's tail fanned out in palette colors. Pure markup (no DOM) so the
 * in-app logo and the favicon are drawn from the same source.
 */
const PIVOT = { x: 16, y: 24 };
const PAPER = "#F3F4EF";
const INK = "#1F2A36";

/** Fan, left to right: angle from vertical in degrees, and the feather's color (the Tableau 10 palette). */
const FEATHERS: [number, string][] = [
  [-58, "#4E79A7"], [-38, "#59A14F"], [-19, "#EDC948"], [0, "#F28E2B"], [19, "#E15759"], [38, "#B07AA1"], [58, "#76B7B2"],
];

const n = (v: number) => v.toFixed(2).replace(/\.?0+$/, "");

function feather(angle: number, color: string): string {
  const rad = (angle * Math.PI) / 180;
  const at = (dist: number) => ({ x: PIVOT.x + dist * Math.sin(rad), y: PIVOT.y - dist * Math.cos(rad) });
  const body = at(9.5);
  const eye = at(14.5);
  return [
    `<ellipse cx="${n(body.x)}" cy="${n(body.y)}" rx="3" ry="7" fill="${color}" transform="rotate(${angle} ${n(body.x)} ${n(body.y)})"/>`,
    `<ellipse cx="${n(eye.x)}" cy="${n(eye.y)}" rx="1.6" ry="2.2" fill="${PAPER}" transform="rotate(${angle} ${n(eye.x)} ${n(eye.y)})"/>`,
    `<circle cx="${n(eye.x)}" cy="${n(eye.y)}" r="0.7" fill="${INK}"/>`,
  ].join("");
}

/** SVG children for the fan, in a viewBox of "1 2 30 30". Outer feathers are drawn first so the middle ones overlap them. */
export function fanMarkup(): string {
  const order = [...FEATHERS].sort((a, b) => Math.abs(b[0]) - Math.abs(a[0]));
  return order.map(([a, c]) => feather(a, c)).join("");
}

export const FAN_VIEWBOX = "1 2 30 30";

export const fanSvg = (): string => `<svg xmlns='http://www.w3.org/2000/svg' viewBox='${FAN_VIEWBOX}'>${fanMarkup()}</svg>`.replace(/"/g, "'");
