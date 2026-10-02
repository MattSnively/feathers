import type { Theme } from "../model/theme";
import { okabeIto } from "./okabeIto";
import { playfair } from "./playfair";
import { tolMuted } from "./tolMuted";

export const presets: readonly Theme[] = [playfair, okabeIto, tolMuted];

export { okabeIto, playfair, tolMuted };
