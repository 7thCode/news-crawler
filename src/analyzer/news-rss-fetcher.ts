/**
 * ニュースメディアRSS取得
 * マスコミ系データソース
 */

import Parser from 'rss-parser'

// ニュースRSSフィード定義
const NEWS_FEEDS = {
  nhk: {
    name: 'NHKニュース',
    url: 'https://www3.nhk.or.jp/rss/news/cat0.xml',
    sourceType: 'media' as const,
    category: '総合',
  },
  nikkei_business: {
    name: '日経ビジネス',
    url: 'https://business.nikkei.com/rss/sns/nb.rdf',
    sourceType: 'media' as const,
    category: 'ビジネス',
  },
  yahoo_topics: {
    name: 'Yahoo!ニュース トピックス',
    url: 'https://news.yahoo.co.jp/rss/topics/top-picks.xml',
    sourceType: 'media' as const,
    category: '総合',
  },
}

type NewsSourceKey = keyof typeof NEWS_FEEDS

interface NewsItem {
  title: string
  link: string
  pubDate?: string
  content: string
  source: string
  sourceType: 'media'
  category: string
}

/**
 * 指定したニュースソースからRSSを取得
 */
export async function fetchNewsRSS(sourceKey: NewsSourceKey, limit: number = 10): Promise<NewsItem[]> {
  const parser = new Parser()
  const source = NEWS_FEEDS[sourceKey]

  if (!source) {
    throw new Error(`Unknown source: ${sourceKey}`)
  }

  console.log(`\n📰 ${source.name} からニュース取得中...`)
  console.log(`URL: ${source.url}`)

  try {
    const feed = await parser.parseURL(source.url)
    const items: NewsItem[] = feed.items.slice(0, limit).map((item) => ({
      title: item.title || '',
      link: item.link || '',
      pubDate: item.pubDate,
      content: item.contentSnippet || item.content || '',
      source: source.name,
      sourceType: source.sourceType,
      category: source.category,
    }))

    console.log(`✅ ${items.length}件取得成功\n`)
    return items
  } catch (error) {
    console.error(`❌ 取得失敗: ${error instanceof Error ? error.message : error}\n`)
    return []
  }
}
