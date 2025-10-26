/**
 * シンプル感情分析プロトタイプ
 * 辞書ベースでポジティブ/ネガティブスコアを算出
 */

import { POSITIVE_WORDS, NEGATIVE_WORDS, INTENSIFIERS, NEGATIONS } from './sentiment-dictionary.js';
import { initTokenizer, extractNouns } from './test-analyzer.js';
import { fetchHatenaBookmarks } from './test-hatena.js';

/**
 * テキストの感情スコアを計算
 * @param {object} tokenizer - kuromoji tokenizer
 * @param {string} text - 分析対象テキスト
 * @returns {object} { score, positive, negative, neutral, details }
 */
function analyzeSentiment(tokenizer, text) {
  if (!text) {
    return { score: 0, positive: 0, negative: 0, neutral: 0, details: [] };
  }

  const tokens = tokenizer.tokenize(text);
  let positiveCount = 0;
  let negativeCount = 0;
  const details = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const word = token.surface_form;
    const basicForm = token.basic_form || word;

    let score = 0;

    // ポジティブ単語チェック
    if (POSITIVE_WORDS.some(pw => word.includes(pw) || basicForm.includes(pw))) {
      score = 1;
    }

    // ネガティブ単語チェック
    if (NEGATIVE_WORDS.some(nw => word.includes(nw) || basicForm.includes(nw))) {
      score = -1;
    }

    // スコアがある場合、前後の単語をチェック
    if (score !== 0) {
      let finalScore = score;

      // 強調語チェック（1つ前の単語）
      if (i > 0) {
        const prevWord = tokens[i - 1].surface_form;
        if (INTENSIFIERS.some(int => prevWord.includes(int))) {
          finalScore *= 1.5;
        }

        // 否定語チェック（1-2単語前）
        const prevWords = [
          i > 0 ? tokens[i - 1].surface_form : '',
          i > 1 ? tokens[i - 2].surface_form : '',
        ];

        if (prevWords.some(pw => NEGATIONS.some(neg => pw.includes(neg)))) {
          finalScore *= -1; // 否定でスコア反転
        }
      }

      if (finalScore > 0) {
        positiveCount += finalScore;
      } else {
        negativeCount += Math.abs(finalScore);
      }

      details.push({
        word,
        position: i,
        score: finalScore,
        context: tokens.slice(Math.max(0, i - 2), Math.min(tokens.length, i + 3))
          .map(t => t.surface_form)
          .join(''),
      });
    }
  }

  const totalScore = positiveCount - negativeCount;
  const neutralCount = tokens.length - (positiveCount + negativeCount);

  return {
    score: totalScore,
    positive: positiveCount,
    negative: negativeCount,
    neutral: neutralCount,
    sentiment: totalScore > 0 ? 'positive' : totalScore < 0 ? 'negative' : 'neutral',
    details,
  };
}

/**
 * 感情スコアを視覚化
 */
function visualizeSentiment(result) {
  const { score, positive, negative, sentiment } = result;
  const total = positive + negative;

  const posBar = '█'.repeat(Math.ceil((positive / total) * 20) || 0);
  const negBar = '█'.repeat(Math.ceil((negative / total) * 20) || 0);

  const emoji = sentiment === 'positive' ? '😊' : sentiment === 'negative' ? '😔' : '😐';

  console.log(`\n${emoji} 感情分析結果: ${sentiment.toUpperCase()}`);
  console.log(`総合スコア: ${score > 0 ? '+' : ''}${score.toFixed(2)}`);
  console.log(`ポジティブ: ${positive.toFixed(2)} ${posBar}`);
  console.log(`ネガティブ: ${negative.toFixed(2)} ${negBar}`);
}

/**
 * はてなブックマーク記事の感情分析テスト
 */
async function testSentimentAnalysis() {
  console.log('🔍 感情分析プロトタイプ開始\n');

  try {
    // 1. kuromoji初期化
    console.log('📖 kuromoji辞書を読み込み中...');
    const tokenizer = await initTokenizer();
    console.log('✅ kuromoji初期化完了\n');

    // 2. はてなブックマークから記事取得
    console.log('📰 はてなブックマークから記事取得中...');
    const items = await fetchHatenaBookmarks('general', 10);
    console.log(`✅ ${items.length}件の記事を取得\n`);

    console.log('─'.repeat(80));

    // 3. 各記事の感情分析
    const results = [];

    items.forEach((item, index) => {
      const text = `${item.title} ${item.contentSnippet || ''}`;
      const result = analyzeSentiment(tokenizer, text);

      results.push({
        title: item.title,
        ...result,
      });

      console.log(`\n📄 記事 ${index + 1}: ${item.title.substring(0, 50)}...`);
      visualizeSentiment(result);

      if (result.details.length > 0) {
        console.log('\n  検出キーワード:');
        result.details.slice(0, 5).forEach(d => {
          const scoreStr = d.score > 0 ? `+${d.score.toFixed(1)}` : d.score.toFixed(1);
          console.log(`    ${d.word} (${scoreStr}) - "${d.context}"`);
        });
      }
    });

    console.log('\n' + '─'.repeat(80));

    // 4. 全体の傾向分析
    const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
    const posCount = results.filter(r => r.sentiment === 'positive').length;
    const negCount = results.filter(r => r.sentiment === 'negative').length;
    const neuCount = results.filter(r => r.sentiment === 'neutral').length;

    console.log('\n📊 全体傾向:');
    console.log(`平均スコア: ${avgScore > 0 ? '+' : ''}${avgScore.toFixed(2)}`);
    console.log(`ポジティブ記事: ${posCount}件 (${((posCount / results.length) * 100).toFixed(1)}%)`);
    console.log(`ネガティブ記事: ${negCount}件 (${((negCount / results.length) * 100).toFixed(1)}%)`);
    console.log(`中立記事: ${neuCount}件 (${((neuCount / results.length) * 100).toFixed(1)}%)`);

    return results;
  } catch (error) {
    console.error('❌ エラー発生:', error);
    throw error;
  }
}

/**
 * テキスト直接分析
 */
async function testDirectSentiment(text) {
  console.log('🔍 テキスト感情分析テスト\n');

  const tokenizer = await initTokenizer();
  const result = analyzeSentiment(tokenizer, text);

  console.log(`入力: "${text}"\n`);
  visualizeSentiment(result);

  if (result.details.length > 0) {
    console.log('\n検出キーワード:');
    result.details.forEach(d => {
      console.log(`  ${d.word} (スコア: ${d.score}) - "${d.context}"`);
    });
  }

  return result;
}

// メイン実行
if (import.meta.url === `file://${process.argv[1]}`) {
  const directText = process.argv[2];

  if (directText) {
    testDirectSentiment(directText).catch(console.error);
  } else {
    testSentimentAnalysis().catch(console.error);
  }
}

export { analyzeSentiment, visualizeSentiment };
