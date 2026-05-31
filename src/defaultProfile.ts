import type { PackageConfig } from "./types.js";

export function createDefaultPackageConfig(baseDir: string): PackageConfig {
  return {
    project: {
      id: "case-folder",
      title: "Kuroko Handoff ケースフォルダ",
      locale: "ja-JP",
    },
    baseDir,
    inputPaths: [],
    intake: {
      mode: "folder",
      maxFileBytes: 5 * 1024 * 1024,
      unsupportedPolicy: "record",
      blockedPolicy: "fail",
    },
    detection: { engine: "simple" },
    detectors: [
      { id: "email", type: "regex", entity: "EMAIL" },
      { id: "phone_jp", type: "regex", entity: "PHONE" },
      { id: "postal_code_jp", type: "regex", entity: "POSTAL_CODE" },
      { id: "amount_jpy", type: "regex", entity: "AMOUNT" },
      { id: "date_jp", type: "regex", entity: "DATE" },
      { id: "case_id", type: "regex", entity: "CASE_ID" },
    ],
    riskRules: [
      { id: "possible_address", label: "住所らしき記載", severity: "medium" },
      { id: "unmasked_digits", label: "未確認の数字列", severity: "low" },
    ],
    partnerBrief: {
      purpose:
        "マスキング済みの案件フォルダ資料をもとに、外部パートナーへ論点整理、必要書類、確認事項、返信案の作成を依頼する。",
      doNotDo: [
        "本人確認、法的判断、最終回答の代行をしないこと",
        "追加の個人情報、原本、復元用mappingの提供を求めないこと",
        "マスキング済み資料から本人や所在地を推測しようとしないこと",
      ],
    },
  };
}
