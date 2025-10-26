# News Crawler - 開発記録

## プロジェクト概要

SNS・ニュースサイトから情報を収集し、世論の傾向を捉える分析アプリケーション。はてなブックマークRSSからデータを取得し、形態素解析によるキーワード抽出と辞書ベースの感情分析を行う。

## 技術スタック

- **言語**: JavaScript (ES Module)
- **ランタイム**: Node.js
- **将来的な拡張**: Electron (デスクトップアプリ化)
- **主要ライブラリ**:
  - `rss-parser` (RSSフィード解析)
  - `kuromoji` (日本語形態素解析)
  - `axios` (HTTP通信)

## 開発経過

### Phase 1: 要件定義とブレインストーミング

**初期要望**
- SNS（Twitter/X、Facebook、Instagram、Reddit、はてなブックマーク）からデータ取得
- ニュースサイト、ブログも対象
- 特定トピック（政治、経済、エンタメ）の分析
- 感情分析機能
- 個人利用（趣味・情報収集）

**技術的実現可能性の検証結果**
- **Twitter/X**: API有料化（月$100〜）、スクレイピング規約で禁止 → 見送り
- **Facebook/Instagram**: スクレイピング厳格禁止 → 見送り
- **Reddit**: 公式API無料枠あり（60req/min） → フェーズ2で検討
- **はてなブックマーク**: RSS提供、法的リスク最小 → MVP採用 ✅
- **ニュースサイト/ブログ**: RSS標準対応 → MVP採用 ✅

**MVP決定事項**
- データソース: はてなブックマークRSS + ニュースRSS
- 分析: 頻出キーワード抽出 + シンプル感情分析（辞書ベース）
- UI: コンソール出力（将来的にElectronダッシュボード化）
- 保存: 未実装（フェーズ2でSQLite検討）
- 更新頻度: 手動更新型

### Phase 2: プロトタイプ検証フェーズ

**目的**
- はてなブックマークRSS取得の実現可能性確認
- 日本語形態素解析の精度検証
- 感情分析の有効性確認

**実装内容**

#### 1. プロジェクト初期化
```bash
npm init -y
npm install rss-parser kuromoji axios
```

- ES Module設定 (`package.json`: `"type": "module"`)
- 4つのテストスクリプト用npm-scriptsを定義

#### 2. はてなブックマークRSS取得 (test-hatena.js)

**実装機能**
- 5カテゴリ対応（general, tech, entertainment, politics, economics）
- RSS URLマッピング定義
- 取得件数制限機能
- 複数カテゴリの並行取得機能

**データ構造**
```javascript
{
  title: "記事タイトル",
  link: "URL",
  pubDate: "公開日",
  contentSnippet: "概要テキスト"
}
```

**検証結果**
- ✅ 20件の記事を正常に取得
- ✅ 全カテゴリで安定動作
- ✅ レート制限なし（公開RSS）

#### 3. 形態素解析 + キーワード抽出 (test-analyzer.js)

**技術選定: kuromoji.js**
- 理由: 純粋JavaScript実装、外部依存なし、IPA辞書内蔵
- メリット: Node.js環境で完結、インストールが容易
- 辞書パス: `node_modules/kuromoji/dict/`

**実装機能**
- kuromoji tokenizer初期化
- 名詞抽出（一般、固有名詞、サ変接続のみ）
- 1文字の名詞を除外（ノイズ削減）
- 頻度カウント + TOP N取得

**検証結果**
- ✅ 20件の記事から561個の名詞を抽出
- ✅ 頻出キーワードTOP 30抽出（AI, Gemini, Google, LLMなど）
- ✅ 精度: ⭐⭐⭐⭐☆ (4/5) - 固有名詞、一般名詞の抽出は良好

**抽出サンプル**
```
TOP 10キーワード:
1. AI              12回
2. Gemini           9回
3. システム          5回
4. Google           5回
5. LLM              5回
```

#### 4. シンプル感情分析 (test-sentiment.js + sentiment-dictionary.js)

**アプローチ: 辞書ベース感情分析**
- ポジティブ単語リスト（約70語）: 良い、成功、嬉しい、向上 など
- ネガティブ単語リスト（約70語）: 悪い、失敗、危険、不安 など
- 強調語リスト: 非常、とても、すごく など（スコア×1.5）
- 否定語リスト: ない、無い、不 など（スコア反転）

**スコア算出ロジック**
```javascript
総合スコア = ポジティブスコア合計 - ネガティブスコア合計
sentiment = score > 0 ? 'positive' : score < 0 ? 'negative' : 'neutral'
```

**検証結果**
- ✅ 10件の記事を分析
- ✅ ポジティブ: 40%, ネガティブ: 10%, 中立: 50%
- ✅ 平均スコア: +0.65
- ⚠️ 精度: ⭐⭐⭐☆☆ (3/5) - 基本的な感情は検出可能だが文脈理解は不十分

**感情分析サンプル**
```
😊 ポジティブ記事: 「高市政権『新しい資本主義』廃止へ」
   スコア: +5.0
   キーワード: 新しい(+1), 成長(+1), 実現(+1)

😔 ネガティブ記事: 「サイバー攻撃によるシステム障害」
   スコア: -4.0
   キーワード: 攻撃(-1), 障害(-1), 不安(-1)
```

#### 5. 統合分析システム (test-integration.js)

**実装機能**
- RSS取得 → キーワード抽出 → 感情分析を一連で実行
- 分析結果レポート自動生成
  - 頻出キーワードTOP 10（棒グラフ表示）
  - 感情トレンド分析（ポジ/ネガ/中立の比率）
  - 感情別トップ記事（最もポジティブ/ネガティブな記事）
  - 注目トレンド（キーワード×感情のクロス分析）
- 複数カテゴリ比較機能

**レポート出力例**
```
🔑 頻出キーワード TOP 10
  1. 大臣           9回 █████
  2. クマ           8回 ████
  3. 高市           8回 ████

😊 感情トレンド分析
  平均感情スコア: -0.03
  ポジティブ: 6件 (30.0%) █████████
  ネガティブ: 5件 (25.0%) ████████
  中立:       9件 (45.0%) ██████████████

🔥 注目トレンド（頻出 × 感情）
  1. 😊 大臣 (9回出現, 感情: +1.3)
  2. 😐 クマ (8回出現, 感情: 0.0)
  3. 😊 総理 (6回出現, 感情: +2.2)
```

**カテゴリ比較機能**
```
📊 カテゴリ比較サマリー
カテゴリ      平均スコア  ポジ率  ネガ率  中立率
general       -0.03      30.0%   25.0%   45.0%
tech          +1.20      55.0%    5.0%   40.0%
politics      -0.30      20.0%   30.0%   50.0%
```

### Phase 3: 検証結果とまとめ

**✅ 成功した機能**
1. データ収集: はてなブックマークRSS（複数カテゴリ）
2. 形態素解析: kuromoji.jsで日本語テキストを正確に分析
3. キーワード抽出: 頻出名詞抽出、ノイズ除去も機能
4. 感情分析: 基本的なポジティブ/ネガティブ判定

**📊 精度評価**

| 機能 | 精度 | 評価 |
|------|------|------|
| データ収集 | ⭐⭐⭐⭐⭐ | 安定、法的リスク最小 |
| キーワード抽出 | ⭐⭐⭐⭐☆ | 固有名詞・一般名詞の抽出良好 |
| 感情分析 | ⭐⭐⭐☆☆ | 基本的な感情検出は可能、文脈理解に課題 |

**⚠️ 改善が必要な点**
1. 感情分析の精度（文脈理解、否定表現の扱い）
2. 複合語の扱い（「人工知能」を「人工」「知能」と分割）
3. データ永続化（現状は実行時のみ）

## 技術的な学び

### ES Module環境でのkuromoji.js

**課題**: 辞書パスの解決
```javascript
// ❌ 動作しない
const DICT_PATH = join(dirname(fileURLToPath(import.meta.resolve('kuromoji'))), 'dict');

// ✅ 動作する
const DICT_PATH = join(__dirname, 'node_modules', 'kuromoji', 'dict');
```

**解決策**: `__dirname`を使用した相対パス指定

```javascript
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
```

### kuromoji.js の形態素解析結果

**トークン構造**
```javascript
{
  word_id: 37600,
  word_type: "KNOWN",
  word_position: 1,
  surface_form: "今",          // 表層形（実際の単語）
  pos: "名詞",                 // 品詞
  pos_detail_1: "副詞可能",    // 品詞詳細1
  pos_detail_2: "*",
  pos_detail_3: "*",
  conjugated_type: "*",
  conjugated_form: "*",
  basic_form: "今",            // 基本形
  reading: "イマ",             // 読み
  pronunciation: "イマ"        // 発音
}
```

**名詞抽出の条件**
```javascript
const isNoun = token.pos === '名詞';
const isTargetType = ['一般', '固有名詞', 'サ変接続'].includes(token.pos_detail_1);
const isLongEnough = token.surface_form.length > 1;
```

### 感情分析の実装パターン

**シンプル辞書ベース vs ML/BERT**

| アプローチ | 精度 | 実装難易度 | 外部依存 | 推奨用途 |
|-----------|------|-----------|---------|----------|
| 辞書ベース | ⭐⭐⭐ | 低 | なし | プロトタイプ、MVP |
| ML-Ask | ⭐⭐⭐⭐ | 中 | Python | 本番環境（中精度） |
| BERT日本語 | ⭐⭐⭐⭐⭐ | 高 | Python, GPU | 本番環境（高精度） |

**プロトタイプでの結論**
- シンプル辞書ベースで十分な有用性を確認
- 将来的な精度向上はML-Ask、BERTを検討

### RSS解析のベストプラクティス

**rss-parser の使い方**
```javascript
import Parser from 'rss-parser';

const parser = new Parser();
const feed = await parser.parseURL('https://b.hatena.ne.jp/hotentry.rss');

feed.items.forEach(item => {
  console.log(item.title);       // タイトル
  console.log(item.link);        // URL
  console.log(item.pubDate);     // 公開日
  console.log(item.contentSnippet); // 概要
});
```

**レート制限対策**
```javascript
// 連続取得時は待機を挟む
for (const category of categories) {
  await fetchData(category);
  await new Promise(resolve => setTimeout(resolve, 1000));
}
```

## トラブルシューティング履歴

### 1. kuromoji辞書パスエラー

**問題**: `ENOENT: no such file or directory, open '.../base.dat.gz'`

**原因**: `import.meta.resolve()` で取得したパスが正しくない

**解決**:
```javascript
// Before
const DICT_PATH = join(dirname(fileURLToPath(import.meta.resolve('kuromoji'))), 'dict');

// After
const DICT_PATH = join(__dirname, 'node_modules', 'kuromoji', 'dict');
```

### 2. ES Module vs CommonJS

**問題**: プロジェクト作成時にCommonJS形式で初期化された

**解決**:
```json
// package.json
{
  "type": "module"
}
```

### 3. 感情分析の精度問題

**問題**: 「良くない」を「良い」と誤検出

**現状の対策**:
- 否定語チェック（1-2単語前を確認）
- 否定語が見つかった場合、スコアを反転

**今後の改善案**:
- より高度な文脈理解（係り受け解析）
- ML-Ask、BERT日本語モデルへの移行

## 未実装機能・今後の拡張案

### 優先度: 高（フェーズ2）

#### Electron化（デスクトップアプリ）
- [ ] React + TypeScriptでダッシュボードUI
- [ ] SQLiteでデータ永続化
- [ ] リアルタイム更新機能
- [ ] グラフ可視化（Chart.js、Recharts）
  - [ ] ワードクラウド
  - [ ] 時系列グラフ
  - [ ] 感情トレンドグラフ

**推定工数**: 2-3週間

#### データソース拡大
- [ ] Reddit API統合（無料枠60req/min）
- [ ] ニュースサイトRSS追加
  - [ ] NHK
  - [ ] 朝日新聞
  - [ ] 読売新聞
  - [ ] 日経新聞
- [ ] ブログRSS追加
  - [ ] はてなブログ
  - [ ] note

**推定工数**: 1週間

### 優先度: 中（フェーズ3）

#### 分析精度向上
- [ ] 感情分析の高度化
  - [ ] ML-Ask統合（Python child_process）
  - [ ] BERT日本語モデル（将来的）
- [ ] トピックモデリング（LDA）
- [ ] 時系列分析（トレンド変化の検出）
- [ ] 係り受け解析（CaboCha統合検討）

**推定工数**: 1-2週間

#### トレンド検出アルゴリズム
- [ ] 頻出キーワードの急増検知
- [ ] 感情スコアの急激な変動検知
- [ ] 複数ソース横断での同時話題検出
- [ ] 前日比・先週比での増加率算出

**推定工数**: 1週間

### 優先度: 低（フェーズ4以降）

#### 高度な機能
- [ ] アラート機能（特定キーワード、感情変化）
- [ ] カスタム辞書（ユーザー定義のポジ/ネガ単語）
- [ ] レポートエクスポート（PDF、CSV、JSON）
- [ ] スケジュール実行（cron的な定期収集）
- [ ] 複数キーワードの関連性分析
- [ ] ネットワーク図（キーワード共起）

#### UI/UX改善
- [ ] テーマカスタマイズ（ダーク/ライト）
- [ ] フィルタリング機能（日付範囲、カテゴリ、感情）
- [ ] 検索機能（過去データの全文検索）
- [ ] ブックマーク機能（注目記事の保存）

#### インフラ・運用
- [ ] クラウド同期（オプション）
- [ ] バックアップ機能
- [ ] データエクスポート/インポート
- [ ] パフォーマンス最適化（大量データ対応）

## ファイル構成

```
news-crawler/
├── test-hatena.js              # はてなブックマークRSS取得
│   ├── fetchHatenaBookmarks()  # カテゴリ別RSS取得
│   ├── testMultipleCategories() # 複数カテゴリテスト
│   └── HATENA_FEEDS            # カテゴリURLマッピング
│
├── test-analyzer.js            # 形態素解析 + キーワード抽出
│   ├── initTokenizer()         # kuromoji初期化
│   ├── extractNouns()          # 名詞抽出
│   ├── countWords()            # 頻度カウント
│   ├── getTopKeywords()        # TOP N取得
│   └── testKeywordExtraction() # テスト実行
│
├── test-sentiment.js           # 感情分析
│   ├── analyzeSentiment()      # 感情スコア算出
│   ├── visualizeSentiment()    # 結果表示
│   └── testSentimentAnalysis() # テスト実行
│
├── sentiment-dictionary.js     # 感情辞書
│   ├── POSITIVE_WORDS          # ポジティブ単語（約70語）
│   ├── NEGATIVE_WORDS          # ネガティブ単語（約70語）
│   ├── INTENSIFIERS            # 強調語
│   └── NEGATIONS               # 否定語
│
├── test-integration.js         # 統合テスト（全機能）
│   ├── analyzeOpinionTrend()   # 統合分析実行
│   └── compareCategories()     # カテゴリ比較
│
├── package.json                # npm設定、依存関係
├── README.md                   # 使い方、実行方法
├── CLAUDE.md                   # 開発記録（本ファイル）
└── node_modules/               # ライブラリ
    ├── rss-parser/
    ├── kuromoji/
    │   └── dict/               # IPA辞書（約17MB）
    └── axios/
```

## ビルドコマンド

```bash
# 依存パッケージインストール
npm install

# 個別機能テスト
npm test           # はてなブックマークRSS取得テスト
npm run analyze    # キーワード抽出テスト
npm run sentiment  # 感情分析テスト

# 統合テスト（推奨）
npm run integration   # 全機能を統合実行
npm run compare       # 複数カテゴリ比較分析

# カスタム実行
node test-hatena.js tech 20           # テクノロジーカテゴリから20件取得
node test-analyzer.js "分析したいテキスト"  # 直接テキスト分析
node test-sentiment.js "感情を知りたいテキスト" # 直接感情分析
node test-integration.js single politics 15  # 政治カテゴリ15件分析
```

## パフォーマンス

### 実測値（Mac, M1チップ）

| 処理 | 件数 | 処理時間 | 備考 |
|------|------|---------|------|
| RSS取得 | 20件 | 約1秒 | ネットワーク速度に依存 |
| kuromoji初期化 | - | 約1秒 | 初回のみ、辞書読み込み |
| 形態素解析 | 4000文字 | 約0.5秒 | - |
| キーワード抽出 | 500名詞 | 約0.1秒 | - |
| 感情分析 | 20件 | 約0.5秒 | - |
| **統合処理** | **20件** | **約3秒** | **RSS取得〜分析完了** |

### メモリ使用量
- 起動時: 約50MB
- kuromoji辞書読み込み後: 約70MB
- 分析実行中: 約80MB

## セキュリティ・コンプライアンス

### 法的リスク対策
- ✅ 公開RSSのみ使用（スクレイピングなし）
- ✅ robots.txt、利用規約を遵守
- ✅ 個人情報を収集・保存しない
- ✅ 著作権侵害なし（要約のみ、全文転載なし）

### 今後の考慮事項
- データ保存時の個人情報匿名化
- 引用時の出典明記
- 商用利用時のライセンス確認

## まとめ

TypeScript/Electron環境を想定した世論分析システムのプロトタイプとして、以下を達成：

### ✅ 達成した目標
1. **データ収集**: 公開RSSから安定してデータ取得
2. **キーワード抽出**: 日本語形態素解析で実用的な精度を実現
3. **感情分析**: 基本的なポジティブ/ネガティブ判定が可能
4. **統合システム**: 一連の分析フローを自動化

### 🎯 実用性の検証
- 個人利用（趣味・情報収集）には**十分な精度**
- 無料ツールだけで**基本的な世論分析が可能**
- 技術的に**Electron化は実現可能**

### 🚀 次のステップ
1. **フェーズ2**: Electron化 + ダッシュボードUI（2-3週間）
2. **フェーズ3**: データソース拡大 + 精度向上（継続的改善）

### 📝 重要な学び
- kuromoji.jsは日本語形態素解析に十分実用的
- 辞書ベース感情分析はプロトタイプに最適
- はてなブックマークRSSは法的リスク最小で有用なデータソース
- ES Moduleでのライブラリ統合は__dirnameを活用

---

**作成日**: 2025年10月25日
**プロジェクトステータス**: プロトタイプ完成、フェーズ2（Electron化）準備中
