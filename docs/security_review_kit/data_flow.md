# データフロー

## 前提

Kuroko Handoff CLI は、ワークフロー検証用ツールです。ローカルファイルを読み書きするだけで、外部APIやサーバー送信を前提にしません。

対応する入力形式は Markdown、テキスト、CSV です。公開デモでは `examples/shigyo` の相談メールと顧客CSVを使います。

## 流れ

```text
社内の原文資料
  ├─ consultation_email.md
  └─ client_records.csv
        ↓ お客様環境内で実行
Kuroko Handoff CLI
  ├─ handoff_package/      社外パートナーへ共有する候補
  └─ local_only/           復元用mapping。社外共有しない

社外パートナー / 生成AI
  ↓ マスキング済みデータだけで作業
マスキング済み成果物
  ├─ partner_summary.md
  ├─ required_documents.md
  ├─ reply_draft.md
  └─ action_items.csv
        ↓ お客様環境内で復元
internal_restored/
  ├─ partner_summary.md
  ├─ required_documents.md
  ├─ reply_draft.md
  └─ action_items.csv
```

## 社外に出してよい候補

- `handoff_package/sanitized/`
- `handoff_package/partner_brief.md`
- `handoff_package/masking_report.md`
- `handoff_package/risk_register.md`
- `handoff_package/review_queue.md`
- `handoff_package/security_review.md`
- `handoff_package/acceptance_checklist.md`
- `handoff_package/audit_log.json`
- `handoff_package/SHA256SUMS.txt`

## 社外に出さないもの

- 原文資料
- `local_only/mapping.local.json`
- 復元キー、社内辞書、未確認の顧客名簿
- 社内規程で外部提供が禁止されている情報

この分離により、社外に出す情報を最小化しつつ、外部委託に必要な文脈を残す運用を検討できます。
