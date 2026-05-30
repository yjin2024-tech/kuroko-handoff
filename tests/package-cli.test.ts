import assert from "node:assert/strict";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

test("package command creates complete handoff package and local-only mapping", () => {
  const dir = mkdtempSync(join(tmpdir(), "kuroko-package-cli-"));
  const outDir = join(dir, "out");
  writeFileSync(
    join(dir, "consultation_email.md"),
    "山田太郎様。連絡先 taro@example.jp。住所 東京都新宿区西新宿1-2-3。案件 SG-2026-0001。",
    "utf8",
  );
  writeFileSync(
    join(dir, "client_records.csv"),
    "case_id,name,phone\nSG-2026-0001,山田太郎,03-1234-5678\n",
    "utf8",
  );
  writeFileSync(join(dir, "dictionary.txt"), "山田太郎\n", "utf8");
  writeFileSync(
    join(dir, "config.json"),
    JSON.stringify({
      project: { id: "shigyo-demo", title: "士業相談資料整理デモ", locale: "ja-JP" },
      inputs: ["consultation_email.md", "client_records.csv"],
      dictionary: "dictionary.txt",
      detectors: [
        { id: "custom_dictionary", type: "dictionary", entity: "CUSTOM" },
        { id: "email", type: "regex", entity: "EMAIL" },
        { id: "phone_jp", type: "regex", entity: "PHONE" },
        { id: "case_id", type: "regex", entity: "CASE_ID" },
      ],
      riskRules: [
        { id: "possible_address", label: "住所らしき記載", severity: "medium" },
      ],
      partnerBrief: {
        purpose: "相談内容の要約、必要書類リスト、追加確認事項の整理",
        doNotDo: ["原文情報やmappingの提供を求めない"],
      },
    }),
    "utf8",
  );

  const run = spawnSync(
    process.execPath,
    [
      "--import",
      "tsx",
      "src/cli.ts",
      "package",
      "--config",
      join(dir, "config.json"),
      "--out",
      outDir,
    ],
    { cwd: process.cwd(), encoding: "utf8" },
  );

  assert.equal(run.status, 0, run.stderr);
  assert.equal(existsSync(join(outDir, "handoff_package", "partner_brief.md")), true);
  assert.equal(existsSync(join(outDir, "handoff_package", "risk_register.md")), true);
  assert.equal(existsSync(join(outDir, "handoff_package", "review_queue.md")), true);
  assert.equal(existsSync(join(outDir, "handoff_package", "security_review.md")), true);
  assert.equal(existsSync(join(outDir, "handoff_package", "audit_log.json")), true);
  assert.equal(existsSync(join(outDir, "handoff_package", "SHA256SUMS.txt")), true);
  assert.equal(existsSync(join(outDir, "local_only", "mapping.local.json")), true);

  const securityReview = readFileSync(
    join(outDir, "handoff_package", "security_review.md"),
    "utf8",
  );
  assert.match(securityReview, /匿名加工情報ではありません/);
  assert.match(securityReview, /local_only\/mapping\.local\.json/);
  assert.match(securityReview, /社外パートナーへ共有してよい範囲/);

  const sanitized = readFileSync(
    join(outDir, "handoff_package", "sanitized", "consultation_email.md"),
    "utf8",
  );
  assert.match(sanitized, /\{\{CUSTOM_001\}\}/);
  assert.match(sanitized, /\{\{EMAIL_001\}\}/);
  assert.doesNotMatch(sanitized, /山田太郎/);
  assert.doesNotMatch(sanitized, /東京都新宿区/);

  const sanitizedCsv = readFileSync(
    join(outDir, "handoff_package", "sanitized", "client_records.csv"),
    "utf8",
  );
  assert.equal(
    sanitizedCsv,
    "case_id,name,phone\n{{CASE_ID_001}},{{CUSTOM_001}},{{PHONE_001}}\n",
  );

  const audit = readFileSync(join(outDir, "handoff_package", "audit_log.json"), "utf8");
  assert.doesNotMatch(audit, /山田太郎/);
  assert.match(audit, /shigyo-demo/);

  const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
    version: string;
  };
  const auditJson = JSON.parse(audit) as { toolVersion: string };
  assert.equal(auditJson.toolVersion, packageJson.version);
});
