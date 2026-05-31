import { createHash } from "node:crypto";
import {
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, join, relative } from "node:path";
import { createReviewQueueMarkdown } from "./review.js";
import type {
  AuditLog,
  Finding,
  MappingEntry,
  RiskWarning,
  IntakeManifest,
  SourceDocument,
} from "./types.js";

export function writeHandoffPackage(args: {
  outDir: string;
  projectTitle: string;
  partnerPurpose: string;
  partnerDoNotDo: string[];
  sanitizedDocuments: SourceDocument[];
  mappings: MappingEntry[];
  findings: Finding[];
  warnings: RiskWarning[];
  intakeManifest?: IntakeManifest;
  auditLog: AuditLog;
}): void {
  const handoffDir = join(args.outDir, "handoff_package");
  const sanitizedDir = join(handoffDir, "sanitized");
  const localOnlyDir = join(args.outDir, "local_only");

  mkdirSync(sanitizedDir, { recursive: true });
  mkdirSync(localOnlyDir, { recursive: true });

  for (const doc of args.sanitizedDocuments) {
    writeFileSync(
      join(sanitizedDir, doc.outputName ?? basename(doc.sourcePath)),
      doc.text,
      "utf8",
    );
  }

  writeFileSync(
    join(localOnlyDir, "mapping.local.json"),
    `${JSON.stringify({ version: 1, mappings: args.mappings }, null, 2)}\n`,
    "utf8",
  );
  writeFileSync(
    join(handoffDir, "partner_brief.md"),
    createPartnerBrief(args.projectTitle, args.partnerPurpose, args.partnerDoNotDo),
    "utf8",
  );
  writeFileSync(
    join(handoffDir, "masking_report.md"),
    createMaskingReport(args.findings),
    "utf8",
  );
  writeFileSync(
    join(handoffDir, "risk_register.md"),
    createRiskRegister(args.warnings),
    "utf8",
  );
  writeFileSync(
    join(handoffDir, "review_queue.md"),
    createReviewQueueMarkdown(args.findings, args.warnings),
    "utf8",
  );
  writeFileSync(
    join(handoffDir, "acceptance_checklist.md"),
    createAcceptanceChecklist(),
    "utf8",
  );
  writeFileSync(
    join(handoffDir, "DO_NOT_SHARE_mapping_notice.md"),
    createMappingNotice(),
    "utf8",
  );
  writeFileSync(
    join(handoffDir, "security_review.md"),
    createSecurityReview(args.auditLog.runId),
    "utf8",
  );
  if (args.intakeManifest) {
    writeFileSync(
      join(handoffDir, "input_manifest.md"),
      createInputManifestMarkdown(args.intakeManifest),
      "utf8",
    );
    writeFileSync(
      join(handoffDir, "input_manifest.json"),
      `${JSON.stringify(toPublicInputManifest(args.intakeManifest), null, 2)}\n`,
      "utf8",
    );
  }
  writeFileSync(
    join(handoffDir, "audit_log.json"),
    `${JSON.stringify(args.auditLog, null, 2)}\n`,
    "utf8",
  );
  writeFileSync(
    join(handoffDir, "SHA256SUMS.txt"),
    createChecksumManifest(handoffDir),
    "utf8",
  );
}

function createInputManifestMarkdown(manifest: IntakeManifest): string {
  return [
    "# 入力ファイルマニフェスト",
    "",
    `生成日時: ${manifest.generatedAt}`,
    `スキャン対象: .`,
    `検出ファイル数: ${manifest.totalFiles}`,
    "",
    "| ファイル | 状態 | 理由 | 形式 | サイズ |",
    "| --- | --- | --- | --- | ---: |",
    ...manifest.entries.map(
      (entry) =>
        `| ${entry.relativePath} | ${entry.status} | ${entry.reason} | ${entry.format ?? "-"} | ${entry.sizeBytes} |`,
    ),
    "",
    "このマニフェストには原文本文を含めません。",
    "",
  ].join("\n");
}

function toPublicInputManifest(manifest: IntakeManifest) {
  return {
    rootDir: ".",
    generatedAt: manifest.generatedAt,
    totalFiles: manifest.totalFiles,
    entries: manifest.entries.map((entry) => ({
      relativePath: entry.relativePath,
      status: entry.status,
      reason: entry.reason,
      sizeBytes: entry.sizeBytes,
      format: entry.format,
      sha256: entry.sha256,
    })),
  };
}

function createPartnerBrief(
  projectTitle: string,
  purpose: string,
  doNotDo: string[],
): string {
  return [
    `# ${projectTitle} 外部パートナー向けブリーフ`,
    "",
    "## 依頼目的",
    "",
    purpose,
    "",
    "## 依頼したい作業",
    "",
    "- 相談内容の要約",
    "- 必要書類リストの整理",
    "- 追加確認事項の洗い出し",
    "- 顧客返信案の作成",
    "",
    "## 依頼しないこと",
    "",
    ...doNotDo.map((item) => `- ${item}`),
    "- 原文情報、復元用mapping、未マスキング資料の提供を求めないこと",
    "",
  ].join("\n");
}

function createMaskingReport(findings: Finding[]): string {
  const counts = findings.reduce<Record<string, number>>((acc, finding) => {
    acc[finding.entity] = (acc[finding.entity] ?? 0) + 1;
    return acc;
  }, {});

  return [
    "# マスキングレポート",
    "",
    "| 分類 | 件数 |",
    "| --- | ---: |",
    ...Object.entries(counts).map(([entity, count]) => `| ${entity} | ${count} |`),
    "",
    "検出値の原文は共有用レポートには表示しません。",
    "",
  ].join("\n");
}

function createRiskRegister(warnings: RiskWarning[]): string {
  return [
    "# リスクレジスター",
    "",
    ...(warnings.length > 0
      ? warnings.map(
          (warning) =>
            `- ${warning.documentId}: ${warning.label} (${warning.severity}) / ${warning.ruleId}`,
        )
      : ["- 現時点の自動チェックでは追加リスク警告なし"]),
    "",
    "この一覧は自動確認の補助です。社外共有前に必ず人工確認してください。",
    "",
  ].join("\n");
}

function createAcceptanceChecklist(): string {
  return [
    "# 受入確認チェックリスト",
    "",
    "- [ ] マスキング済み資料に原文の氏名、住所、連絡先が残っていない。",
    "- [ ] mapping.local.json を社外パートナーや外部AIに共有していない。",
    "- [ ] 外部パートナーの作業範囲がブリーフ内に収まっている。",
    "- [ ] 復元と最終確認はお客様環境内で行う。",
    "",
  ].join("\n");
}

function createMappingNotice(): string {
  return [
    "# 共有禁止ファイルについて",
    "",
    "`local_only/mapping.local.json` は復元用ファイルです。",
    "社外パートナー、外部AI、委託先には共有しないでください。",
    "",
  ].join("\n");
}

function createSecurityReview(runId: string): string {
  return [
    "# セキュリティレビュー用メモ",
    "",
    `Run ID: ${runId}`,
    "",
    "## このツールで行うこと",
    "",
    "- 入力フォルダまたは設定ファイルの対象資料をローカルで読み取り、対応形式だけを処理します。",
    "- `input_manifest.md` と `input_manifest.json` に、処理対象、未対応、スキップしたファイルを記録します。",
    "- 原文資料から検出した個人情報や案件識別子をプレースホルダーへ置換します。",
    "- 復元用の対応表を `local_only/mapping.local.json` に保存します。",
    "- 社外共有前の確認を補助するため、マスキング結果、リスク、監査ログを生成します。",
    "",
    "## 社外パートナーへ共有してよい範囲",
    "",
    "- `handoff_package/` 配下のマスキング済み資料とレビュー用資料。",
    "- パートナー向けブリーフに書かれた依頼範囲内の作業に必要な情報。",
    "",
    "## 共有してはいけないもの",
    "",
    "- `local_only/mapping.local.json` と、復元に使える対応表や原文資料。",
    "- マスキング前の氏名、住所、連絡先、案件番号、その他の機密情報。",
    "",
    "## 重要な限界",
    "",
    "- この出力は匿名加工情報ではありません。",
    "- 自動マスキングは完全ではないため、社外共有前に必ず人工確認してください。",
    "- 復元と最終確認はお客様環境内で行ってください。",
    "",
  ].join("\n");
}

function createChecksumManifest(rootDir: string): string {
  return listFiles(rootDir)
    .filter((file) => basename(file) !== "SHA256SUMS.txt")
    .map((file) => {
      const relativePath = relative(rootDir, file).replaceAll("\\", "/");
      const digest = createHash("sha256").update(readFileSync(file)).digest("hex");
      return `${digest}  ${relativePath}`;
    })
    .sort((a, b) => a.localeCompare(b))
    .join("\n")
    .concat("\n");
}

function listFiles(rootDir: string): string[] {
  return readdirSync(rootDir).flatMap((entry) => {
    const path = join(rootDir, entry);
    const stats = statSync(path);
    return stats.isDirectory() ? listFiles(path) : [path];
  });
}
