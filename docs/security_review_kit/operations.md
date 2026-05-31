# 運用手順

## 1. 原文資料を準備する

原文はお客様環境内に保存します。Kuroko Handoff は Markdown、テキスト、CSV、Word `.docx` の入力に対応します。

公開デモでは以下を使います。

- `examples/shigyo/consultation_email.md`
- `examples/shigyo/client_records.csv`
- `examples/word_case/case_folder/request.docx`
- `examples/word_case/case_folder/meeting_notes.md`
- `examples/word_case/case_folder/customer_records.csv`

## 2. カスタム辞書を準備する

社名、氏名、事務所名、住所など、ルールだけでは検出しにくい語句を1行1件で記載します。

```text
山田太郎
株式会社さくら製作所
青葉行政書士事務所
東京都新宿区新宿1-2-3
```

## 3. 共有用パッケージを作成する

```bash
npm run demo:package
npm run demo:word-package
```

出力されるファイル:

- `examples/out/shigyo/handoff_package/`
- `examples/out/shigyo/local_only/mapping.local.json`

## 4. 人工確認を行う

`handoff_package` の中身を確認し、社外に出せない情報が残っていないか確認します。必要があればカスタム辞書を追加し、再実行します。

`security_review.md` で、共有してよい範囲、社内に残すファイル、匿名加工情報ではないことを確認します。

`input_manifest.md` で、処理対象、未対応ファイル、スキップファイルを確認します。v0.3 では PDF や Excel は処理せず、未対応として記録します。Word `.docx` は本文を抽出し、共有用には sanitized Markdown として出力します。

`local_only/mapping.local.json` は復元用のため、委託先や外部AIには渡しません。

## 5. 社外パートナーへ共有する

共有対象は `handoff_package` のみです。外部パートナーは、マスキング済み資料をもとに論点整理、必要資料リスト、返信案、タスク表などを作成します。

## 6. 戻ってきた成果物を社内で復元する

```bash
npm run demo:restore-package
npm run demo:word-restore-package
```

復元はお客様環境内で行います。復元後の `internal_restored` を使って、社内確認、資格者確認、受入確認を実施します。

## 7. 削除・保管を行う

案件終了後は、社内ルールに従って原文、mapping、成果物、中間ファイルを削除または保管します。保存期間と削除責任者を事前に決めておくことを推奨します。
