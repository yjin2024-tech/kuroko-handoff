import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createAuditLog } from "../src/audit.ts";
import { writeHandoffPackage } from "../src/packageWriter.ts";
import type {
  Finding,
  MappingEntry,
  RiskWarning,
  SourceDocument,
} from "../src/types.ts";

test("writes handoff package without local mapping in shareable folder", () => {
  const outDir = mkdtempSync(join(tmpdir(), "kuroko-package-"));
  const docs: SourceDocument[] = [
    {
      id: "consultation_email",
      sourcePath: "consultation_email.md",
      format: "md",
      text: "{{CUSTOM_001}}様から相談です。",
      contentHash: "a".repeat(64),
      labels: ["consultation"],
    },
  ];
  const mappings: MappingEntry[] = [
    { placeholder: "{{CUSTOM_001}}", value: "山田太郎", type: "CUSTOM" },
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
  ];
  const warnings: RiskWarning[] = [];
  const auditLog = createAuditLog({
    projectId: "shigyo-demo",
    toolVersion: "0.1.0",
    sourceDocuments: docs,
    detectors: ["custom_dictionary"],
    outputFiles: [],
    findings,
    warnings,
  });

  writeHandoffPackage({
    outDir,
    projectTitle: "士業相談資料整理デモ",
    partnerPurpose: "相談内容の要約",
    partnerDoNotDo: ["原文情報やmappingの提供を求めない"],
    sanitizedDocuments: docs,
    mappings,
    findings,
    warnings,
    auditLog,
  });

  assert.equal(
    existsSync(
      join(outDir, "handoff_package", "sanitized", "consultation_email.md"),
    ),
    true,
  );
  assert.equal(existsSync(join(outDir, "handoff_package", "partner_brief.md")), true);
  assert.equal(existsSync(join(outDir, "handoff_package", "audit_log.json")), true);
  assert.equal(existsSync(join(outDir, "handoff_package", "SHA256SUMS.txt")), true);
  assert.equal(
    existsSync(join(outDir, "handoff_package", "mapping.local.json")),
    false,
  );
  assert.equal(existsSync(join(outDir, "local_only", "mapping.local.json")), true);

  const audit = readFileSync(
    join(outDir, "handoff_package", "audit_log.json"),
    "utf8",
  );
  assert.doesNotMatch(audit, /山田太郎/);
  const notice = readFileSync(
    join(outDir, "handoff_package", "DO_NOT_SHARE_mapping_notice.md"),
    "utf8",
  );
  assert.match(notice, /mapping.local.json/);
  const checksums = readFileSync(
    join(outDir, "handoff_package", "SHA256SUMS.txt"),
    "utf8",
  );
  assert.match(checksums, /^[a-f0-9]{64}  audit_log\.json/m);
  assert.match(checksums, /^[a-f0-9]{64}  sanitized\/consultation_email\.md/m);
});
