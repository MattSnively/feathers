import { defaultStorage, type StorageLike } from "./persist";

const KEY = "feathers.onboarded.v1";

/** True once the first-run flow was finished or skipped. Without storage we show it every time. */
export function hasOnboarded(storage: StorageLike | null = defaultStorage()): boolean {
  try {
    return storage?.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function markOnboarded(storage: StorageLike | null = defaultStorage()): void {
  try {
    storage?.setItem(KEY, "1");
  } catch {
    // Blocked storage: the flow simply shows again next visit.
  }
}
