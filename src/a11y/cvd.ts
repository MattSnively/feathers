import { fromLinear, linearRgb, toHex, type Rgb } from "./color";

export type Vision = "protanopia" | "deuteranopia" | "tritanopia";

export const VISIONS: readonly Vision[] = ["protanopia", "deuteranopia", "tritanopia"];

export const VISION_LABEL: Record<Vision | "normal", string> = {
  normal: "typical vision",
  protanopia: "protanopia (no red cones)",
  deuteranopia: "deuteranopia (no green cones)",
  tritanopia: "tritanopia (no blue cones)",
};

type Matrix = readonly [readonly [number, number, number], readonly [number, number, number], readonly [number, number, number]];

/**
 * Machado, Oliveira & Fernandes (2009), severity 1.0 (complete dichromacy), applied in linear RGB.
 * Values from the authors' page, inf.ufrgs.br/~oliveira/pubs_files/CVD_Simulation. The method is
 * accurate for protan and deutan vision (the common red-green types) but only approximate for tritan.
 */
const MATRICES: Record<Vision, Matrix> = {
  protanopia: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deuteranopia: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  tritanopia: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],
};

/** Approximates how `hex` appears to someone with the given color vision deficiency. */
export function simulate(hex: string, vision: Vision): string {
  const m = MATRICES[vision];
  const lin = linearRgb(hex);
  const out = m.map((row) => row[0] * lin[0] + row[1] * lin[1] + row[2] * lin[2]);
  // Clamp: the matrices can push saturated colors slightly outside the displayable range.
  return toHex(out.map((c) => fromLinear(Math.min(1, Math.max(0, c))) * 255) as Rgb);
}
