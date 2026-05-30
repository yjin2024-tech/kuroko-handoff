import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { ingestDocuments } from "../src/ingest.ts";

test("ingests markdown and csv into document models with hashes", () => {
  const dir = mkdtempSync(join(tmpdir(), "kuroko-ingest-"));
  const mdPath = join(dir, "consultation_email.md");
  const csvPath = join(dir, "client_records.csv");
  writeFileSync(mdPath, "# 相談\n山田太郎様から相談です。\n", "utf8");
  writeFileSync(
    csvPath,
    "case_id,name,email\nCASE-001,山田太郎,taro@example.jp\n",
    "utf8",
  );

  const docs = ingestDocuments([mdPath, csvPath]);

  assert.equal(docs.length, 2);
  assert.equal(docs[0].format, "md");
  assert.equal(docs[0].id, "consultation_email");
  assert.match(docs[0].contentHash, /^[a-f0-9]{64}$/);
  assert.equal(docs[1].format, "csv");
  assert.deepEqual(docs[1].csv?.headers, ["case_id", "name", "email"]);
  assert.equal(docs[1].csv?.rows[0].email, "taro@example.jp");
  assert.match(docs[1].text, /CASE-001/);
});

test("parses quoted csv cells with commas and escaped quotes", () => {
  const dir = mkdtempSync(join(tmpdir(), "kuroko-ingest-csv-"));
  const csvPath = join(dir, "client_records.csv");
  writeFileSync(
    csvPath,
    'case_id,note\nCASE-001,"展示会, Web改修, ""短納期""対応"\n',
    "utf8",
  );

  const [doc] = ingestDocuments([csvPath]);

  assert.equal(doc.format, "csv");
  assert.equal(
    doc.csv?.rows[0].note,
    '展示会, Web改修, "短納期"対応',
  );
});

test("rejects unsupported input formats with a clear error", () => {
  const dir = mkdtempSync(join(tmpdir(), "kuroko-ingest-unsupported-"));
  const pdfPath = join(dir, "scan.pdf");
  writeFileSync(pdfPath, "not a real pdf", "utf8");

  assert.throws(
    () => ingestDocuments([pdfPath]),
    /Unsupported input format: \.pdf/,
  );
});

test("ingests empty text files with a stable empty-content hash", () => {
  const dir = mkdtempSync(join(tmpdir(), "kuroko-ingest-empty-"));
  const txtPath = join(dir, "empty.txt");
  writeFileSync(txtPath, "", "utf8");

  const [doc] = ingestDocuments([txtPath]);

  assert.equal(doc.format, "txt");
  assert.equal(doc.text, "");
  assert.equal(
    doc.contentHash,
    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  );
});
