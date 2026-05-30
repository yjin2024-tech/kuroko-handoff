import assert from "node:assert/strict";
import test from "node:test";
import { createRiskWarnings } from "../src/risk.ts";
import { createReviewQueueMarkdown } from "../src/review.ts";
import type { Finding, SourceDocument } from "../src/types.ts";

test("creates risk warnings for address-like text and unmasked numeric strings", () => {
  const docs: SourceDocument[] = [
    {
      id: "consultation_email",
      sourcePath: "consultation_email.md",
      format: "md",
      text: "住所: 東京都新宿区西新宿1-2-3\n顧客番号 998877",
      contentHash: "a".repeat(64),
      labels: [],
    },
  ];

  const warnings = createRiskWarnings(docs);

  assert.deepEqual(
    warnings.map((warning) => [
      warning.documentId,
      warning.ruleId,
      warning.severity,
    ]),
    [
      ["consultation_email", "possible_address", "medium"],
      ["consultation_email", "unmasked_digits", "low"],
    ],
  );
});

test("creates localized review queue markdown without raw finding values", () => {
  const findings: Finding[] = [
    {
      id: "f1",
      documentId: "consultation_email",
      entity: "EMAIL",
      value: "taro@example.jp",
      start: 0,
      end: 15,
      detectorId: "email",
      confidence: "medium",
    },
  ];
  const markdown = createReviewQueueMarkdown(findings, [
    {
      id: "w1",
      documentId: "consultation_email",
      ruleId: "possible_address",
      label: "住所らしき記載",
      severity: "medium",
      excerpt: "東京都新宿区",
    },
  ]);

  assert.match(markdown, /# 人工確認キュー/);
  assert.match(markdown, /EMAIL/);
  assert.doesNotMatch(markdown, /taro@example.jp/);
  assert.match(markdown, /住所らしき記載/);
  assert.match(markdown, /辞書に追加して再実行/);
});
