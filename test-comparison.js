/**
 * SNS vs メディア 比較分析システム
 * ユーザーの意見（はてブ）とマスコミの報道（NHK、日経など）の違いを可視化
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import kuromoji from 'kuromoji';
import { fetchHatenaBookmarks } from './test-hatena.js';
import { fetchNewsRSS } from './test-news-rss.js';
import { analyzeSentiment } from './test-sentiment.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// kuromoji辞書パス
const DICT_PATH = join(__dirname, 'node_modules', 'kuromoji', 'dict');

let tokenizer = null;

/**
 * kuromoji tokenizerを初期化
 */
async function initTokenizer() {
  if (tokenizer) return tokenizer;

  return new Promise((resolve, reject) => {
    kuromoji.builder({ dicPath: DICT_PATH }).build((err, result) => {
      if (err) reject(err);
      else {
        tokenizer = result;
        resolve(tokenizer);
      }
    });
  });
}

/**
 * テキストから名詞を抽出
 */
function extractNouns(text) {
  if (!tokenizer) {
    throw new Error('Tokenizer not initialized');
  }

  const tokens = tokenizer.tokenize(text);
  return tokens
    .filter(token =>
      token.pos === '名詞' &&
      ['一般', '固有名詞', 'サ変接続'].includes(token.pos_detail_1) &&
      token.surface_form.length > 1
    )
    .map(token => token.surface_form);
}

/**
 * 単語の出現頻度をカウント
 */
function countWords(words) {
  const frequency = {};
  words.forEach(word => {
    frequency[word] = (frequency[word] || 0) + 1;
  });
  return frequency;
}

/**
 * SNSデータとメディアデータを取得
 */
async function fetchComparisonData(limit = 20) {
  console.log('\n📊 SNS vs メディア データ収集中...\n');

  // SNS系: はてなブックマーク
  console.log('📱 SNS系データ取得中...');
  const snsData = await fetchHatenaBookmarks('general', limit);

  // メディア系: NHK + Yahoo!ニュース
  console.log('\n📰 メディア系データ取得中...');
  const nhkData = await fetchNewsRSS('nhk', Math.floor(limit / 2));
  await new Promise(resolve => setTimeout(resolve, 1000));
  const yahooData = await fetchNewsRSS('yahoo_topics', Math.floor(limit / 2));

  const mediaData = [...nhkData, ...yahooData];

  console.log(`\n✅ データ収集完了`);
  console.log(`   SNS: ${snsData.length}件`);
  console.log(`   メディア: ${mediaData.length}件\n`);

  return { snsData, mediaData };
}

/**
 * キーワード抽出と分析
 */
async function analyzeKeywords(data) {
  await initTokenizer();

  const allText = data.map(item => item.title + ' ' + item.content).join(' ');
  const nouns = extractNouns(allText);
  const frequency = countWords(nouns);

  // 頻度順にソート
  const sorted = Object.entries(frequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30);

  return sorted;
}

/**
 * 感情分析（全記事の平均）
 */
async function analyzeSentimentAverage(data) {
  await initTokenizer();

  let totalScore = 0;
  let positiveCount = 0;
  let negativeCount = 0;
  let neutralCount = 0;

  for (const item of data) {
    const text = item.title + ' ' + item.content;
    const result = await analyzeSentiment(text);

    totalScore += result.score;

    if (result.sentiment === 'positive') positiveCount++;
    else if (result.sentiment === 'negative') negativeCount++;
    else neutralCount++;
  }

  const total = data.length;
  return {
    averageScore: totalScore / total,
    positive: { count: positiveCount, rate: (positiveCount / total) * 100 },
    negative: { count: negativeCount, rate: (negativeCount / total) * 100 },
    neutral: { count: neutralCount, rate: (neutralCount / total) * 100 }
  };
}

/**
 * 比較レポートを生成
 */
async function generateComparisonReport() {
  console.log('='.repeat(70));
  console.log('📊 SNS vs メディア 比較分析レポート');
  console.log('='.repeat(70));

  // データ取得
  const { snsData, mediaData } = await fetchComparisonData(20);

  // キーワード分析
  console.log('\n🔑 キーワード分析中...');
  const snsKeywords = await analyzeKeywords(snsData);
  const mediaKeywords = await analyzeKeywords(mediaData);

  // 感情分析
  console.log('😊 感情分析中...\n');
  const snsSentiment = await analyzeSentimentAverage(snsData);
  const mediaSentiment = await analyzeSentimentAverage(mediaData);

  // レポート表示
  console.log('='.repeat(70));
  console.log('📈 1. 感情トレンド比較');
  console.log('='.repeat(70));

  console.log('\n【SNS（ユーザーの意見）】');
  console.log(`  平均感情スコア: ${snsSentiment.averageScore.toFixed(2)}`);
  console.log(`  😊 ポジティブ: ${snsSentiment.positive.count}件 (${snsSentiment.positive.rate.toFixed(1)}%)`);
  console.log(`  😔 ネガティブ: ${snsSentiment.negative.count}件 (${snsSentiment.negative.rate.toFixed(1)}%)`);
  console.log(`  😐 中立:       ${snsSentiment.neutral.count}件 (${snsSentiment.neutral.rate.toFixed(1)}%)`);

  console.log('\n【メディア（報道機関の意見）】');
  console.log(`  平均感情スコア: ${mediaSentiment.averageScore.toFixed(2)}`);
  console.log(`  😊 ポジティブ: ${mediaSentiment.positive.count}件 (${mediaSentiment.positive.rate.toFixed(1)}%)`);
  console.log(`  😔 ネガティブ: ${mediaSentiment.negative.count}件 (${mediaSentiment.negative.rate.toFixed(1)}%)`);
  console.log(`  😐 中立:       ${mediaSentiment.neutral.count}件 (${mediaSentiment.neutral.rate.toFixed(1)}%)`);

  // 感情スコア差
  const sentimentDiff = snsSentiment.averageScore - mediaSentiment.averageScore;
  console.log('\n【差分分析】');
  console.log(`  感情スコア差: ${sentimentDiff > 0 ? '+' : ''}${sentimentDiff.toFixed(2)}`);
  if (Math.abs(sentimentDiff) > 0.5) {
    if (sentimentDiff > 0) {
      console.log('  → SNSの方がポジティブな傾向');
    } else {
      console.log('  → メディアの方がポジティブな傾向');
    }
  } else {
    console.log('  → 感情傾向はほぼ同等');
  }

  // キーワード比較
  console.log('\n' + '='.repeat(70));
  console.log('🔑 2. 注目キーワード比較 (TOP 15)');
  console.log('='.repeat(70));

  console.log('\n【SNS（ユーザーが注目）】');
  snsKeywords.slice(0, 15).forEach(([word, count], index) => {
    const bar = '█'.repeat(Math.min(count, 20));
    console.log(`  ${(index + 1).toString().padStart(2)}. ${word.padEnd(12)} ${count.toString().padStart(3)}回 ${bar}`);
  });

  console.log('\n【メディア（報道が注目）】');
  mediaKeywords.slice(0, 15).forEach(([word, count], index) => {
    const bar = '█'.repeat(Math.min(count, 20));
    console.log(`  ${(index + 1).toString().padStart(2)}. ${word.padEnd(12)} ${count.toString().padStart(3)}回 ${bar}`);
  });

  // 独自キーワード分析
  console.log('\n' + '='.repeat(70));
  console.log('🎯 3. 独自キーワード分析');
  console.log('='.repeat(70));

  const snsOnlyKeywords = findUniqueKeywords(snsKeywords, mediaKeywords, 10);
  const mediaOnlyKeywords = findUniqueKeywords(mediaKeywords, snsKeywords, 10);

  console.log('\n【SNSで特に注目されているキーワード】');
  snsOnlyKeywords.forEach(([word, count], index) => {
    console.log(`  ${index + 1}. ${word} (${count}回)`);
  });

  console.log('\n【メディアで特に報道されているキーワード】');
  mediaOnlyKeywords.forEach(([word, count], index) => {
    console.log(`  ${index + 1}. ${word} (${count}回)`);
  });

  console.log('\n' + '='.repeat(70));
  console.log('✅ 比較分析完了');
  console.log('='.repeat(70));

  return {
    snsData,
    mediaData,
    snsSentiment,
    mediaSentiment,
    snsKeywords,
    mediaKeywords
  };
}

/**
 * 一方にしか存在しないキーワードを抽出
 */
function findUniqueKeywords(targetKeywords, compareKeywords, limit = 10) {
  const compareWords = new Set(compareKeywords.map(([word]) => word));

  return targetKeywords
    .filter(([word]) => !compareWords.has(word))
    .slice(0, limit);
}

// メイン実行
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    await generateComparisonReport();
  } catch (error) {
    console.error('❌ エラー:', error);
    process.exit(1);
  }
}

export { generateComparisonReport, fetchComparisonData, analyzeKeywords };
