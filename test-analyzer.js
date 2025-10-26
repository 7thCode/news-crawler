/**
 * 形態素解析とキーワード抽出プロトタイプ
 * kuromoji.jsで日本語テキストを解析し、頻出キーワードを抽出
 */

import kuromoji from 'kuromoji';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { fetchHatenaBookmarks } from './test-hatena.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// kuromoji辞書のパス
const DICT_PATH = join(__dirname, 'node_modules', 'kuromoji', 'dict');

/**
 * kuromoji tokenizerの初期化
 */
function initTokenizer() {
  return new Promise((resolve, reject) => {
    kuromoji.builder({ dicPath: DICT_PATH }).build((err, tokenizer) => {
      if (err) {
        reject(err);
      } else {
        resolve(tokenizer);
      }
    });
  });
}

/**
 * テキストから名詞を抽出
 * @param {object} tokenizer - kuromoji tokenizer
 * @param {string} text - 解析対象テキスト
 * @returns {Array} 名詞の配列
 */
function extractNouns(tokenizer, text) {
  if (!text) return [];

  const tokens = tokenizer.tokenize(text);
  const nouns = tokens
    .filter(token => {
      // 名詞のみを抽出（pos: 品詞）
      const isNoun = token.pos === '名詞';
      // 一般名詞、固有名詞、サ変接続を対象
      const isTargetType = ['一般', '固有名詞', 'サ変接続'].includes(token.pos_detail_1);
      // 1文字の名詞は除外（ノイズが多いため）
      const isLongEnough = token.surface_form.length > 1;

      return isNoun && isTargetType && isLongEnough;
    })
    .map(token => token.surface_form);

  return nouns;
}

/**
 * キーワード頻度カウント
 * @param {Array} words - 単語の配列
 * @returns {Map} 単語 => 出現回数のMap
 */
function countWords(words) {
  const counts = new Map();

  words.forEach(word => {
    counts.set(word, (counts.get(word) || 0) + 1);
  });

  return counts;
}

/**
 * 頻度順にソートして上位を取得
 * @param {Map} wordCounts - 単語頻度Map
 * @param {number} topN - 上位N件
 * @returns {Array} [{word, count}]の配列
 */
function getTopKeywords(wordCounts, topN = 20) {
  return Array.from(wordCounts.entries())
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, topN);
}

/**
 * はてなブックマークからキーワード抽出のテスト
 */
async function testKeywordExtraction() {
  console.log('🔍 キーワード抽出プロトタイプ開始\n');

  try {
    // 1. kuromoji初期化
    console.log('📖 kuromoji辞書を読み込み中...');
    const tokenizer = await initTokenizer();
    console.log('✅ kuromoji初期化完了\n');

    // 2. はてなブックマークから記事取得
    console.log('📰 はてなブックマークから記事取得中...');
    const items = await fetchHatenaBookmarks('tech', 20);
    console.log(`✅ ${items.length}件の記事を取得\n`);

    // 3. タイトルと概要からテキスト抽出
    const allText = items
      .map(item => {
        const title = item.title || '';
        const snippet = item.contentSnippet || '';
        return `${title} ${snippet}`;
      })
      .join(' ');

    console.log(`📝 抽出テキスト長: ${allText.length}文字\n`);

    // 4. 形態素解析 + 名詞抽出
    console.log('🔬 形態素解析実行中...');
    const nouns = extractNouns(tokenizer, allText);
    console.log(`✅ ${nouns.length}個の名詞を抽出\n`);

    // 5. キーワードカウント
    const wordCounts = countWords(nouns);
    const topKeywords = getTopKeywords(wordCounts, 30);

    // 6. 結果表示
    console.log('🏆 頻出キーワード TOP 30\n');
    console.log('─'.repeat(50));

    topKeywords.forEach((kw, index) => {
      const bar = '█'.repeat(Math.ceil(kw.count / 2));
      console.log(`${(index + 1).toString().padStart(2)}. ${kw.word.padEnd(15)} ${kw.count.toString().padStart(3)}回 ${bar}`);
    });

    console.log('\n' + '─'.repeat(50));

    // 7. データ構造サンプル表示
    console.log('\n📊 形態素解析サンプル（最初の10トークン）:\n');
    const sampleTokens = tokenizer.tokenize(items[0].title).slice(0, 10);
    console.log(JSON.stringify(sampleTokens, null, 2));

    return { topKeywords, totalNouns: nouns.length, totalItems: items.length };
  } catch (error) {
    console.error('❌ エラー発生:', error);
    throw error;
  }
}

/**
 * テキスト直接解析のテスト
 */
async function testDirectAnalysis(text) {
  console.log('🔍 テキスト直接解析テスト\n');

  const tokenizer = await initTokenizer();
  const nouns = extractNouns(tokenizer, text);
  const wordCounts = countWords(nouns);
  const topKeywords = getTopKeywords(wordCounts, 10);

  console.log('入力テキスト:', text);
  console.log('\n抽出された名詞:', nouns.join(', '));
  console.log('\nTOP 10キーワード:');
  topKeywords.forEach(kw => {
    console.log(`  ${kw.word}: ${kw.count}回`);
  });

  return topKeywords;
}

// メイン実行
if (import.meta.url === `file://${process.argv[1]}`) {
  const directText = process.argv[2];

  if (directText) {
    testDirectAnalysis(directText).catch(console.error);
  } else {
    testKeywordExtraction().catch(console.error);
  }
}

export { initTokenizer, extractNouns, countWords, getTopKeywords };
