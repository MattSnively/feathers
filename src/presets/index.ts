import type { Theme } from "../model/theme";
import { dark2 } from "./dark2";
import { midnight } from "./midnight";
import { okabeIto } from "./okabeIto";
import { playfair } from "./playfair";
import { tableau10 } from "./tableau10";
import { tolMuted } from "./tolMuted";

export const presets: readonly Theme[] = [playfair, okabeIto, tolMuted, tableau10, dark2, midnight];

export { dark2, midnight, okabeIto, playfair, tableau10, tolMuted };
