import { detectAll } from "./detectors.js";
import type { DetectedMatch, EntityType, MappingEntry, MaskResult } from "./types.js";

export function maskText(input: string, dictionaryTerms: string[] = []): MaskResult {
  const acceptedMatches = selectNonOverlappingMatches(
    detectAll(input, dictionaryTerms),
  ).sort((a, b) => a.start - b.start || b.end - b.start - (a.end - a.start));

  const counters = new Map<EntityType, number>();
  const placeholders = new Map<string, string>();
  const mappings: MappingEntry[] = [];

  let sanitized = "";
  let cursor = 0;

  for (const match of acceptedMatches) {
    sanitized += input.slice(cursor, match.start);

    const key = `${match.type}\u0000${match.value}`;
    let placeholder = placeholders.get(key);

    if (!placeholder) {
      const next = (counters.get(match.type) ?? 0) + 1;
      counters.set(match.type, next);
      placeholder = `{{${match.type}_${String(next).padStart(3, "0")}}}`;
      placeholders.set(key, placeholder);
      mappings.push({
        placeholder,
        value: match.value,
        type: match.type,
      });
    }

    sanitized += placeholder;
    cursor = match.end;
  }

  sanitized += input.slice(cursor);

  return {
    sanitized,
    mappings,
    acceptedMatches,
  };
}

function selectNonOverlappingMatches(matches: DetectedMatch[]): DetectedMatch[] {
  const selected: DetectedMatch[] = [];
  const byPriority = [...matches].sort(
    (a, b) =>
      priority(a.type) - priority(b.type) ||
      a.start - b.start ||
      b.end - b.start - (a.end - a.start),
  );

  for (const match of byPriority) {
    if (!selected.some((existing) => overlaps(existing, match))) {
      selected.push(match);
    }
  }

  return selected;
}

function priority(type: EntityType): number {
  return type === "CUSTOM" ? 0 : 1;
}

function overlaps(a: DetectedMatch, b: DetectedMatch): boolean {
  return a.start < b.end && b.start < a.end;
}
