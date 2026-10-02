/**
 * Indexes of lines in `next` that have no unmatched twin in `prev`. Counting duplicates (rather than
 * comparing by position) keeps an inserted or removed block from marking every line below it as changed.
 */
export function changedLines(prev: string, next: string): Set<number> {
  const available = new Map<string, number>();
  for (const line of prev.split("\n")) available.set(line, (available.get(line) ?? 0) + 1);
  const changed = new Set<number>();
  next.split("\n").forEach((line, i) => {
    const n = available.get(line) ?? 0;
    if (n > 0) available.set(line, n - 1);
    else changed.add(i);
  });
  return changed;
}
