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
} from '@mui/material'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import SentimentSatisfiedAltIcon from '@mui/icons-material/SentimentSatisfiedAlt'
import SentimentDissatisfiedIcon from '@mui/icons-material/SentimentDissatisfied'
import SentimentNeutralIcon from '@mui/icons-material/SentimentNeutral'

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

function App() {
  const [category, setCategory] = useState('general')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
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

    try {
      // デバッグ: window.electronAPIの存在確認
      console.log('window.electronAPI:', window.electronAPI)

      if (!window.electronAPI) {
        throw new Error('electronAPI is not available. Preload script may not be loaded correctly.')
      }

      const response = await window.electronAPI.analyzeTrends(category, 20)

      if (response.success && response.data) {
        setResult(response.data)
      } else {
        setError(response.error || '分析に失敗しました')
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
            はてなブックマークから世論の傾向を分析
          </Typography>
          {!apiAvailable && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Electron API初期化中...
            </Alert>
          )}
        </Box>

        <Paper sx={{ p: 3, mb: 4 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>カテゴリ</InputLabel>
                <Select value={category} label="カテゴリ" onChange={(e) => setCategory(e.target.value)}>
                  <MenuItem value="general">総合</MenuItem>
                  <MenuItem value="tech">テクノロジー</MenuItem>
                  <MenuItem value="entertainment">エンタメ</MenuItem>
                  <MenuItem value="social">社会</MenuItem>
                  <MenuItem value="economics">政治・経済</MenuItem>
                  <MenuItem value="knowledge">学び</MenuItem>
                  <MenuItem value="life">生活・文化</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Button
                variant="contained"
                size="large"
                fullWidth
                onClick={handleAnalyze}
                disabled={loading || !apiAvailable}
                startIcon={<TrendingUpIcon />}
              >
                {loading ? '分析中...' : '分析開始'}
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
