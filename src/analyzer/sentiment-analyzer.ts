import { POSITIVE_WORDS, NEGATIVE_WORDS, INTENSIFIERS, NEGATIONS } from './sentiment-dictionary.js'

export interface SentimentResult {
  score: number
  positive: number
  negative: number
  neutral: number
  sentiment: 'positive' | 'negative' | 'neutral'
  details: Array<{
    word: string
    position: number
    score: number
    context: string
  }>
}

/**
 * テキストの感情スコアを計算
 */
export function analyzeSentiment(tokenizer: any, text: string): SentimentResult {
  if (!text) {
    return {
      score: 0,
      positive: 0,
      negative: 0,
      neutral: 0,
      sentiment: 'neutral',
      details: [],
    }
  }

  const tokens = tokenizer.tokenize(text)
  let positiveCount = 0
  let negativeCount = 0
  const details: SentimentResult['details'] = []

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    const word = token.surface_form
    const basicForm = token.basic_form || word

    let score = 0

    // ポジティブ単語チェック
    if (POSITIVE_WORDS.some((pw) => word.includes(pw) || basicForm.includes(pw))) {
      score = 1
    }

    // ネガティブ単語チェック
    if (NEGATIVE_WORDS.some((nw) => word.includes(nw) || basicForm.includes(nw))) {
      score = -1
    }

    // スコアがある場合、前後の単語をチェック
    if (score !== 0) {
      let finalScore = score

      // 強調語チェック（1つ前の単語）
      if (i > 0) {
        const prevWord = tokens[i - 1].surface_form
        if (INTENSIFIERS.some((int) => prevWord.includes(int))) {
          finalScore *= 1.5
        }

        // 否定語チェック（1-2単語前）
        const prevWords = [i > 0 ? tokens[i - 1].surface_form : '', i > 1 ? tokens[i - 2].surface_form : '']

        if (prevWords.some((pw) => NEGATIONS.some((neg) => pw.includes(neg)))) {
          finalScore *= -1 // 否定でスコア反転
        }
      }

      if (finalScore > 0) {
        positiveCount += finalScore
      } else {
        negativeCount += Math.abs(finalScore)
      }

      details.push({
        word,
        position: i,
        score: finalScore,
        context: tokens
          .slice(Math.max(0, i - 2), Math.min(tokens.length, i + 3))
          .map((t: any) => t.surface_form)
          .join(''),
      })
    }
  }

  const totalScore = positiveCount - negativeCount

  return {
    score: totalScore,
    positive: positiveCount,
    negative: negativeCount,
    neutral: tokens.length - (positiveCount + negativeCount),
    sentiment: totalScore > 0 ? 'positive' : totalScore < 0 ? 'negative' : 'neutral',
    details,
  }
}
