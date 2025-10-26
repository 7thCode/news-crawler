/**
 * はてなブックマークRSS取得プロトタイプ
 * カテゴリ別の人気エントリーを取得して表示
 */

import Parser from 'rss-parser';

const parser = new Parser();

// はてなブックマークのRSSフィード
const HATENA_FEEDS = {
  general: 'https://b.hatena.ne.jp/hotentry/all.rss',
  tech: 'https://b.hatena.ne.jp/hotentry/it.rss',
  entertainment: 'https://b.hatena.ne.jp/hotentry/fun.rss',
  social: 'https://b.hatena.ne.jp/hotentry/social.rss',
  knowledge: 'https://b.hatena.ne.jp/hotentry/knowledge.rss',
};

/**
 * 指定カテゴリのRSSフィードを取得
 * @param {string} category - カテゴリ名
 * @param {number} limit - 取得件数
 */
async function fetchHatenaBookmarks(category = 'general', limit = 10) {
  const feedUrl = HATENA_FEEDS[category];

  if (!feedUrl) {
    throw new Error(`Unknown category: ${category}`);
  }

  console.log(`\n📰 はてなブックマーク [${category}] から取得中...\n`);

  try {
    const feed = await parser.parseURL(feedUrl);

    console.log(`フィードタイトル: ${feed.title}`);
    console.log(`取得件数: ${Math.min(feed.items.length, limit)}\n`);
    console.log('─'.repeat(80));

    feed.items.slice(0, limit).forEach((item, index) => {
      console.log(`\n${index + 1}. ${item.title}`);
      console.log(`   URL: ${item.link}`);
      console.log(`   公開日: ${item.pubDate}`);

      // はてブ数を取得（content:encodedから抽出可能）
      if (item.contentSnippet) {
        const snippet = item.contentSnippet.substring(0, 100);
        console.log(`   概要: ${snippet}...`);
      }
    });

    console.log('\n' + '─'.repeat(80));
    console.log('✅ RSS取得成功\n');

    return feed.items.slice(0, limit);
  } catch (error) {
    console.error('❌ RSS取得エラー:', error.message);
    throw error;
  }
}

/**
 * 複数カテゴリから取得してデータ構造を確認
 */
async function testMultipleCategories() {
  console.log('🔍 複数カテゴリからのデータ取得テスト\n');

  const categories = ['general', 'tech', 'social'];
  const results = [];

  for (const category of categories) {
    try {
      const items = await fetchHatenaBookmarks(category, 3);
      results.push({ category, items });

      // レート制限を避けるため少し待機
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`カテゴリ ${category} の取得に失敗`);
    }
  }

  console.log('\n📊 取得データ構造サンプル:');
  console.log(JSON.stringify(results[0].items[0], null, 2));

  return results;
}

// メイン実行
if (import.meta.url === `file://${process.argv[1]}`) {
  const category = process.argv[2] || 'general';
  const limit = parseInt(process.argv[3]) || 10;

  if (category === 'all') {
    testMultipleCategories().catch(console.error);
  } else {
    fetchHatenaBookmarks(category, limit).catch(console.error);
  }
}

export { fetchHatenaBookmarks, HATENA_FEEDS };
