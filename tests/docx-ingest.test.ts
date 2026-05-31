import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { ingestDocuments } from "../src/ingest.ts";
import { createMinimalDocx } from "./helpers/docx.ts";

test("ingestDocuments extracts text from docx files", () => {
  const dir = mkdtempSync(join(tmpdir(), "kuroko-docx-ingest-"));
  const docxPath = join(dir, "request.docx");
  writeFileSync(
    docxPath,
    createMinimalDocx([
      "山田太郎様からの相談です。",
      "連絡先は taro@example.jp、案件 SG-2026-0001 です。",
    ]),
  );

  const [doc] = ingestDocuments([docxPath]);

  assert.equal(doc.format, "docx");
  assert.equal(doc.outputName, "request.docx.md");
  assert.match(doc.text, /山田太郎様からの相談です/);
  assert.match(doc.text, /taro@example\.jp/);
  assert.match(doc.text, /SG-2026-0001/);
  assert.equal(doc.contentHash.length, 64);
});
