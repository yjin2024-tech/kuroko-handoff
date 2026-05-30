import type { MappingEntry } from "./types.js";

export function restoreText(input: string, mappings: MappingEntry[]): string {
  return mappings.reduce(
    (restored, entry) =>
      restored.replaceAll(entry.placeholder, entry.value),
    input,
  );
}
