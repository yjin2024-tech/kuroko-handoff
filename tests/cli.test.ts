import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

test("CLI masks text, writes report, and restores original text", () => {
  const workspace = mkdtempSync(join(tmpdir(), "safe-handoff-"));
  const inputPath = join(workspace, "input.txt");
  const dictPath = join(workspace, "dictionary.txt");
  const outDir = join(workspace, "out");
  const restoredPath = join(workspace, "restored.txt");
  const input =
    "青葉行政書士事務所の担当 田中花子様より、2026年4月12日に48万円のWebページ改修相談がありました。連絡先は demo@example.jp / 03-1234-5678 です。";

  writeFileSync(inputPath, input, "utf8");
  writeFileSync(dictPath, "青葉行政書士事務所\n田中花子\n", "utf8");

  const maskRun = spawnSync(
    process.execPath,
    [
      "--import",
      "tsx",
      "src/cli.ts",
      "mask",
      "--input",
      inputPath,
      "--dict",
      dictPath,
      "--out",
      outDir,
    ],
    { cwd: process.cwd(), encoding: "utf8" },
  );

  assert.equal(maskRun.status, 0, maskRun.stderr);

  const sanitized = readFileSync(join(outDir, "sanitized.txt"), "utf8");
  assert.match(sanitized, /\{\{CUSTOM_001\}\}/);
  assert.match(sanitized, /\{\{EMAIL_001\}\}/);
  assert.match(sanitized, /\{\{PHONE_001\}\}/);
  assert.match(sanitized, /\{\{DATE_001\}\}/);
  assert.match(sanitized, /\{\{AMOUNT_001\}\}/);

  const mapping = JSON.parse(
    readFileSync(join(outDir, "mapping.json"), "utf8"),
  );
  assert.equal(mapping.version, 1);
  assert.equal(mapping.mappings.length, 6);

  const report = readFileSync(join(outDir, "masking_report.md"), "utf8");
  assert.match(report, /入力ファイル/);
  assert.match(report, /人工確認/);
  assert.match(report, /情報漏えいリスクを下げる/);

  const restoreRun = spawnSync(
    process.execPath,
    [
      "--import",
      "tsx",
      "src/cli.ts",
      "restore",
      "--input",
      join(outDir, "sanitized.txt"),
      "--mapping",
      join(outDir, "mapping.json"),
      "--out",
      restoredPath,
    ],
    { cwd: process.cwd(), encoding: "utf8" },
  );

  assert.equal(restoreRun.status, 0, restoreRun.stderr);
  assert.equal(readFileSync(restoredPath, "utf8"), input);
});

test("CLI restores a returned partner deliverable folder with local mapping", () => {
  const workspace = mkdtempSync(join(tmpdir(), "safe-handoff-return-"));
  const returnDir = join(workspace, "partner_return");
  const outDir = join(workspace, "internal_restored");
  const mappingPath = join(workspace, "mapping.local.json");

  mkdirSync(returnDir, { recursive: true });
  writeFileSync(
    join(returnDir, "partner_summary.md"),
    [
      "# 外部パートナー作業結果",
      "",
      "{{CUSTOM_001}}様には{{DATE_001}}までに追加資料を依頼してください。",
      "連絡先は{{EMAIL_001}}です。",
      "",
    ].join("\n"),
    "utf8",
  );
  writeFileSync(
    join(returnDir, "action_items.csv"),
    "case_id,owner,next_action\n{{CASE_ID_001}},{{CUSTOM_001}},{{DATE_001}}までに確認\n",
    "utf8",
  );
  writeFileSync(
    mappingPath,
    `${JSON.stringify(
      {
        version: 1,
        mappings: [
          { placeholder: "{{CUSTOM_001}}", value: "山田太郎", type: "CUSTOM" },
          { placeholder: "{{DATE_001}}", value: "2026年5月20日", type: "DATE" },
          { placeholder: "{{EMAIL_001}}", value: "taro.yamada@example.jp", type: "EMAIL" },
          { placeholder: "{{CASE_ID_001}}", value: "SG-2026-0001", type: "CASE_ID" },
        ],
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  const restoreRun = spawnSync(
    process.execPath,
    [
      "--import",
      "tsx",
      "src/cli.ts",
      "restore-package",
      "--input",
      returnDir,
      "--mapping",
      mappingPath,
      "--out",
      outDir,
    ],
    { cwd: process.cwd(), encoding: "utf8" },
  );

  assert.equal(restoreRun.status, 0, restoreRun.stderr);
  assert.equal(existsSync(join(outDir, "partner_summary.md")), true);
  assert.match(
    readFileSync(join(outDir, "partner_summary.md"), "utf8"),
    /山田太郎様には2026年5月20日までに追加資料/,
  );
  assert.equal(
    readFileSync(join(outDir, "action_items.csv"), "utf8"),
    "case_id,owner,next_action\nSG-2026-0001,山田太郎,2026年5月20日までに確認\n",
  );
});
