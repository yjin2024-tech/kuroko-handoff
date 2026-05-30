import assert from "node:assert/strict";
import test from "node:test";
import { classifyDocuments } from "../src/classifier.ts";
import { detectFindings } from "../src/detectors.ts";
import type { DetectorConfig, SourceDocument } from "../src/types.ts";

const docs: SourceDocument[] = [
  {
    id: "consultation_email",
    sourcePath: "consultation_email.md",
    format: "md",
    text: "案件ID: SG-2026-0001\n山田太郎様 email taro@example.jp 電話 03-1234-5678",
    contentHash: "a".repeat(64),
    labels: [],
  },
  {
    id: "client_records",
    sourcePath: "client_records.csv",
    format: "csv",
    text: "postal_code: 160-0022\naddress: 東京都新宿区新宿1-2-3",
    contentHash: "b".repeat(64),
    labels: [],
  },
];

test("classifies documents using deterministic labels", () => {
  const classified = classifyDocuments(docs);

  assert.deepEqual(classified[0].labels, [
    "consultation",
    "contact",
    "case_context",
  ]);
  assert.deepEqual(classified[1].labels, ["client_record", "contact"]);
});

test("runs only configured detectors and returns document-scoped findings", () => {
  const detectors: DetectorConfig[] = [
    { id: "custom_dictionary", type: "dictionary", entity: "CUSTOM" },
    { id: "email", type: "regex", entity: "EMAIL" },
    { id: "case_id", type: "regex", entity: "CASE_ID" },
  ];

  const findings = detectFindings(docs, detectors, ["山田太郎"]);

  assert.deepEqual(
    findings.map((finding) => [
      finding.documentId,
      finding.entity,
      finding.value,
      finding.detectorId,
    ]),
    [
      ["consultation_email", "CUSTOM", "山田太郎", "custom_dictionary"],
      ["consultation_email", "EMAIL", "taro@example.jp", "email"],
      ["consultation_email", "CASE_ID", "SG-2026-0001", "case_id"],
    ],
  );
});

test("detects Japanese business outsourcing identifiers", () => {
  const detectors: DetectorConfig[] = [
    { id: "postal_code", type: "regex", entity: "POSTAL_CODE" },
    { id: "customer_id", type: "regex", entity: "CUSTOMER_ID" },
    { id: "invoice_id", type: "regex", entity: "INVOICE_ID" },
    { id: "contract_id", type: "regex", entity: "CONTRACT_ID" },
  ];
  const businessDocs: SourceDocument[] = [
    {
      id: "outsourcing_record",
      sourcePath: "outsourcing_record.txt",
      format: "txt",
      text: "郵便番号 160-0022 顧客ID CUST-2026-0142 請求書 INV-2026-0099 契約 CTR-2026-0007",
      contentHash: "c".repeat(64),
      labels: [],
    },
  ];

  const findings = detectFindings(businessDocs, detectors, []);

  assert.deepEqual(
    findings.map((finding) => [
      finding.documentId,
      finding.entity,
      finding.value,
      finding.detectorId,
    ]),
    [
      ["outsourcing_record", "POSTAL_CODE", "160-0022", "postal_code"],
      ["outsourcing_record", "CUSTOMER_ID", "CUST-2026-0142", "customer_id"],
      ["outsourcing_record", "INVOICE_ID", "INV-2026-0099", "invoice_id"],
      ["outsourcing_record", "CONTRACT_ID", "CTR-2026-0007", "contract_id"],
    ],
  );
});
