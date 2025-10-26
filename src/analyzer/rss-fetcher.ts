import Parser from 'rss-parser'

export interface RSSItem {
  title?: string
  link?: string
  pubDate?: string
  contentSnippet?: string
  content?: string
}

// はてなブックマークのRSSフィード
export const HATENA_FEEDS: Record<string, string> = {
  general: 'https://b.hatena.ne.jp/hotentry/all.rss',
  tech: 'https://b.hatena.ne.jp/hotentry/it.rss',
  entertainment: 'https://b.hatena.ne.jp/hotentry/fun.rss',
  social: 'https://b.hatena.ne.jp/hotentry/social.rss',
  economics: 'https://b.hatena.ne.jp/hotentry/economics.rss',
  knowledge: 'https://b.hatena.ne.jp/hotentry/knowledge.rss',
  life: 'https://b.hatena.ne.jp/hotentry/life.rss',
}

const parser = new Parser()

/**
 * 指定カテゴリのRSSフィードを取得
 */
export async function fetchHatenaBookmarks(
  category: string = 'general',
  limit: number = 10
): Promise<RSSItem[]> {
  const feedUrl = HATENA_FEEDS[category]

  if (!feedUrl) {
    throw new Error(`Unknown category: ${category}`)
  }

  try {
    const feed = await parser.parseURL(feedUrl)
    return feed.items.slice(0, limit)
  } catch (error) {
    console.error('RSS取得エラー:', error)
    throw error
  }
}
