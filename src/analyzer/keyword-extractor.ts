import kuromoji from 'kuromoji'
import { join } from 'path'

// kuromoji辞書のパス - プロジェクトルートから解決
// process.cwd()はElectronアプリのルートディレクトリを返す
const DICT_PATH = join(process.cwd(), 'node_modules/kuromoji/dict')

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
