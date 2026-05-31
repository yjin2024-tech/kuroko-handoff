import type { MappingEntry, RiskWarning, SourceDocument } from "./types.js";

export function createRiskWarnings(docs: SourceDocument[]): RiskWarning[] {
  const warnings: RiskWarning[] = [];

  for (const doc of docs) {
    const addressMatch = doc.text.match(
      /(?:東京都|大阪府|京都府|北海道|.{2,3}県).{0,20}(?:区|市|町|村).{0,20}\d/,
    );
    if (addressMatch) {
      warnings.push({
        id: `${doc.id}:risk:${warnings.length + 1}`,
        documentId: doc.id,
        ruleId: "possible_address",
        label: "住所らしき記載",
        severity: "medium",
        excerpt: addressMatch[0],
      });
    }

    const numberMatch = doc.text.match(/\b\d{6,}\b/);
    if (numberMatch) {
      warnings.push({
        id: `${doc.id}:risk:${warnings.length + 1}`,
        documentId: doc.id,
        ruleId: "unmasked_digits",
        label: "未確認の数字列",
        severity: "low",
        excerpt: numberMatch[0],
      });
    }
  }

  return warnings;
}

export function redactRiskWarnings(
  docs: SourceDocument[],
  warnings: RiskWarning[],
): { documents: SourceDocument[]; mappings: MappingEntry[] } {
  const mappings: MappingEntry[] = [];
  const documents = docs.map((doc) => {
    let text = doc.text;
    const docWarnings = warnings.filter((warning) => warning.documentId === doc.id);

    for (const warning of docWarnings) {
      if (!warning.excerpt || !text.includes(warning.excerpt)) {
        continue;
      }

      let mapping = mappings.find((entry) => entry.value === warning.excerpt);
      if (!mapping) {
        mapping = {
          placeholder: `{{REVIEW_REQUIRED_${String(mappings.length + 1).padStart(3, "0")}}}`,
          value: warning.excerpt,
          type: "REVIEW_REQUIRED",
        };
        mappings.push(mapping);
      }

      text = text.replaceAll(warning.excerpt, mapping.placeholder);
    }

    return {
      ...doc,
      text,
    };
  });

  return { documents, mappings };
}
