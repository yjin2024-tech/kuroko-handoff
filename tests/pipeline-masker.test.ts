import assert from "node:assert/strict";
import test from "node:test";
import { maskDocuments } from "../src/pipelineMasker.ts";
import type { Finding, SourceDocument } from "../src/types.ts";

test("masks multiple documents with stable project-wide placeholders", () => {
  const docs: SourceDocument[] = [
    {
      id: "consultation_email",
      sourcePath: "consultation_email.md",
      format: "md",
      text: "山田太郎様から相談。連絡先 taro@example.jp",
      contentHash: "a".repeat(64),
      labels: [],
    },
    {
      id: "client_records",
      sourcePath: "client_records.csv",
      format: "csv",
      text: "name: 山田太郎\nemail: taro@example.jp",
      contentHash: "b".repeat(64),
      labels: [],
      csv: {
        headers: ["name", "email"],
        rows: [{ name: "山田太郎", email: "taro@example.jp" }],
      },
    },
  ];
  const findings: Finding[] = [
    {
      id: "f1",
      documentId: "consultation_email",
      entity: "CUSTOM",
      value: "山田太郎",
      start: 0,
      end: 4,
      detectorId: "custom_dictionary",
      confidence: "high",
    },
    {
      id: "f2",
      documentId: "consultation_email",
      entity: "EMAIL",
      value: "taro@example.jp",
      start: 16,
      end: 31,
      detectorId: "email",
      confidence: "medium",
    },
    {
      id: "f3",
      documentId: "client_records",
      entity: "CUSTOM",
      value: "山田太郎",
      start: 6,
      end: 10,
      detectorId: "custom_dictionary",
      confidence: "high",
    },
    {
      id: "f4",
      documentId: "client_records",
      entity: "EMAIL",
      value: "taro@example.jp",
      start: 18,
      end: 33,
      detectorId: "email",
      confidence: "medium",
    },
  ];

  const result = maskDocuments(docs, findings);

  assert.match(result.sanitizedDocuments[0].text, /\{\{CUSTOM_001\}\}/);
  assert.match(result.sanitizedDocuments[1].text, /\{\{CUSTOM_001\}\}/);
  assert.equal(result.mappings.length, 2);
  assert.deepEqual(
    result.mappings.map((entry) => [
      entry.placeholder,
      entry.value,
      entry.type,
    ]),
    [
      ["{{CUSTOM_001}}", "山田太郎", "CUSTOM"],
      ["{{EMAIL_001}}", "taro@example.jp", "EMAIL"],
    ],
  );
});
