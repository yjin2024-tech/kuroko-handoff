import { basename } from "node:path";
import type { EntityType, MaskResult } from "./types.js";

const LABELS: Record<EntityType, string> = {
  CUSTOM: "カスタム辞書",
  PERSON_NAME: "氏名",
  COMPANY_NAME: "会社名",
  DEPARTMENT: "部署",
  ROLE_TITLE: "役職",
  EMAIL: "メールアドレス",
  PHONE: "電話番号",
  POSTAL_CODE: "郵便番号",
  ADDRESS: "住所",
  AMOUNT: "金額",
  DATE: "日付",
  CUSTOMER_ID: "顧客ID",
  CASE_ID: "案件番号",
  INVOICE_ID: "請求書番号",
  CONTRACT_ID: "契約番号",
  PROJECT_NAME: "プロジェクト名",
  REVIEW_REQUIRED: "人工確認",
};

export function createMaskingReport(args: {
  inputFile: string;
  generatedAt: string;
  result: MaskResult;
}): string {
  const counts = countByType(args.result);
  const customHits = args.result.mappings.filter(
    (entry) => entry.type === "CUSTOM",
  );

  return [
    "# マスキングレポート",
    "",
    "このレポートは、社外パートナーや生成AIに渡す前の確認用です。",
    "本ツールは公開レビュー用の最小デモであり、情報漏えいリスクを下げるためのワークフロー検証用ツールです。",
    "",
    "## 実行情報",
    "",
    `- 入力ファイル: \`${basename(args.inputFile)}\``,
    `- 実行日時: ${args.generatedAt}`,
    "- 処理場所: お客様環境内でのローカル処理を想定",
    "",
    "## 検出カテゴリ",
    "",
    "| 分類 | 件数 |",
    "| --- | ---: |",
    ...Object.entries(LABELS).map(
      ([type, label]) => `| ${label} | ${counts[type as EntityType] ?? 0} |`,
    ),
    "",
    "## カスタム辞書ヒット",
    "",
    ...(customHits.length > 0
      ? customHits.map((entry) => `- ${entry.placeholder}: ${entry.value}`)
      : ["- なし"]),
    "",
    "## 人工確認が必要な点",
    "",
    "- マスキング後の本文を目視確認し、社外に出せない情報が残っていないか確認してください。",
    "- 文脈上の機密情報、業界固有の略称、個別案件名は自動検出できない場合があります。",
    "- 本デモは匿名加工情報を作成するものではなく、法的な適合性を保証するものでもありません。",
    "- 復元用の mapping.json は委託先や外部AIに渡さず、手元で管理してください。",
    "",
  ].join("\n");
}

function countByType(result: MaskResult): Partial<Record<EntityType, number>> {
  return result.acceptedMatches.reduce<Partial<Record<EntityType, number>>>(
    (counts, match) => {
      counts[match.type] = (counts[match.type] ?? 0) + 1;
      return counts;
    },
    {},
  );
}
