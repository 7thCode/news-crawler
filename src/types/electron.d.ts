export interface ElectronAPI {
  analyzeTrends: (category: string, limit: number) => Promise<{
    success: boolean
    data?: {
      keywords: Array<{ word: string; count: number }>
      sentiment: {
        average: number
        positive: number
        negative: number
        neutral: number
      }
      articles: Array<{
        title: string
        link: string
        sentiment: string
        score: number
      }>
    }
    error?: string
  }>
  compareSnsMedia: (limit: number) => Promise<{
    success: boolean
    data?: {
      sns: {
        keywords: Array<{ word: string; count: number }>
        sentiment: {
          average: number
          positive: number
          negative: number
          neutral: number
          positiveRate: number
          negativeRate: number
          neutralRate: number
        }
        uniqueKeywords: Array<{ word: string; count: number }>
      }
      media: {
        keywords: Array<{ word: string; count: number }>
        sentiment: {
          average: number
          positive: number
          negative: number
          neutral: number
          positiveRate: number
          negativeRate: number
          neutralRate: number
        }
        uniqueKeywords: Array<{ word: string; count: number }>
      }
      sentimentDiff: number
    }
    error?: string
  }>
  searchSubKeywords: (keyword: string, category: string, sourceType: 'sns' | 'media' | 'both') => Promise<{
    success: boolean
    data?: {
      keywords: Array<{ word: string; count: number }>
      sentiment: {
        average: number
        positive: number
        negative: number
        neutral: number
      }
      articles: Array<{
        title: string
        link: string
        sentiment: string
        score: number
      }>
    }
    error?: string
  }>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
