/**
 * 統合テスト - 全機能を組み合わせた世論分析デモ
 * RSS取得 → キーワード抽出 → 感情分析を一連で実行
 */

import { fetchHatenaBookmarks, HATENA_FEEDS } from './test-hatena.js';
import { initTokenizer, extractNouns, countWords, getTopKeywords } from './test-analyzer.js';
import { analyzeSentiment, visualizeSentiment } from './test-sentiment.js';

/**
 * 世論トレンド分析の統合実行
 * @param {string} category - カテゴリ (general, tech, politics, etc.)
 * @param {number} itemCount - 取得件数
 */
async function analyzeOpinionTrend(category = 'general', itemCount = 20) {
  console.log('🌐 世論トレンド分析システム - プロトタイプ');
  console.log('═'.repeat(80));
  console.log(`\n📌 分析対象: はてなブックマーク [${category}] カテゴリ`);
  console.log(`📌 取得件数: ${itemCount}件\n`);

  try {
    // Step 1: kuromoji初期化
    console.log('⏳ [1/4] 形態素解析エンジン初期化中...');
    const tokenizer = await initTokenizer();
    console.log('✅ 初期化完了\n');

    // Step 2: データ収集
    console.log(`⏳ [2/4] はてなブックマークからデータ収集中...`);
    const items = await fetchHatenaBookmarks(category, itemCount);
    console.log(`✅ ${items.length}件のエントリーを取得\n`);

    // Step 3: キーワード抽出
    console.log('⏳ [3/4] キーワード抽出実行中...');
    const allText = items
      .map(item => `${item.title} ${item.contentSnippet || ''}`)
      .join(' ');

    const nouns = extractNouns(tokenizer, allText);
    const wordCounts = countWords(nouns);
    const topKeywords = getTopKeywords(wordCounts, 20);
    console.log(`✅ ${nouns.length}個の名詞から ${topKeywords.length}個の頻出キーワードを抽出\n`);

    // Step 4: 感情分析
    console.log('⏳ [4/4] 感情分析実行中...');
    const sentiments = items.map(item => {
      const text = `${item.title} ${item.contentSnippet || ''}`;
      return {
        title: item.title,
        url: item.link,
        ...analyzeSentiment(tokenizer, text),
      };
    });
    console.log(`✅ ${sentiments.length}件の記事の感情分析完了\n`);

    // === 結果レポート ===
    console.log('═'.repeat(80));
    console.log('📊 分析結果レポート');
    console.log('═'.repeat(80));

    // 1. 頻出キーワードTOP 10
    console.log('\n🔑 頻出キーワード TOP 10\n');
    topKeywords.slice(0, 10).forEach((kw, i) => {
      const bar = '█'.repeat(Math.ceil(kw.count / 2));
      console.log(`  ${(i + 1).toString().padStart(2)}. ${kw.word.padEnd(12)} ${kw.count.toString().padStart(3)}回 ${bar}`);
    });

    // 2. 感情分析サマリー
    const avgScore = sentiments.reduce((sum, s) => sum + s.score, 0) / sentiments.length;
    const posCount = sentiments.filter(s => s.sentiment === 'positive').length;
    const negCount = sentiments.filter(s => s.sentiment === 'negative').length;
    const neuCount = sentiments.filter(s => s.sentiment === 'neutral').length;

    console.log('\n\n😊 感情トレンド分析\n');
    console.log(`  平均感情スコア: ${avgScore > 0 ? '+' : ''}${avgScore.toFixed(2)}`);
    console.log(`  ポジティブ: ${posCount}件 (${((posCount / sentiments.length) * 100).toFixed(1)}%) ${'█'.repeat(Math.ceil((posCount / sentiments.length) * 30))}`);
    console.log(`  ネガティブ: ${negCount}件 (${((negCount / sentiments.length) * 100).toFixed(1)}%) ${'█'.repeat(Math.ceil((negCount / sentiments.length) * 30))}`);
    console.log(`  中立:       ${neuCount}件 (${((neuCount / sentiments.length) * 100).toFixed(1)}%) ${'█'.repeat(Math.ceil((neuCount / sentiments.length) * 30))}`);

    // 3. 感情別トップ記事
    const topPositive = sentiments
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    const topNegative = sentiments
      .filter(s => s.score < 0)
      .sort((a, b) => a.score - b.score)
      .slice(0, 3);

    if (topPositive.length > 0) {
      console.log('\n\n😊 最もポジティブな記事 TOP 3\n');
      topPositive.forEach((s, i) => {
        console.log(`  ${i + 1}. [スコア: +${s.score.toFixed(1)}] ${s.title.substring(0, 60)}...`);
      });
    }

    if (topNegative.length > 0) {
      console.log('\n\n😔 最もネガティブな記事 TOP 3\n');
      topNegative.forEach((s, i) => {
        console.log(`  ${i + 1}. [スコア: ${s.score.toFixed(1)}] ${s.title.substring(0, 60)}...`);
      });
    }

    // 4. トレンド検出（頻出 + 感情スコア）
    console.log('\n\n🔥 注目トレンド（頻出キーワード × 感情）\n');

    const trendKeywords = topKeywords.slice(0, 10).map(kw => {
      // このキーワードを含む記事の平均感情スコア
      const relatedSentiments = sentiments.filter(s =>
        s.title.includes(kw.word)
      );

      const avgSentiment = relatedSentiments.length > 0
        ? relatedSentiments.reduce((sum, s) => sum + s.score, 0) / relatedSentiments.length
        : 0;

      return {
        keyword: kw.word,
        count: kw.count,
        sentiment: avgSentiment,
        emoji: avgSentiment > 0 ? '😊' : avgSentiment < 0 ? '😔' : '😐',
      };
    });

    trendKeywords.forEach((t, i) => {
      const sentStr = t.sentiment > 0 ? `+${t.sentiment.toFixed(1)}` : t.sentiment.toFixed(1);
      console.log(`  ${(i + 1).toString().padStart(2)}. ${t.emoji} ${t.keyword.padEnd(12)} (${t.count}回出現, 感情: ${sentStr})`);
    });

    console.log('\n' + '═'.repeat(80));
    console.log('✅ 分析完了\n');

    // 結果データを返す
    return {
      category,
      itemCount: items.length,
      keywords: topKeywords,
      sentiments,
      summary: {
        avgScore,
        positive: posCount,
        negative: negCount,
        neutral: neuCount,
      },
      trends: trendKeywords,
    };
  } catch (error) {
    console.error('❌ エラー発生:', error);
    throw error;
  }
}

/**
 * 複数カテゴリの比較分析
 */
async function compareCategories(categories = ['general', 'tech', 'politics'], itemsPerCategory = 10) {
  console.log('🔍 カテゴリ比較分析\n');

  const results = [];

  for (const category of categories) {
    console.log(`\n${'='.repeat(80)}`);
    const result = await analyzeOpinionTrend(category, itemsPerCategory);
    results.push(result);

    // レート制限回避のため待機
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // 比較サマリー
  console.log('\n\n📊 カテゴリ比較サマリー\n');
  console.log('─'.repeat(80));
  console.log('カテゴリ      平均スコア  ポジ率  ネガ率  中立率');
  console.log('─'.repeat(80));

  results.forEach(r => {
    const total = r.summary.positive + r.summary.negative + r.summary.neutral;
    console.log(
      `${r.category.padEnd(12)} ${r.summary.avgScore.toFixed(2).padStart(10)} ` +
      `${((r.summary.positive / total) * 100).toFixed(1).padStart(6)}% ` +
      `${((r.summary.negative / total) * 100).toFixed(1).padStart(6)}% ` +
      `${((r.summary.neutral / total) * 100).toFixed(1).padStart(6)}%`
    );
  });

  console.log('─'.repeat(80));

  return results;
}

// メイン実行
if (import.meta.url === `file://${process.argv[1]}`) {
  const mode = process.argv[2] || 'single';

  if (mode === 'compare') {
    compareCategories().catch(console.error);
  } else {
    const category = process.argv[3] || 'general';
    const itemCount = parseInt(process.argv[4]) || 20;
    analyzeOpinionTrend(category, itemCount).catch(console.error);
  }
}

export { analyzeOpinionTrend, compareCategories };
