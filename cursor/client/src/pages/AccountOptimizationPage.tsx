import { useState, useRef } from 'react'
import { Loader2, Sparkle, AlertCircle, Hash, ShieldCheck, Timer, Download } from 'lucide-react'
import api from '../lib/api'
import { useI18nStore } from '../i18n'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'

interface HashtagInfo {
  hashtag: string
  count: number
}

interface GrowthcoreCustomer {
  is_callable: boolean
  message: string
}

interface AccountAnalyticsResult {
  follower_count?: number
  follow_count?: number
  post_count?: number
  username?: string
  full_name?: string
  biography?: string
  profile_image_url?: string
  average_like_count?: number
  average_comment_count?: number
  average_post_hour?: number
  recent_hashtag_list?: HashtagInfo[]
  growthcore_customer?: GrowthcoreCustomer
  follower_grade?: string
  post_count_grade?: string
  activity_grade?: string
  total_grade?: string
  post_type?: string
  photo_rate?: number
  reels_rate?: number
  carousel_rate?: number
  analytics_message?: string
  recommend_service_message?: string[]
}

interface AccountOptimizationResponse {
  status: 'success' | 'error'
  result?: AccountAnalyticsResult
  message?: string
  error_code?: string
}

const gradeColor: Record<string, string> = {
  S: 'bg-gradient-to-r from-amber-500 to-red-500 text-white',
  A: 'bg-amber-400 text-white',
  B: 'bg-emerald-400 text-white',
  C: 'bg-sky-400 text-white',
  D: 'bg-slate-300 text-slate-800',
  F: 'bg-slate-300 text-slate-800',
  充分: 'bg-emerald-400 text-white',
  不足: 'bg-amber-300 text-slate-900',
  やや不足: 'bg-amber-200 text-slate-900',
  とても不足: 'bg-rose-300 text-white',
}

const postTypeLabel: Record<string, string> = {
  PHOTO: 'フォト中心',
  REELS: 'リール中心',
  ALL: 'バランス型',
  NONE: '分類なし',
}

const formatNumber = (value?: number | null) => {
  if (value === undefined || value === null || Number.isNaN(Number(value))) return '-'
  return new Intl.NumberFormat('ja-JP').format(value)
}

const formatHourInterval = (value?: number | null) => {
  if (!value || Number.isNaN(Number(value))) return '-'
  if (value < 24) {
    return `${Math.round(value * 10) / 10} 時間`
  }
  const days = Math.floor(value / 24)
  const hours = Math.round((value % 24) * 10) / 10
  if (hours === 0) return `${days} 日`
  return `${days} 日 ${hours} 時間`
}

function GradeBadge({ label }: { label?: string }) {
  if (!label) return null
  const style = gradeColor[label] || 'bg-slate-200 text-slate-800'
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold tracking-wide ${style}`}>
      {label}
    </span>
  )
}

export default function AccountOptimizationPage() {
  const { t, language } = useI18nStore()
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<AccountAnalyticsResult | null>(null)
  const [searchedId, setSearchedId] = useState<string | null>(null)
  const [history, setHistory] = useState<string[]>([])
  const resultRef = useRef<HTMLDivElement>(null)

  const handleDownloadPNG = async () => {
    if (!resultRef.current) return

    try {
      const html2canvas = (await import('html2canvas')).default
      
      const canvas = await html2canvas(resultRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: false,
      })

      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.download = `${searchedId || 'account'}_analysis_${new Date().toISOString().split('T')[0]}.png`
          link.href = url
          link.click()
          URL.revokeObjectURL(url)
        }
      }, 'image/png')
    } catch (error) {
      console.error('Failed to download PNG:', error)
      alert(t('accountOptimizationDownloadFailed'))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = query.trim()
    if (!trimmed) return

    setLoading(true)
    setError(null)
    setSearchedId(trimmed)

    try {
      const response = await api.get<AccountOptimizationResponse>('/account-optimization', {
        params: { id: trimmed },
      })

      if (response.data.status === 'success') {
        setResult(response.data.result || null)
        setHistory((prev) => {
          const deduped = prev.filter((item) => item !== trimmed)
          return [trimmed, ...deduped].slice(0, 5)
        })
      } else {
        setResult(null)
        setError(response.data.message || t('accountOptimizationErrorGeneric'))
      }
    } catch (err: any) {
      const message =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        t('accountOptimizationErrorGeneric')
      setError(message)
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-r from-blue-500 via-blue-400 to-sky-400 rounded-2xl p-6 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="uppercase tracking-widest text-xs md:text-sm text-blue-100 mb-2">
              Growth Core Insight
            </p>
            <h1 className="text-2xl md:text-3xl font-bold">
              {t('accountOptimizationHeading')}
            </h1>
            <p className="mt-2 text-sm md:text-base text-blue-50/90">
              {t('accountOptimizationSubheading')}
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-xl px-4 py-3 text-sm leading-relaxed border border-white/20">
            <p className="font-semibold text-white flex items-center gap-2">
              <Sparkle className="h-4 w-4" />
              {t('accountOptimizationMemoTitle')}
            </p>
            <p className="text-blue-50 mt-1 text-xs md:text-sm whitespace-pre-line">
              {t('accountOptimizationMemoBody')}
            </p>
          </div>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-800">
            {t('accountOptimizationSearchTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4 items-start md:items-end">
            <div className="w-full md:flex-1">
              <label className="block text-sm font-medium text-gray-600 mb-1">
                {t('accountOptimizationInputLabel')}
              </label>
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder=""
                disabled={loading}
                className="h-12 text-base"
              />
              {history.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                    {t('accountOptimizationRecentSearches')}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {history.map((item) => (
                      <Button
                        key={item}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => setQuery(item)}
                      >
                        {item}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <Button
              type="submit"
              disabled={loading || !query.trim()}
              className="h-12 px-6 bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('accountOptimizationAnalyzing')}
                </span>
              ) : (
                t('accountOptimizationAnalyze')
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
                <p className="font-semibold text-sm">{t('accountOptimizationErrorTitle')}</p>
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
            <p className="text-sm font-medium">{t('accountOptimizationLoadingMessage')}</p>
          </CardContent>
        </Card>
      )}

      {!loading && !result && !error && (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center text-gray-500">
            <p className="text-sm font-medium">{t('accountOptimizationEmptyTitle')}</p>
            <p className="text-xs text-gray-400 mt-2">{t('accountOptimizationEmptySubtitle')}</p>
          </CardContent>
        </Card>
      )}

      {result && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button
              onClick={handleDownloadPNG}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              {t('accountOptimizationDownloadPNG')}
            </Button>
          </div>
          <div ref={resultRef} data-screenshot className="space-y-8 bg-white p-8 rounded-lg">
          <Card className="shadow-sm bg-white">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row gap-8 items-start">
                <div className="flex-shrink-0">
                  {result.profile_image_url ? (
                    <img
                      src={result.profile_image_url}
                      alt={result.username || ''}
                      className="h-40 w-40 rounded-2xl object-cover border shadow-sm"
                    />
                  ) : (
                    <div className="h-40 w-40 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400 text-3xl font-semibold">
                      {result.username?.slice(0, 2).toUpperCase() || 'IG'}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0 space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-2xl font-bold text-gray-900">{result.username}</h2>
                    {searchedId && (
                      <span className="text-xs md:text-sm text-gray-400">
                        {language === 'ja' ? `分析ID: ${searchedId}` : `조회 ID: ${searchedId}`}
                      </span>
                    )}
                  </div>
                  {result.full_name && (
                    <p className="text-sm text-gray-600 leading-relaxed">{result.full_name}</p>
                  )}
                  {result.biography && (
                    <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                      {result.biography}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-3">
                    <GradeBadge label={result.total_grade} />
                    <GradeBadge label={result.follower_grade} />
                    <GradeBadge label={result.post_count_grade} />
                    <GradeBadge label={result.activity_grade} />
                  </div>
                  {result.growthcore_customer && (
                    <div className={`flex items-center gap-2 text-sm ${
                      result.growthcore_customer.is_callable ? 'text-emerald-600' : 'text-gray-500'
                    }`}>
                      <ShieldCheck className="h-4 w-4" />
                      {result.growthcore_customer.is_callable
                        ? t('accountOptimizationCallable')
                        : result.growthcore_customer.message || t('accountOptimizationNonCallable')}
                    </div>
                  )}
                </div>

                <div className="flex-shrink-0 w-full lg:w-52 space-y-4">
                  <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-sky-50 rounded-xl border border-blue-100">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
                      {t('accountOptimizationTotalGrade')}
                    </p>
                    <div className="flex justify-center">
                      <div className={`text-5xl font-bold px-6 py-3 rounded-2xl ${
                        gradeColor[result.total_grade ?? ''] || 'bg-gray-100 text-gray-800'
                      }`}>
                        {result.total_grade || '-'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="p-3 bg-white border border-gray-100 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">{t('accountOptimizationFollowerGrade')}</p>
                      <GradeBadge label={result.follower_grade} />
                    </div>
                    <div className="p-3 bg-white border border-gray-100 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">{t('accountOptimizationPostGrade')}</p>
                      <GradeBadge label={result.post_count_grade} />
                    </div>
                    <div className="p-3 bg-white border border-gray-100 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">{t('accountOptimizationActivityGrade')}</p>
                      <GradeBadge label={result.activity_grade} />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm text-gray-500 uppercase tracking-wider">
                  {t('accountOptimizationMetricsTitle')}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <MetricTile label={t('accountOptimizationFollowerCount')} value={formatNumber(result.follower_count)} />
                <MetricTile label={t('accountOptimizationFollowCount')} value={formatNumber(result.follow_count)} />
                <MetricTile label={t('accountOptimizationPostCount')} value={formatNumber(result.post_count)} />
                <MetricTile label={t('accountOptimizationAverageLikes')} value={formatNumber(result.average_like_count)} />
                <MetricTile label={t('accountOptimizationAverageComments')} value={formatNumber(result.average_comment_count)} />
                <MetricTile
                  label={t('accountOptimizationAverageInterval')}
                  value={formatHourInterval(result.average_post_hour)}
                  icon={<Timer className="h-4 w-4 text-blue-500" />}
                />
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm text-gray-500 uppercase tracking-wider">
                  {t('accountOptimizationPostTypeTitle')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Sparkle className="h-5 w-5 text-amber-500" />
                  <p className="text-sm font-semibold text-gray-700">
                    {postTypeLabel[result.post_type ?? ''] || t('accountOptimizationPostTypeFallback')}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <DistributionBar
                    label={t('accountOptimizationPhotoRate')}
                    value={result.photo_rate ?? 0}
                    color="bg-sky-400"
                  />
                  <DistributionBar
                    label={t('accountOptimizationReelsRate')}
                    value={result.reels_rate ?? 0}
                    color="bg-amber-400"
                  />
                  <DistributionBar
                    label={t('accountOptimizationCarouselRate')}
                    value={result.carousel_rate ?? 0}
                    color="bg-emerald-400"
                  />
                </div>
                {result.recent_hashtag_list && result.recent_hashtag_list.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1">
                      <Hash className="h-4 w-4" />
                      {t('accountOptimizationHashtagTitle')}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {result.recent_hashtag_list.slice(0, 12).map((tag) => (
                        <span
                          key={`${tag.hashtag}-${tag.count}`}
                          className="px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-medium"
                        >
                          #{tag.hashtag}
                          {tag.count > 1 && <span className="ml-1 text-gray-400">×{tag.count}</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {(result.analytics_message || (result.recommend_service_message && result.recommend_service_message.length > 0)) && (
            <Card className="shadow-sm border-blue-100">
              <CardHeader>
                <CardTitle className="text-sm text-blue-500 uppercase tracking-wider">
                  {t('accountOptimizationStrategyTitle')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {result.analytics_message && (
                  <section>
                    <h3 className="text-base font-semibold text-gray-800 mb-2">
                      {t('accountOptimizationAnalysisMessageTitle')}
                    </h3>
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm leading-relaxed text-blue-900 whitespace-pre-line">
                      {result.analytics_message}
                    </div>
                  </section>
                )}

                {result.recommend_service_message && result.recommend_service_message.length > 0 && (
                  <section>
                    <h3 className="text-base font-semibold text-gray-800 mb-3">
                      {t('accountOptimizationRecommendationTitle')}
                    </h3>
                    <div className="space-y-3">
                      {result.recommend_service_message.map((message, index) => (
                        <div
                          key={`${index}-${message.slice(0, 8)}`}
                          className="bg-white border border-blue-100 rounded-xl p-4 text-sm leading-relaxed text-gray-700 whitespace-pre-line shadow-sm"
                        >
                          {message}
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </CardContent>
            </Card>
          )}
          </div>
        </div>
      )}
    </div>
  )
}

function MetricTile({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon?: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white px-4 py-5 shadow-sm flex flex-col gap-2">
      <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest flex items-center gap-2">
        {icon}
        {label}
      </span>
      <span className="text-xl font-semibold text-gray-900">{value}</span>
    </div>
  )
}

function DistributionBar({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: string
}) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest">{label}</div>
      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
        <div className={`h-full transition-all duration-700 ${color}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
      </div>
      <div className="text-xs text-gray-500 text-right">{Math.round(Math.min(100, Math.max(0, value)))}%</div>
    </div>
  )
}


