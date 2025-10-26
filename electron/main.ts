import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import { existsSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let mainWindow: BrowserWindow | null = null

function createWindow() {
  // preloadスクリプトの絶対パスを構築
  // __dirnameはdist-electron/electronを指すので、プロジェクトルートから構築
  const preloadPath = process.env.NODE_ENV === 'development'
    ? path.join(__dirname, '../../electron/preload.js')
    : path.join(__dirname, 'preload.js')

  console.log('=== Preload Debug ===')
  console.log('__dirname:', __dirname)
  console.log('Preload path:', preloadPath)
  console.log('NODE_ENV:', process.env.NODE_ENV)
  console.log('File exists:', existsSync(preloadPath))

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // 開発モードではViteサーバーを使用、本番ではビルドしたファイルを使用
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
    // 開発者ツールは手動で開く（Cmd+Option+I または View > Toggle Developer Tools）
    // mainWindow.webContents.openDevTools()
  } else {
    // 本番モード: プロジェクトルートから dist-react/index.html を読み込む
    const projectRoot = path.join(__dirname, '../..')
    mainWindow.loadFile(path.join(projectRoot, 'dist-react/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Import analyzer modules
import { fetchHatenaBookmarks } from '../src/analyzer/rss-fetcher.js'
import { initTokenizer, extractNouns, countWords, getTopKeywords } from '../src/analyzer/keyword-extractor.js'
import { analyzeSentiment } from '../src/analyzer/sentiment-analyzer.js'

// IPC handlers - 分析機能
ipcMain.handle('analyze-trends', async (event, category: string, limit: number) => {
  try {
    console.log(`分析開始: カテゴリ=${category}, 件数=${limit}`)

    // 1. tokenizerを初期化
    const tokenizer = await initTokenizer()

    // 2. RSSからデータ取得
    const items = await fetchHatenaBookmarks(category, limit)

    // 3. テキスト抽出
    const allText = items
      .map((item) => {
        const title = item.title || ''
        const snippet = item.contentSnippet || ''
        return `${title} ${snippet}`
      })
      .join(' ')

    // 4. キーワード抽出
    const nouns = extractNouns(tokenizer, allText)
    const wordCounts = countWords(nouns)
    const topKeywords = getTopKeywords(wordCounts, 20)

    // 5. 記事ごとの感情分析
    const articlesWithSentiment = items.map((item) => {
      const text = `${item.title || ''} ${item.contentSnippet || ''}`
      const sentiment = analyzeSentiment(tokenizer, text)

      return {
        title: item.title || '',
        link: item.link || '',
        sentiment: sentiment.sentiment,
        score: sentiment.score,
      }
    })

    // 6. 感情トレンド集計
    const positiveCount = articlesWithSentiment.filter((a) => a.sentiment === 'positive').length
    const negativeCount = articlesWithSentiment.filter((a) => a.sentiment === 'negative').length
    const neutralCount = articlesWithSentiment.filter((a) => a.sentiment === 'neutral').length
    const averageScore = articlesWithSentiment.reduce((sum, a) => sum + a.score, 0) / articlesWithSentiment.length

    console.log('分析完了')

    return {
      success: true,
      data: {
        keywords: topKeywords,
        sentiment: {
          average: averageScore,
          positive: positiveCount,
          negative: negativeCount,
          neutral: neutralCount,
        },
        articles: articlesWithSentiment,
      },
    }
  } catch (error) {
    console.error('分析エラー:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
})
