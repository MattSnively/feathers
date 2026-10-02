/** The sample reports are laid out at this width and scaled to fit the stage. */
export const DESIGN_WIDTH = 960;

export const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5] as const;

/** Scale that fits the report into `available` pixels, kept within a readable range. */
export function fitZoom(available: number, design = DESIGN_WIDTH, min = 0.5, max = 1.75): number {
  return Math.min(max, Math.max(min, available / design));
}
