import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const shigyoOutDir = join("examples", "out", "shigyo");
const wordOutDir = join("examples", "out", "word_case");
const shigyoHandoffDir = join(shigyoOutDir, "handoff_package");
const wordHandoffDir = join(wordOutDir, "handoff_package");
const shigyoBlockedPatterns = [
  /山田太郎/,
  /taro\.yamada@example\.jp/,
  /03-1234-5678/,
  /東京都新宿区/,
  /99887766/,
];
const wordBlockedPatterns = [
  /佐藤花子/,
  /株式会社青葉工務店/,
  /hanako\.sato@example\.jp/,
  /070-2222-3333/,
  /WK-2026-0142/,
];

assertNoMatches(shigyoHandoffDir, shigyoBlockedPatterns);
assertNoMatches(join("examples", "shigyo", "partner_return"), shigyoBlockedPatterns);
assertMissing(join(shigyoHandoffDir, "mapping.local.json"));
assertChecksums(shigyoHandoffDir);

assertNoMatches(wordHandoffDir, wordBlockedPatterns);
assertNoMatches(join("examples", "word_case", "partner_return"), wordBlockedPatterns);
assertMissing(join(wordHandoffDir, "mapping.local.json"));
assertChecksums(wordHandoffDir);

console.log("Privacy audit passed.");

function assertNoMatches(root, patterns) {
  const text = readTree(root);
  const match = patterns.find((pattern) => pattern.test(text));

  if (match) {
    throw new Error(`${root} contains blocked demo value: ${match}`);
  }
}

function assertMissing(path) {
  if (existsSync(path)) {
    throw new Error(`Shareable package contains local-only file: ${path}`);
  }
}

function assertChecksums(root) {
  const checksumPath = join(root, "SHA256SUMS.txt");
  if (!existsSync(checksumPath)) {
    throw new Error(`Missing checksum manifest: ${checksumPath}`);
  }

  const lines = readFileSync(checksumPath, "utf8").trim().split(/\r?\n/);
  if (lines.length === 0) {
    throw new Error("Checksum manifest is empty.");
  }

  for (const line of lines) {
    const match = /^([a-f0-9]{64})  (.+)$/.exec(line);
    if (!match) {
      throw new Error(`Invalid checksum line: ${line}`);
    }

    const [, expected, relativePath] = match;
    const actual = createHash("sha256")
      .update(readFileSync(join(root, relativePath)))
      .digest("hex");

    if (actual !== expected) {
      throw new Error(`Checksum mismatch: ${relativePath}`);
    }
  }
}

function readTree(root) {
  if (!existsSync(root)) {
    throw new Error(`Missing audit directory: ${root}`);
  }

  return listFiles(root)
    .map((file) => readFileSync(file, "utf8"))
    .join("\n");
}

function listFiles(root) {
  return readdirSync(root).flatMap((entry) => {
    const path = join(root, entry);
    const stats = statSync(path);
    return stats.isDirectory() ? listFiles(path) : [path];
  });
}
