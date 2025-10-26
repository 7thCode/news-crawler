import { useState, useEffect } from 'react'
import {
  Container,
  Box,
  Typography,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  Alert,
  ToggleButton,
  ToggleButtonGroup,
  Divider,
} from '@mui/material'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import SentimentSatisfiedAltIcon from '@mui/icons-material/SentimentSatisfiedAlt'
import SentimentDissatisfiedIcon from '@mui/icons-material/SentimentDissatisfied'
import SentimentNeutralIcon from '@mui/icons-material/SentimentNeutral'
import CompareArrowsIcon from '@mui/icons-material/CompareArrows'

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#90caf9',
    },
    secondary: {
      main: '#f48fb1',
    },
  },
})

interface AnalysisResult {
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

interface ComparisonResult {
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

function App() {
  const [mode, setMode] = useState<'category' | 'compare'>('category')
  const [category, setCategory] = useState('general')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [apiAvailable, setApiAvailable] = useState(false)

  useEffect(() => {
    // 起動時にelectronAPIが利用可能かチェック
    console.log('Checking electronAPI availability...')
    console.log('window.electronAPI:', window.electronAPI)

    if (window.electronAPI) {
      console.log('electronAPI is available!')
      setApiAvailable(true)
    } else {
      console.error('electronAPI is NOT available!')
      setError('Electron APIが利用できません。アプリの再起動を試してください。')
    }
  }, [])

  const handleAnalyze = async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    setComparisonResult(null)

    try {
      if (!window.electronAPI) {
        throw new Error('electronAPI is not available.')
      }

      if (mode === 'category') {
        const response = await window.electronAPI.analyzeTrends(category, 20)
        if (response.success && response.data) {
          setResult(response.data)
        } else {
          setError(response.error || '分析に失敗しました')
        }
      } else {
        const response = await window.electronAPI.compareSnsMedia(20)
        if (response.success && response.data) {
          setComparisonResult(response.data)
        } else {
          setError(response.error || '比較分析に失敗しました')
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return <SentimentSatisfiedAltIcon color="success" />
      case 'negative':
        return <SentimentDissatisfiedIcon color="error" />
      default:
        return <SentimentNeutralIcon color="disabled" />
    }
  }

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <Typography variant="h3" component="h1" gutterBottom>
            🌐 世論トレンド分析システム
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            {mode === 'category' ? 'はてなブックマークから世論の傾向を分析' : 'SNS vs メディアの違いを可視化'}
          </Typography>
          {!apiAvailable && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Electron API初期化中...
            </Alert>
          )}
        </Box>

        <Paper sx={{ p: 3, mb: 4 }}>
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
            <ToggleButtonGroup
              value={mode}
              exclusive
              onChange={(e, newMode) => {
                if (newMode !== null) {
                  setMode(newMode)
                  setResult(null)
                  setComparisonResult(null)
                  setError(null)
                }
              }}
              aria-label="分析モード"
            >
              <ToggleButton value="category" aria-label="カテゴリ別分析">
                <TrendingUpIcon sx={{ mr: 1 }} />
                カテゴリ別分析
              </ToggleButton>
              <ToggleButton value="compare" aria-label="SNS vs メディア比較">
                <CompareArrowsIcon sx={{ mr: 1 }} />
                SNS vs メディア比較
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <Grid container spacing={2} alignItems="center">
            {mode === 'category' && (
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>カテゴリ</InputLabel>
                  <Select value={category} label="カテゴリ" onChange={(e) => setCategory(e.target.value)}>
                    <MenuItem value="general">総合</MenuItem>
                    <MenuItem value="tech">テクノロジー</MenuItem>
                    <MenuItem value="entertainment">エンタメ</MenuItem>
                    <MenuItem value="social">社会</MenuItem>
                    <MenuItem value="economics">政治・経済</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            )}
            <Grid item xs={12} sm={mode === 'category' ? 6 : 12}>
              <Button
                variant="contained"
                size="large"
                fullWidth
                onClick={handleAnalyze}
                disabled={loading || !apiAvailable}
                startIcon={mode === 'category' ? <TrendingUpIcon /> : <CompareArrowsIcon />}
              >
                {loading ? '分析中...' : mode === 'category' ? '分析開始' : '比較分析開始'}
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {loading && <LinearProgress sx={{ mb: 4 }} />}

        {error && (
          <Alert severity="error" sx={{ mb: 4 }}>
            {error}
          </Alert>
        )}

        {comparisonResult && (
          <Grid container spacing={3}>
            {/* SNS vs メディア感情トレンド比較 */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
                    📊 SNS vs メディア 比較分析
                  </Typography>

                  <Grid container spacing={3}>
                    {/* SNS感情分析 */}
                    <Grid item xs={12} md={6}>
                      <Typography variant="h6" gutterBottom color="primary">
                        📱 SNS（ユーザーの意見）
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        平均スコア: {comparisonResult.sns.sentiment.average.toFixed(2)}
                      </Typography>
                      <Box sx={{ mt: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2">😊 ポジティブ</Typography>
                          <Typography variant="body2">{comparisonResult.sns.sentiment.positiveRate.toFixed(1)}%</Typography>
                        </Box>
                        <LinearProgress variant="determinate" value={comparisonResult.sns.sentiment.positiveRate} color="success" sx={{ mb: 2 }} />

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2">😔 ネガティブ</Typography>
                          <Typography variant="body2">{comparisonResult.sns.sentiment.negativeRate.toFixed(1)}%</Typography>
                        </Box>
                        <LinearProgress variant="determinate" value={comparisonResult.sns.sentiment.negativeRate} color="error" sx={{ mb: 2 }} />

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2">😐 中立</Typography>
                          <Typography variant="body2">{comparisonResult.sns.sentiment.neutralRate.toFixed(1)}%</Typography>
                        </Box>
                        <LinearProgress variant="determinate" value={comparisonResult.sns.sentiment.neutralRate} sx={{ mb: 2 }} />
                      </Box>
                    </Grid>

                    {/* メディア感情分析 */}
                    <Grid item xs={12} md={6}>
                      <Typography variant="h6" gutterBottom color="secondary">
                        📰 メディア（報道機関）
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        平均スコア: {comparisonResult.media.sentiment.average.toFixed(2)}
                      </Typography>
                      <Box sx={{ mt: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2">😊 ポジティブ</Typography>
                          <Typography variant="body2">{comparisonResult.media.sentiment.positiveRate.toFixed(1)}%</Typography>
                        </Box>
                        <LinearProgress variant="determinate" value={comparisonResult.media.sentiment.positiveRate} color="success" sx={{ mb: 2 }} />

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2">😔 ネガティブ</Typography>
                          <Typography variant="body2">{comparisonResult.media.sentiment.negativeRate.toFixed(1)}%</Typography>
                        </Box>
                        <LinearProgress variant="determinate" value={comparisonResult.media.sentiment.negativeRate} color="error" sx={{ mb: 2 }} />

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2">😐 中立</Typography>
                          <Typography variant="body2">{comparisonResult.media.sentiment.neutralRate.toFixed(1)}%</Typography>
                        </Box>
                        <LinearProgress variant="determinate" value={comparisonResult.media.sentiment.neutralRate} sx={{ mb: 2 }} />
                      </Box>
                    </Grid>
                  </Grid>

                  <Divider sx={{ my: 3 }} />

                  {/* 感情スコア差 */}
                  <Alert severity={Math.abs(comparisonResult.sentimentDiff) > 0.5 ? 'info' : 'success'} sx={{ mb: 3 }}>
                    <Typography variant="body2">
                      <strong>感情スコア差:</strong> {comparisonResult.sentimentDiff > 0 ? '+' : ''}{comparisonResult.sentimentDiff.toFixed(2)}
                      {Math.abs(comparisonResult.sentimentDiff) > 0.5
                        ? (comparisonResult.sentimentDiff > 0
                          ? ' → SNSの方がポジティブな傾向'
                          : ' → メディアの方がポジティブな傾向')
                        : ' → 感情傾向はほぼ同等'}
                    </Typography>
                  </Alert>
                </CardContent>
              </Card>
            </Grid>

            {/* SNS独自キーワード */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="primary">
                    📱 SNSで特に注目されているキーワード
                  </Typography>
                  <List dense>
                    {comparisonResult.sns.uniqueKeywords.map((kw, index) => (
                      <ListItem key={index}>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Chip label={`${index + 1}`} size="small" color="primary" />
                              <Typography variant="body1">{kw.word}</Typography>
                            </Box>
                          }
                          secondary={`${kw.count}回出現`}
                        />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>

            {/* メディア独自キーワード */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="secondary">
                    📰 メディアで特に報道されているキーワード
                  </Typography>
                  <List dense>
                    {comparisonResult.media.uniqueKeywords.map((kw, index) => (
                      <ListItem key={index}>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Chip label={`${index + 1}`} size="small" color="secondary" />
                              <Typography variant="body1">{kw.word}</Typography>
                            </Box>
                          }
                          secondary={`${kw.count}回出現`}
                        />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {result && (
          <Grid container spacing={3}>
            {/* キーワード */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    🔑 頻出キーワード TOP 10
                  </Typography>
                  <List dense>
                    {result.keywords.slice(0, 10).map((kw, index) => (
                      <ListItem key={index}>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Chip label={`${index + 1}`} size="small" />
                              <Typography variant="body1">{kw.word}</Typography>
                            </Box>
                          }
                          secondary={`${kw.count}回出現`}
                        />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>

            {/* 感情分析 */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    😊 感情トレンド分析
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      平均スコア: {result.sentiment.average.toFixed(2)}
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <SentimentSatisfiedAltIcon color="success" sx={{ mr: 1 }} />
                        <Typography variant="body2">ポジティブ: {result.sentiment.positive}件</Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={(result.sentiment.positive / 20) * 100}
                        color="success"
                        sx={{ mb: 2 }}
                      />

                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <SentimentDissatisfiedIcon color="error" sx={{ mr: 1 }} />
                        <Typography variant="body2">ネガティブ: {result.sentiment.negative}件</Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={(result.sentiment.negative / 20) * 100}
                        color="error"
                        sx={{ mb: 2 }}
                      />

                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <SentimentNeutralIcon color="disabled" sx={{ mr: 1 }} />
                        <Typography variant="body2">中立: {result.sentiment.neutral}件</Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={(result.sentiment.neutral / 20) * 100}
                        sx={{ mb: 2 }}
                      />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* 記事一覧 */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    📰 記事一覧
                  </Typography>
                  <List>
                    {result.articles.map((article, index) => (
                      <ListItem key={index} divider>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {getSentimentIcon(article.sentiment)}
                              <Typography
                                variant="body1"
                                component="a"
                                href={article.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                sx={{ textDecoration: 'none', color: 'inherit', '&:hover': { textDecoration: 'underline' } }}
                              >
                                {article.title}
                              </Typography>
                            </Box>
                          }
                          secondary={`感情スコア: ${article.score.toFixed(1)}`}
                        />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </Container>
    </ThemeProvider>
  )
}

export default App
