import kuromoji from 'kuromoji'
import { join } from 'path'
import { app } from 'electron'

// kuromoji辞書のパス - パッケージ化対応
// 開発環境: node_modules/kuromoji/dict
// パッケージ化環境: resources/dict
function getDictPath(): string {
  if (app.isPackaged) {
    // パッケージ化された環境: resourcesディレクトリから取得
    return join(process.resourcesPath, 'dict')
  } else {
    // 開発環境: node_modulesから取得
    return join(process.cwd(), 'node_modules/kuromoji/dict')
  }
}

const DICT_PATH = getDictPath()

export interface Keyword {
  word: string
  count: number
}

let tokenizerInstance: any = null

/**
 * kuromoji tokenizerの初期化（シングルトン）
 */
export async function initTokenizer(): Promise<any> {
  if (tokenizerInstance) {
    return tokenizerInstance
  }

  return new Promise((resolve, reject) => {
    kuromoji.builder({ dicPath: DICT_PATH }).build((err: any, tokenizer: any) => {
      if (err) {
        reject(err)
      } else {
        tokenizerInstance = tokenizer
        resolve(tokenizer)
      }
    })
  })
}

/**
 * テキストから名詞を抽出
 */
export function extractNouns(tokenizer: any, text: string): string[] {
  if (!text) return []

  const tokens = tokenizer.tokenize(text)
  const nouns = tokens
    .filter((token: any) => {
      const isNoun = token.pos === '名詞'
      const isTargetType = ['一般', '固有名詞', 'サ変接続'].includes(token.pos_detail_1)
      const isLongEnough = token.surface_form.length > 1
      return isNoun && isTargetType && isLongEnough
    })
    .map((token: any) => token.surface_form)

  return nouns
}

/**
 * キーワード頻度カウント
 */
export function countWords(words: string[]): Map<string, number> {
  const counts = new Map<string, number>()

  words.forEach((word) => {
    counts.set(word, (counts.get(word) || 0) + 1)
  })

  return counts
}

/**
 * 頻度順にソートして上位を取得
 */
export function getTopKeywords(wordCounts: Map<string, number>, topN: number = 20): Keyword[] {
  return Array.from(wordCounts.entries())
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, topN)
}
