# 黒子AI / Kuroko AI

Kuroko Handoff は、士業事務所や中小企業が外部AI・外部パートナーへ資料を渡す前に、ローカル環境でマスキング済みの共有パッケージを作るための CLI デモです。

Microsoft Presidio の代替でも、法的な匿名化・匿名加工情報生成プロダクトでもありません。日本の業務委託で使う資料を、顧客環境内で partner-safe な形に整え、復元用マッピングを社内に残し、外部パートナーの成果物を社内で復元し、レビュー証跡を残すための local-first handoff workflow です。

目的は「原文をそのまま渡さずに、外部委託に必要な文脈だけを安全側に寄せて渡す」ことです。外部API、テレメトリ、クラウド送信は使いません。

## Demo Flow

1. 社内の相談資料をマスキングする
2. 外部パートナーへ `handoff_package` だけを渡す
3. 外部パートナーは placeholder のまま論点整理、必要資料リスト、返信案、タスク表を作る
4. 社内だけで `mapping.local.json` を使い、戻ってきた成果物を復元する

マスキングは、外部委託の文脈を消すためではありません。氏名、住所、連絡先、案件番号は伏せつつ、依頼内容、対象経費、期限、不足資料、作業範囲は残します。
以下はすべて公開デモ用の架空データです。

### 1. 社内の入力資料

```text
差出人: 山田太郎 <taro.yamada@example.jp>
案件番号: SG-2026-0001

株式会社さくら製作所では、金属加工部品の試作品を小ロットで受注しています。
2026年9月の展示会に合わせて、既存顧客向けの製品カタログと新規問い合わせ用のWebページを整備したいです。

- 対象経費: 製品カタログ制作費12万円、展示会ブース設営費35万円、Webページ改修費48万円
- 手元にある資料: 会社案内、直近の売上推移、カタログ制作の見積書
- まだ不足している資料: 展示会ブース設営の見積書、Webページ改修の見積書、事業目的の説明文
- 希望: 2026年6月10日までに、必要資料リスト、追加確認事項、お客様への返信案を整理したい
```

### 2. 外部共有用にマスキング

```text
差出人: {{CUSTOM_001}} <{{EMAIL_001}}>
案件番号: {{CASE_ID_001}}

{{CUSTOM_004}}では、金属加工部品の試作品を小ロットで受注しています。
2026年9月の展示会に合わせて、既存顧客向けの製品カタログと新規問い合わせ用のWebページを整備したいです。

- 対象経費: 製品カタログ制作費{{AMOUNT_001}}、展示会ブース設営費{{AMOUNT_002}}、Webページ改修費{{AMOUNT_003}}
- 手元にある資料: 会社案内、直近の売上推移、カタログ制作の見積書
- まだ不足している資料: 展示会ブース設営の見積書、Webページ改修の見積書、事業目的の説明文
- 希望: {{DATE_002}}までに、必要資料リスト、追加確認事項、お客様への返信案を整理したい
```

CSV は CSV のまま出力します。

```csv
case_id,client_name,contact_name,email,phone,postal_code,address,requested_at,deadline,project_type,budget
SG-2026-0001,株式会社さくら製作所,山田太郎,taro.yamada@example.jp,03-1234-5678,160-0022,東京都新宿区新宿1-2-3,2026年5月20日,2026年6月10日,販路開拓補助金の申請準備,95万円
```

```csv
case_id,client_name,contact_name,email,phone,postal_code,address,requested_at,deadline,project_type,budget
{{CASE_ID_001}},{{CUSTOM_004}},{{CUSTOM_001}},{{EMAIL_001}},{{PHONE_001}},{{POSTAL_CODE_001}},{{CUSTOM_002}},{{DATE_001}},{{DATE_002}},販路開拓補助金の申請準備,{{AMOUNT_004}}
```

復元用の対応表は `local_only/mapping.local.json` にだけ保存されます。外部パートナーに渡すのは `handoff_package` だけです。

### 3. 社外から戻ってきた成果物

```text
{{CUSTOM_001}}様からの相談は、{{CUSTOM_004}}の販路開拓に関する補助金申請準備です。
現時点で読み取れる対象経費は、製品カタログ制作費{{AMOUNT_001}}、展示会ブース設営費{{AMOUNT_002}}、Webページ改修費{{AMOUNT_003}}です。
希望納期は{{DATE_002}}であり、それまでに必要資料リスト、追加確認事項、お客様への返信案を整理する必要があります。

- 氏名、連絡先、住所、案件番号が伏せられていても、対象経費、申請目的、手元資料、不足資料、希望納期は読み取れます。
- 外部パートナー側では、制度要件への最終適合判断ではなく、資料不足の洗い出しと返信案作成までなら進められます。
```

外部成果物には、論点整理、必要資料リスト、返信案、タスクCSVが含まれます。

### 4. 社内で復元した完成品

```text
山田太郎様からの相談は、株式会社さくら製作所の販路開拓に関する補助金申請準備です。
現時点で読み取れる対象経費は、製品カタログ制作費12万円、展示会ブース設営費35万円、Webページ改修費48万円です。
希望納期は2026年6月10日であり、それまでに必要資料リスト、追加確認事項、お客様への返信案を整理する必要があります。
```

```csv
case_id,priority,recipient,next_action,reason,owner
SG-2026-0001,high,山田太郎,展示会ブース設営とWebページ改修の見積書を依頼,対象経費35万円と48万円の根拠資料が不足しているため,internal
```

## 何を示すデモか

- 複数ファイルの入力を読み取り、同じ値には同じプレースホルダーを割り当てる
- 設定ファイルで検出器を選び、辞書と正規表現を組み合わせる
- 共有用 `handoff_package` と社内保管用 `local_only` を分離する
- 社外から戻った成果物を、社内だけで `mapping.local.json` により復元する
- 共有用レポートには検出値の原文を出さない
- 住所らしき残存や長い数字列を確認キューへ回す
- 実行ログには入力本文ではなくハッシュと件数だけを残す

これは企業向け DLP 製品でも、法的な匿名加工情報生成ツールでもありません。外部委託・生成AI活用の前段で、情シス、法務、業務部門が確認しやすい受け渡し単位を作るための実装例です。

## セットアップ

```bash
npm install
```

## 検証

```bash
npm run verify
```

このコマンドは TypeScript build、テスト、デモ生成、復元、公開用パッケージ内の残存デモ個人情報チェックをまとめて実行します。
共有用パッケージには `SHA256SUMS.txt` も生成されるため、受け渡し前後のファイル改変確認に使えます。

## 士業相談資料デモ

```bash
npm run demo:package
npm run demo:restore-package
```

実行内容:

```bash
node --import tsx src/cli.ts package --config examples/shigyo/config.json --out examples/out/shigyo
node --import tsx src/cli.ts restore-package --input examples/shigyo/partner_return --mapping examples/out/shigyo/local_only/mapping.local.json --out examples/out/shigyo/internal_restored
```

出力:

```text
examples/out/shigyo/
  handoff_package/
    sanitized/
    partner_brief.md
    masking_report.md
    risk_register.md
    review_queue.md
    acceptance_checklist.md
    DO_NOT_SHARE_mapping_notice.md
    security_review.md
    input_manifest.md
    input_manifest.json
    audit_log.json
    SHA256SUMS.txt
  local_only/
    mapping.local.json
  internal_restored/
    partner_summary.md
    action_items.csv
    required_documents.md
    reply_draft.md
```

外部パートナーへ渡す対象は `handoff_package` だけです。`local_only/mapping.local.json` は復元用の社内保管ファイルで、委託先、外部AI、チャットツールには共有しません。

## Word案件フォルダデモ

v0.3 では、明示的なファイルリストだけでなく、案件フォルダをスキャンして handoff package を作成できます。

```bash
npm run demo:word-package
npm run demo:word-restore-package
```

実行内容:

```bash
node scripts/create-word-case-fixture.mjs
node --import tsx src/cli.ts package --config examples/word_case/config.json --input-dir examples/word_case/case_folder --out examples/out/word_case
node --import tsx src/cli.ts restore-package --input examples/word_case/partner_return --mapping examples/out/word_case/local_only/mapping.local.json --out examples/out/word_case/internal_restored
```

このデモでは、`request.docx`、`meeting_notes.md`、`customer_records.csv` を処理対象にし、`reference.pdf` は未対応ファイルとして `input_manifest` に記録します。Office の一時ファイル `~$draft.docx` はスキップされます。

Word `.docx` はローカルで本文を抽出し、共有用には `request.docx.md` として出力します。v0.3 では Word のレイアウト保存は目的にしていません。

## 技術的な見どころ

- `package` コマンドで `ingest -> classify -> detect -> mask -> review -> package -> audit` を一連の処理として実行
- Markdown、テキスト、CSV、Word `.docx` の入力に対応
- `--input-dir` で案件フォルダをスキャンし、対応、未対応、スキップ対象を `input_manifest` に記録
- Word `.docx` はローカルで本文を抽出し、共有用 Markdown として出力
- 辞書検出を優先し、重複範囲の広い正規表現検出と競合しにくいマスキング処理
- プロジェクト全体で安定したプレースホルダー採番
- 共有用の `review_queue.md` には検出値を出さず、範囲、検出器、信頼度だけを表示
- 残存リスク検出で見つけた値は `{{REVIEW_REQUIRED_001}}` のように再マスキング
- `restore-package` で、外部成果物フォルダ内の Markdown / CSV をまとめて社内復元
- `audit_log.json` は監査用メタデータのみを保持し、原文本文を含めない

## Known Limitations

- これは匿名加工情報 tooling ではありません。
- これは技術デモであり、Microsoft Presidio、企業向け DLP 製品、法的な匿名化プロダクトの代替ではありません。
- 自動検出は機微情報を見落とす可能性があります。
- 外部共有前には必ず人によるレビューが必要です。
- CSV は基本的な quoted cell と escaped quote に対応しますが、複雑な改行入りセルや特殊エンコーディングは対象外です。
- v0.3 の入力対応は Markdown、テキスト、CSV、Word `.docx` です。
- v0.3 の Word 出力は sanitized Markdown であり、Word レイアウトやコメント、変更履歴の完全保持は対象外です。
- Excel、PowerPoint、PDF、画像、OCR の対応は future work です。
- 実データへ適用する前に、必ず社内規程、委託契約、保存期間、削除手順を確認してください。

## セキュリティ確認資料

`docs/security_review_kit` に、情シス・法務・業務部門向けの確認資料を置いています。

- `README.md`
- `data_flow.md`
- `review_checklist.md`
- `operations.md`
