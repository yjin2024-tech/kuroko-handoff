import type { SourceDocument } from "./types.js";

export function classifyDocuments(docs: SourceDocument[]): SourceDocument[] {
  return docs.map((doc) => ({
    ...doc,
    labels: labelsFor(doc),
  }));
}

function labelsFor(doc: SourceDocument): string[] {
  const labels: string[] = [];
  const name = doc.id.toLowerCase();
  const text = doc.text;

  if (name.includes("consultation") || text.includes("相談")) {
    labels.push("consultation");
  }
  if (doc.format === "csv" || name.includes("record")) {
    labels.push("client_record");
  }
  if (/@|電話|email|mail|postal_code|address/.test(text)) {
    labels.push("contact");
  }
  if (/円|万円|請求|費用/.test(text)) {
    labels.push("money");
  }
  if (/案件|case|SG-\d{4}/i.test(text)) {
    labels.push("case_context");
  }

  return labels;
}
