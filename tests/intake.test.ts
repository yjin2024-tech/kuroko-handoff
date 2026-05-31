import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { scanCaseFolder } from "../src/intake.ts";

test("scanCaseFolder classifies supported, skipped, unsupported, and blocked files", () => {
  const dir = mkdtempSync(join(tmpdir(), "kuroko-intake-"));
  mkdirSync(join(dir, "subdir"));
  writeFileSync(join(dir, "request.docx"), "fake docx bytes");
  writeFileSync(join(dir, "notes.md"), "山田太郎様からの相談です。", "utf8");
  writeFileSync(join(dir, "subdir", "records.csv"), "name,email\n山田太郎,taro@example.jp\n", "utf8");
  writeFileSync(join(dir, "reference.pdf"), "%PDF-demo");
  writeFileSync(join(dir, "~$draft.docx"), "temporary office file");
  writeFileSync(join(dir, "run.ps1"), "Write-Host danger", "utf8");

  const manifest = scanCaseFolder(dir);

  assert.equal(manifest.totalFiles, 6);
  assert.deepEqual(
    manifest.entries.map((entry) => [entry.relativePath, entry.status, entry.reason]),
    [
      ["notes.md", "accepted", "supported .md input"],
      ["reference.pdf", "unsupported", ".pdf is not supported in v0.3"],
      ["request.docx", "accepted", "supported .docx input"],
      ["run.ps1", "blocked", ".ps1 files are blocked and must not be processed"],
      ["subdir/records.csv", "accepted", "supported .csv input"],
      ["~$draft.docx", "skipped", "Office temporary file"],
    ],
  );

  const accepted = manifest.entries.filter((entry) => entry.status === "accepted");
  assert.deepEqual(
    accepted.map((entry) => [entry.relativePath, entry.format, entry.sha256.length]),
    [
      ["notes.md", "md", 64],
      ["request.docx", "docx", 64],
      ["subdir/records.csv", "csv", 64],
    ],
  );
});

test("scanCaseFolder applies configured max file size to supported files", () => {
  const dir = mkdtempSync(join(tmpdir(), "kuroko-intake-size-"));
  writeFileSync(join(dir, "small.txt"), "ok", "utf8");
  writeFileSync(join(dir, "large.txt"), "123456", "utf8");

  const manifest = scanCaseFolder(dir, { maxFileBytes: 4 });

  assert.deepEqual(
    manifest.entries.map((entry) => [entry.relativePath, entry.status, entry.reason]),
    [
      ["large.txt", "blocked", "file is larger than 4 bytes"],
      ["small.txt", "accepted", "supported .txt input"],
    ],
  );
});
