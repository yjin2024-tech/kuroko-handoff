import type { Finding, RiskWarning } from "./types.js";

export function createReviewQueueMarkdown(
  findings: Finding[],
  warnings: RiskWarning[],
): string {
  return [
    "# 人工確認キュー",
    "",
    "このファイルは、社外に共有する前に人が確認するための一覧です。",
    "検出値の原文はこの共有用ファイルには表示しません。",
    "",
    "## 検出された項目",
    "",
    ...findings.map(
      (finding) =>
        `- ${finding.documentId}: ${finding.entity} / range=${finding.start}-${finding.end} / detector=${finding.detectorId} / confidence=${finding.confidence}`,
    ),
    "",
    "## 注意が必要な項目",
    "",
    ...(warnings.length > 0
      ? warnings.map(
          (warning) =>
            `- ${warning.documentId}: ${warning.label} (${warning.severity}) / excerpt=${redactExcerpt(warning.excerpt)}`,
        )
      : ["- なし"]),
    "",
    "## 次の確認",
    "",
    "- 残っている社名、氏名、住所、案件番号があれば辞書に追加して再実行してください。",
    "- mapping.local.json は社外パートナーや外部AIに共有しないでください。",
    "",
  ].join("\n");
}

function redactExcerpt(excerpt: string): string {
  return excerpt.replace(/[^\s]/g, "＊").slice(0, 40);
}
