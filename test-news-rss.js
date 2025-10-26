/**
 * ニュースメディアRSS取得テスト
 * マスコミ系データソースの動作確認
 */

import Parser from 'rss-parser';

// ニュースRSSフィード定義
const NEWS_FEEDS = {
  nhk: {
    name: 'NHKニュース',
    url: 'https://www3.nhk.or.jp/rss/news/cat0.xml',
    sourceType: 'media',
    category: '総合'
  },
  nhk_alt: {
    name: 'NHKニュース（代替）',
    url: 'https://news.web.nhk/n-data/conf/na/rss/cat0.xml',
    sourceType: 'media',
    category: '総合'
  },
  nikkei_business: {
    name: '日経ビジネス',
    url: 'https://business.nikkei.com/rss/sns/nb.rdf',
    sourceType: 'media',
    category: 'ビジネス'
  },
  nikkei_xtech: {
    name: '日経クロステック',
    url: 'https://xtech.nikkei.com/rss/xtech-con.rdf',
    sourceType: 'media',
    category: 'テクノロジー'
  },
  yahoo_topics: {
    name: 'Yahoo!ニュース トピックス',
    url: 'https://news.yahoo.co.jp/rss/topics/top-picks.xml',
    sourceType: 'media',
    category: '総合'
  }
};

/**
 * 指定したニュースソースからRSSを取得
 * @param {string} sourceKey - NEWS_FEEDSのキー
 * @param {number} limit - 取得件数
 * @returns {Promise<Array>}
 */
async function fetchNewsRSS(sourceKey, limit = 10) {
  const parser = new Parser();
  const source = NEWS_FEEDS[sourceKey];

  if (!source) {
    throw new Error(`Unknown source: ${sourceKey}`);
  }

  console.log(`\n📰 ${source.name} からニュース取得中...`);
  console.log(`URL: ${source.url}`);

  try {
    const feed = await parser.parseURL(source.url);
    const items = feed.items.slice(0, limit).map(item => ({
      title: item.title,
      link: item.link,
      pubDate: item.pubDate,
      content: item.contentSnippet || item.content || '',
      source: source.name,
      sourceType: source.sourceType,  // 'media' (マスコミ系)
      category: source.category
    }));

    console.log(`✅ ${items.length}件取得成功\n`);
    return items;

  } catch (error) {
    console.error(`❌ 取得失敗: ${error.message}\n`);
    return [];
  }
}

/**
 * 全ニュースソースを試す
 */
async function testAllSources() {
  console.log('='.repeat(60));
  console.log('📰 ニュースメディアRSS取得テスト');
  console.log('='.repeat(60));

  const results = {};

  for (const [key, source] of Object.entries(NEWS_FEEDS)) {
    const items = await fetchNewsRSS(key, 5);
    results[key] = {
      source: source.name,
      success: items.length > 0,
      count: items.length,
      items: items
    };

    // レート制限対策（念のため1秒待機）
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // 結果サマリー
  console.log('\n' + '='.repeat(60));
  console.log('📊 取得結果サマリー');
  console.log('='.repeat(60));

  for (const [key, result] of Object.entries(results)) {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.source}: ${result.count}件`);
  }

  // 成功したソースの記事を表示
  console.log('\n' + '='.repeat(60));
  console.log('📄 取得成功した記事（各ソース最初の3件）');
  console.log('='.repeat(60));

  for (const [key, result] of Object.entries(results)) {
    if (result.success) {
      console.log(`\n【${result.source}】`);
      result.items.slice(0, 3).forEach((item, index) => {
        console.log(`${index + 1}. ${item.title}`);
        console.log(`   📅 ${item.pubDate || '日付不明'}`);
        console.log(`   🔗 ${item.link}`);
      });
    }
  }

  return results;
}

/**
 * SNS vs メディアの比較用データ構造テスト
 */
async function testSourceTypeComparison() {
  console.log('\n' + '='.repeat(60));
  console.log('🔍 SNS vs メディア 比較用データ構造テスト');
  console.log('='.repeat(60));

  // メディア系データ取得
  const mediaData = await fetchNewsRSS('nhk', 5);

  // SNS系データ（既存のはてブを想定）
  const snsData = [
    {
      title: 'サンプルSNS記事',
      source: 'はてなブックマーク',
      sourceType: 'sns',  // SNS系
      category: 'テクノロジー'
    }
  ];

  console.log('\n【メディア系データ構造】');
  console.log(JSON.stringify(mediaData[0], null, 2));

  console.log('\n【SNS系データ構造】');
  console.log(JSON.stringify(snsData[0], null, 2));

  console.log('\n✅ sourceType属性で分類可能:');
  console.log(`  - 'media': マスコミ（NHK、日経など）`);
  console.log(`  - 'sns': ユーザー意見（はてブ、Redditなど）`);
}

// テスト実行
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const results = await testAllSources();
    await testSourceTypeComparison();

    // 成功数カウント
    const successCount = Object.values(results).filter(r => r.success).length;
    const totalCount = Object.keys(results).length;

    console.log('\n' + '='.repeat(60));
    console.log(`✅ テスト完了: ${successCount}/${totalCount} ソース成功`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ テスト失敗:', error);
    process.exit(1);
  }
}

export { fetchNewsRSS, NEWS_FEEDS };
