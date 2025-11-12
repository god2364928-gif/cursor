import { useEffect, useRef, useState } from 'react'
import {
  Loader2,
  TrendingUp,
  BarChart3,
  Sparkle,
  AlertCircle,
  Copy,
  Globe,
  CalendarDays,
  MapPin,
  Download,
} from 'lucide-react'
import api from '../lib/api'
import { useI18nStore } from '../i18n'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
} from 'recharts'
import { useClipboardCapture } from '../hooks/useClipboardCapture'

interface KeywordTimeSeriesPoint {
  date: string
  value: number
  isPartial: boolean
}

interface KeywordMonthlyRow {
  rank: number
  month: string
  average_score: number
  label_ja?: string
  label_ko?: string
  search_volume?: number | null
  volume_index?: number | null
}

interface KeywordWeekdayRow {
  rank: number
  weekday: string
  average_score: number
  label_ja?: string
  label_ko?: string
}

interface KeywordPeakRow {
  rank: number
  week_start: string
  value: number
}

interface KeywordAdsSummary {
  avg_monthly_searches: number | null
  competition_index: number | null
  low_cpc: number | null
  high_cpc: number | null
  monthly_breakdown?: { year_month: string; search_volume: number }[]
}

interface KeywordRelatedEntry {
  query: string
  value: number | null
}

interface KeywordPlacesEntry {
  name: string
  rating: number | null
  user_ratings_total: number | null
  address: string | null
}

interface KeywordPlacesSection {
  status: string
  message?: string
  summary?: {
    total_places?: number | null
    average_rating?: number | null
    average_reviews?: number | null
  }
  examples?: KeywordPlacesEntry[]
}

interface KeywordAnalysisSummary {
  status: 'success' | 'error'
  message?: string
  keyword: string
  geo: string
  lang: string
  timeframe: string
  generated_at: string
  ads_warning: boolean
  insights: Record<string, string>
  time_series: KeywordTimeSeriesPoint[]
  monthly_ranking: KeywordMonthlyRow[]
  weekday_ranking: KeywordWeekdayRow[]
  weekly_peaks: KeywordPeakRow[]
  ads_summary: KeywordAdsSummary
  related_queries: {
    top: KeywordRelatedEntry[]
    rising: KeywordRelatedEntry[]
  }
  places: KeywordPlacesSection
}

export default function KeywordAnalysisPage() {
  const { t, language } = useI18nStore()
  const [keyword, setKeyword] = useState('')
  const [geo, setGeo] = useState(language === 'ko' ? 'KR' : 'JP')
  const [timeframe, setTimeframe] = useState('today 12-m')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<KeywordAnalysisSummary | null>(null)
  const [history, setHistory] = useState<string[]>([])
  const resultRef = useRef<HTMLDivElement>(null)
  const { copyFeedback, copyToClipboard, downloadAsImage } = useClipboardCapture(language)

  useEffect(() => {
    setGeo(language === 'ko' ? 'KR' : 'JP')
  }, [language])

  const timeframeOptions = [
    { value: 'today 12-m', label: language === 'ko' ? '최근 12개월' : '直近12か月' },
    { value: 'today 3-m', label: language === 'ko' ? '최근 3개월' : '直近3か月' },
    { value: 'today 5-y', label: language === 'ko' ? '최근 5년' : '直近5年' },
  ]

  const geoOptions = [
    { value: 'JP', label: language === 'ko' ? '일본' : '日本' },
    { value: 'KR', label: language === 'ko' ? '한국' : '韓国' },
    { value: 'US', label: 'US' },
  ]

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const trimmed = keyword.trim()
    if (!trimmed) return

    setLoading(true)
    setError(null)
    try {
      const response = await api.post<KeywordAnalysisSummary>('/keyword-analysis', {
        keyword: trimmed,
        geo,
        lang: language,
        timeframe,
      })
      const payload = response.data
      if (payload.status === 'success') {
        setResult(payload)
        setHistory((prev) => {
          const deduped = prev.filter((item) => item !== trimmed)
          return [trimmed, ...deduped].slice(0, 5)
        })
      } else {
        setError(payload.message || t('keywordAnalysisErrorTitle'))
        setResult(null)
      }
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        t('keywordAnalysisErrorTitle')
      setError(message)
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  const monthLabelKey = language === 'ko' ? 'label_ko' : 'label_ja'

  const monthlyChartData =
    result?.monthly_ranking.slice(0, 6).map((row) => ({
      label: row[monthLabelKey as keyof KeywordMonthlyRow] || row.month,
      value: Math.round(row.average_score * 10) / 10,
    })) ?? []

  const weekdayChartData =
    result?.weekday_ranking.slice().sort((a, b) => a.rank - b.rank).map((row) => ({
      label: row[monthLabelKey as keyof KeywordWeekdayRow] || row.weekday,
      value: Math.round(row.average_score * 10) / 10,
    })) ?? []

  const adsSummary = result?.ads_summary

  const placesExamples = result?.places.examples ?? []

  return (
    <div className="min-h-screen bg-gray-100 p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('keywordAnalysisHeading')}</h1>
          <p className="text-gray-600">{t('keywordAnalysisSubheading')}</p>
        </div>
      </div>

      {copyFeedback && (
        <div className="fixed top-20 right-6 z-50 flex flex-col gap-2">
          <div
            className={`rounded-lg shadow-lg px-4 py-3 border ${
              copyFeedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200'
                : 'bg-red-50 border-red-200'
            }`}
          >
            <p
              className={`text-sm font-semibold ${
                copyFeedback.type === 'success' ? 'text-emerald-600' : 'text-red-500'
              }`}
            >
              {copyFeedback.message}
            </p>
          </div>
        </div>
      )}

      <section className="space-y-8">
        <Card className="bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500 text-white shadow-md border-0">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                  <TrendingUp className="h-6 w-6" />
                  {t('keywordAnalysisHeading')}
                </h2>
                <p className="mt-2 text-sm md:text-base text-purple-50/90">
                  {t('keywordAnalysisSubheading')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-purple-500" />
              {t('keywordAnalysisSearchTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleSubmit}
              className="flex flex-col lg:flex-row gap-4 items-start lg:items-end"
            >
              <div className="w-full lg:flex-1 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    {t('keywordAnalysisInputLabel')}
                  </label>
                  <Input
                    value={keyword}
                    onChange={(event) => setKeyword(event.target.value)}
                    placeholder={t('keywordAnalysisPlaceholder')}
                    disabled={loading}
                    className="h-12 text-base"
                  />
                </div>
                {history.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                      {t('keywordAnalysisRecentKeywords')}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {history.map((item) => (
                        <Button
                          key={item}
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          onClick={() => setKeyword(item)}
                        >
                          {item}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex w-full lg:w-auto gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest">
                    {t('keywordAnalysisGeoLabel')}
                  </label>
                  <select
                    value={geo}
                    onChange={(event) => setGeo(event.target.value)}
                    className="h-12 border border-gray-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                    disabled={loading}
                  >
                    {geoOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest">
                    {t('keywordAnalysisTimeframeLabel')}
                  </label>
                  <select
                    value={timeframe}
                    onChange={(event) => setTimeframe(event.target.value)}
                    className="h-12 border border-gray-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                    disabled={loading}
                  >
                    {timeframeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading || !keyword.trim()}
                className="h-12 px-6 bg-purple-600 hover:bg-purple-700"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('keywordAnalysisLoading')}
                  </span>
                ) : (
                  t('keywordAnalysisAnalyze')
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {error && (
          <Card className="border-red-200 bg-red-50/60">
            <CardContent className="py-6">
              <div className="flex items-start gap-3 text-red-600">
                <AlertCircle className="h-5 w-5 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">{t('keywordAnalysisErrorTitle')}</p>
                  <p className="text-sm leading-relaxed whitespace-pre-line">{error}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {loading && !result && (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center text-gray-500">
              <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin" />
              <p className="text-sm font-medium">{t('keywordAnalysisLoading')}</p>
            </CardContent>
          </Card>
        )}

        {!loading && !result && !error && (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center text-gray-500">
              <p className="text-sm font-medium">{t('keywordAnalysisEmptyTitle')}</p>
              <p className="text-xs text-gray-400 mt-2">{t('keywordAnalysisEmptySubtitle')}</p>
            </CardContent>
          </Card>
        )}

        {result && (
          <div className="space-y-4">
            <div className="flex justify-end gap-2 flex-wrap">
              <Button
                onClick={() => copyToClipboard(resultRef.current)}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Copy className="h-4 w-4" />
                {t('keywordAnalysisCopy')}
              </Button>
              <Button
                onClick={() =>
                  downloadAsImage(resultRef.current, {
                    fileName: `${(result.keyword || 'keyword')
                      .replace(/[^\p{L}\p{N}_-]+/gu, '-')
                      .replace(/^-+|-+$/g, '') || 'keyword'}_${new Date()
                      .toISOString()
                      .split('T')[0]}`,
                    errorMessage: t('keywordAnalysisDownloadFailed'),
                  })
                }
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                {t('keywordAnalysisDownload')}
              </Button>
            </div>
            <div
              ref={resultRef}
              data-screenshot="keyword-analysis"
              className="space-y-6 bg-white p-6 rounded-lg shadow"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b pb-4">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                    {t('keywordAnalysisKeywordLabel')}
                  </p>
                  <h3 className="text-2xl font-bold text-gray-900">{result.keyword}</h3>
                </div>
                <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <Globe className="h-4 w-4 text-purple-500" />
                    {result.geo}
                  </span>
                  <span className="flex items-center gap-1">
                    <CalendarDays className="h-4 w-4 text-purple-500" />
                    {result.timeframe}
                  </span>
                  <span className="flex items-center gap-1">
                    <Sparkle className="h-4 w-4 text-purple-500" />
                    {t('keywordAnalysisGeneratedAt')}: {result.generated_at}
                  </span>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-5">
                  <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-2 mb-3">
                    <TrendingUp className="h-4 w-4 text-purple-500" />
                    {t('keywordAnalysisInsightsTitle')}
                  </h4>
                  <ul className="space-y-2 text-sm text-slate-700">
                    {Object.values(result.insights || {})
                      .filter(Boolean)
                      .map((line, index) => (
                        <li key={`${line}-${index}`} className="flex gap-2">
                          <span className="text-purple-500 mt-1">•</span>
                          <span>{line}</span>
                        </li>
                      ))}
                  </ul>
                </div>

                <div className="bg-slate-50 border border-slate-100 rounded-xl p-5">
                  <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-3">
                    {t('keywordAnalysisTrendChartTitle')}
                  </h4>
                  {result.time_series.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={result.time_series}>
                        <defs>
                          <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#a855f7" stopOpacity={0.6} />
                            <stop offset="100%" stopColor="#a855f7" stopOpacity={0.05} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={20} />
                        <YAxis tick={{ fontSize: 11 }} width={40} />
                        <Tooltip formatter={(value: number) => [`${value}`, t('keywordAnalysisTrendChartTitle')]} />
                        <Area type="monotone" dataKey="value" stroke="#9333ea" fill="url(#trendGradient)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-sm text-gray-500">{t('keywordAnalysisNoData')}</p>
                  )}
                  <p className="text-[11px] text-gray-400 mt-2">{t('keywordAnalysisTimeSeriesPartial')}</p>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="bg-white border border-slate-100 rounded-xl p-5">
                  <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-3">
                    {t('keywordAnalysisMonthlyTableTitle')}
                  </h4>
                  {monthlyChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={monthlyChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} width={40} />
                        <Tooltip formatter={(value: number) => [`${value}`, t('keywordAnalysisMonthlyTableTitle')]} />
                        <Bar dataKey="value" fill="#7c3aed" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-sm text-gray-500">{t('keywordAnalysisNoData')}</p>
                  )}
                </div>

                <div className="bg-white border border-slate-100 rounded-xl p-5">
                  <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-3">
                    {t('keywordAnalysisWeekdayTableTitle')}
                  </h4>
                  {weekdayChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={weekdayChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} width={40} />
                        <Tooltip formatter={(value: number) => [`${value}`, t('keywordAnalysisWeekdayTableTitle')]} />
                        <Bar dataKey="value" fill="#6366f1" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-sm text-gray-500">{t('keywordAnalysisNoData')}</p>
                  )}
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-5">
                  <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-3">
                    {t('keywordAnalysisWeeklyPeaksTitle')}
                  </h4>
                  {result.weekly_peaks.length > 0 ? (
                    <ul className="space-y-2 text-sm text-slate-700">
                      {result.weekly_peaks.map((peak) => (
                        <li key={peak.rank} className="flex justify-between bg-white rounded-lg px-4 py-2 border border-slate-200">
                          <span>
                            #{peak.rank} {peak.week_start}
                          </span>
                          <span className="font-semibold text-purple-600">{peak.value}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500">{t('keywordAnalysisNoData')}</p>
                  )}
                </div>

                <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkle className="h-4 w-4 text-purple-500" />
                    <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
                      {t('keywordAnalysisAdsTitle')}
                    </h4>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm text-slate-700">
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-widest">{t('keywordAnalysisAvgSearches')}</p>
                      <p className="font-semibold">{adsSummary?.avg_monthly_searches ?? '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-widest">{t('keywordAnalysisCompetition')}</p>
                      <p className="font-semibold">{adsSummary?.competition_index ?? '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-widest">{t('keywordAnalysisLowCpc')}</p>
                      <p className="font-semibold">{adsSummary?.low_cpc ?? '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-widest">{t('keywordAnalysisHighCpc')}</p>
                      <p className="font-semibold">{adsSummary?.high_cpc ?? '-'}</p>
                    </div>
                  </div>
                  {result.ads_warning && (
                    <p className="text-xs text-slate-500 bg-white border border-slate-200 rounded-lg px-3 py-2">
                      {t('keywordAnalysisAdsWarning')}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="bg-white border border-slate-100 rounded-xl p-5">
                  <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-3">
                    {t('keywordAnalysisRelatedTitle')}
                  </h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-xs text-purple-500 uppercase tracking-widest font-semibold mb-2">
                        {t('keywordAnalysisTopQueries')}
                      </p>
                      <ul className="space-y-2">
                        {(result.related_queries.top ?? []).map((item) => (
                          <li key={item.query} className="flex items-center justify-between text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                            <span className="truncate max-w-[160px]" title={item.query}>
                              {item.query}
                            </span>
                            <span className="font-semibold text-purple-600">{item.value ?? '-'}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs text-purple-500 uppercase tracking-widest font-semibold mb-2">
                        {t('keywordAnalysisRisingQueries')}
                      </p>
                      <ul className="space-y-2">
                        {(result.related_queries.rising ?? []).map((item) => (
                          <li key={item.query} className="flex items-center justify-between text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                            <span className="truncate max-w-[160px]" title={item.query}>
                              {item.query}
                            </span>
                            <span className="font-semibold text-purple-600">{item.value ?? '-'}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-slate-100 rounded-xl p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-purple-500" />
                    <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
                      {t('keywordAnalysisPlacesTitle')}
                    </h4>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-sm text-slate-700">
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-widest">{t('keywordAnalysisPlacesTotal')}</p>
                      <p className="font-semibold">{result.places.summary?.total_places ?? '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-widest">{t('keywordAnalysisPlacesRating')}</p>
                      <p className="font-semibold">{result.places.summary?.average_rating ?? '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-widest">{t('keywordAnalysisPlacesReviews')}</p>
                      <p className="font-semibold">{result.places.summary?.average_reviews ?? '-'}</p>
                    </div>
                  </div>
                  {result.places.status !== 'ok' && result.places.message && (
                    <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                      {result.places.message}
                    </p>
                  )}
                  {placesExamples.length > 0 && (
                    <div className="space-y-2 text-sm text-slate-700">
                      {placesExamples.slice(0, 3).map((place) => (
                        <div key={place.name} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                          <p className="font-semibold">{place.name}</p>
                          <p className="text-xs text-slate-500">
                            {place.rating ?? '-'} / {place.user_ratings_total ?? '-'}
                          </p>
                          <p className="text-xs text-slate-500">{place.address ?? '-'}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}


