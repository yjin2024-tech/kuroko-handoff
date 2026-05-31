import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";

const shigyoOutDir = join("examples", "out", "shigyo");
const wordOutDir = join("examples", "out", "word_case");
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
const shigyoRestoredPatterns = [
  /山田太郎/,
  /株式会社さくら製作所/,
  /SG-2026-0001/,
  /12万円/,
  /35万円/,
  /48万円/,
];
const wordRestoredPatterns = [
  /佐藤花子/,
  /株式会社青葉工務店/,
  /hanako\.sato@example\.jp/,
  /WK-2026-0142/,
  /2026年7月15日/,
];

run("npm run build");
run("npm test");

rmSync(shigyoOutDir, { recursive: true, force: true });
rmSync(wordOutDir, { recursive: true, force: true });
run("npm run demo:package");
run("npm run demo:restore-package");
run("npm run demo:word-package");
run("npm run demo:word-restore-package");
run("npm run privacy:audit");

assertHasMatches(join(shigyoOutDir, "handoff_package"), [
  /セキュリティレビュー用メモ/,
  /匿名加工情報ではありません/,
  /local_only\/mapping\.local\.json/,
]);
assertNoMatches(join(shigyoOutDir, "handoff_package"), shigyoBlockedPatterns);
assertNoMatches(join("examples", "shigyo", "partner_return"), shigyoBlockedPatterns);
assertHasMatches(join(shigyoOutDir, "internal_restored"), shigyoRestoredPatterns);

assertHasMatches(join(wordOutDir, "handoff_package"), [
  /入力ファイルマニフェスト/,
  /request\.docx/,
  /request\.docx\.md/,
  /\.pdf is not supported in v0\.3/,
]);
assertNoMatches(join(wordOutDir, "handoff_package"), wordBlockedPatterns);
assertNoMatches(join("examples", "word_case", "partner_return"), wordBlockedPatterns);
assertHasMatches(join(wordOutDir, "internal_restored"), wordRestoredPatterns);

console.log("Demo verification passed.");

function run(command) {
  execSync(command, { stdio: "inherit" });
}

function assertNoMatches(root, patterns) {
  const text = readTree(root);
  const match = patterns.find((pattern) => pattern.test(text));

  if (match) {
    throw new Error(`${root} contains blocked demo value: ${match}`);
  }
}

function assertHasMatches(root, patterns) {
  const text = readTree(root);
  const missing = patterns.find((pattern) => !pattern.test(text));

  if (missing) {
    throw new Error(`${root} is missing expected restored value: ${missing}`);
  }
}

function readTree(root) {
  if (!existsSync(root)) {
    throw new Error(`Missing verification directory: ${root}`);
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
