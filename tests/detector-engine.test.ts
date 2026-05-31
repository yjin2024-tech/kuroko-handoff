import assert from "node:assert/strict";
import test from "node:test";
import { resolveDetectorEngine } from "../src/detectorEngines.ts";
import type { PackageConfig, SourceDocument } from "../src/types.ts";

const baseConfig: PackageConfig = {
  project: { id: "demo", title: "Demo", locale: "ja-JP" },
  baseDir: ".",
  inputPaths: ["input.md"],
  dictionaryPath: "dictionary.txt",
  detection: { engine: "simple" },
  detectors: [
    { id: "person_dictionary", type: "dictionary", entity: "PERSON_NAME" },
    { id: "email", type: "regex", entity: "EMAIL" },
    { id: "case_id", type: "regex", entity: "CASE_ID" },
  ],
  riskRules: [],
  partnerBrief: { purpose: "要約", doNotDo: ["原文確認"] },
};

const docs: SourceDocument[] = [
  {
    id: "consultation_email",
    sourcePath: "consultation_email.md",
    format: "md",
    text: "案件ID: SG-2026-0001\n山田太郎様 email taro@example.jp",
    contentHash: "a".repeat(64),
    labels: [],
  },
];

test("simple detector engine returns configured findings", () => {
  const engine = resolveDetectorEngine(baseConfig);

  const findings = engine.detect({
    docs,
    config: baseConfig,
    dictionaryTerms: ["山田太郎"],
  });

  assert.deepEqual(
    findings.map((finding) => [
      finding.entity,
      finding.value,
      finding.detectorId,
    ]),
    [
      ["PERSON_NAME", "山田太郎", "person_dictionary"],
      ["EMAIL", "taro@example.jp", "email"],
      ["CASE_ID", "SG-2026-0001", "case_id"],
    ],
  );
});

test("presidio detector engine is an explicit unsupported adapter boundary", () => {
  const config: PackageConfig = {
    ...baseConfig,
    detection: { engine: "presidio" },
  };

  const engine = resolveDetectorEngine(config);

  assert.throws(
    () => engine.detect({ docs, config, dictionaryTerms: ["山田太郎"] }),
    /Presidio engine is configured but no adapter command was provided/,
  );
});
