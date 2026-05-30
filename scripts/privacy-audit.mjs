import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const outDir = join("examples", "out", "shigyo");
const handoffDir = join(outDir, "handoff_package");
const blockedPatterns = [
  /山田太郎/,
  /taro\.yamada@example\.jp/,
  /03-1234-5678/,
  /東京都新宿区/,
  /99887766/,
];

assertNoMatches(handoffDir, blockedPatterns);
assertNoMatches(join("examples", "shigyo", "partner_return"), blockedPatterns);
assertMissing(join(handoffDir, "mapping.local.json"));
assertChecksums(handoffDir);

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
