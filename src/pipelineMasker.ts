import type {
  EntityType,
  Finding,
  MappingEntry,
  SourceDocument,
} from "./types.js";

export interface PipelineMaskResult {
  sanitizedDocuments: SourceDocument[];
  mappings: MappingEntry[];
}

export function maskDocuments(
  docs: SourceDocument[],
  findings: Finding[],
): PipelineMaskResult {
  const counters = new Map<EntityType, number>();
  const placeholders = new Map<string, string>();
  const mappings: MappingEntry[] = [];

  const sanitizedDocuments = docs.map((doc) => {
    const docFindings = selectNonOverlappingFindings(
      findings.filter((finding) => finding.documentId === doc.id),
    ).sort((a, b) => a.start - b.start);

    let text = "";
    let cursor = 0;

    for (const finding of docFindings) {
      text += doc.text.slice(cursor, finding.start);
      const placeholder = placeholderFor(
        finding.entity,
        finding.value,
        counters,
        placeholders,
        mappings,
      );
      text += placeholder;
      cursor = finding.end;
    }

    text += doc.text.slice(cursor);

    return {
      ...doc,
      text,
    };
  });

  return { sanitizedDocuments, mappings };
}

function placeholderFor(
  type: EntityType,
  value: string,
  counters: Map<EntityType, number>,
  placeholders: Map<string, string>,
  mappings: MappingEntry[],
): string {
  const key = `${type}\u0000${value}`;
  const existing = placeholders.get(key);
  if (existing) return existing;

  const next = (counters.get(type) ?? 0) + 1;
  counters.set(type, next);
  const placeholder = `{{${type}_${String(next).padStart(3, "0")}}}`;
  placeholders.set(key, placeholder);
  mappings.push({ placeholder, value, type });
  return placeholder;
}

function selectNonOverlappingFindings(findings: Finding[]): Finding[] {
  const selected: Finding[] = [];
  const sorted = [...findings].sort(
    (a, b) =>
      priority(a.entity) - priority(b.entity) ||
      a.start - b.start ||
      b.end - b.start - (a.end - a.start),
  );

  for (const finding of sorted) {
    if (
      !selected.some(
        (existing) =>
          existing.start < finding.end && finding.start < existing.end,
      )
    ) {
      selected.push(finding);
    }
  }

  return selected;
}

function priority(type: EntityType): number {
  return type === "CUSTOM" ? 0 : 1;
}
