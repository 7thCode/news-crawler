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
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
