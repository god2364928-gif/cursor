import { useState, useRef } from 'react'
import { Loader2, Sparkle, AlertCircle, Hash } from 'lucide-react'
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
  
  const gradeColorMap: Record<string, { bg: string; text: string }> = {
    S: { bg: 'linear-gradient(to right, #f59e0b, #ef4444)', text: '#ffffff' },
    A: { bg: '#fbbf24', text: '#ffffff' },
    B: { bg: '#34d399', text: '#ffffff' },
    C: { bg: '#38bdf8', text: '#ffffff' },
    D: { bg: '#cbd5e1', text: '#1e293b' },
    F: { bg: '#cbd5e1', text: '#1e293b' },
    充分: { bg: '#34d399', text: '#ffffff' },
    不足: { bg: '#fcd34d', text: '#1e293b' },
    やや不足: { bg: '#fde68a', text: '#1e293b' },
    とても不足: { bg: '#fda4af', text: '#ffffff' },
  }
  
  const colors = gradeColorMap[label] || { bg: '#e2e8f0', text: '#1e293b' }
  
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      paddingLeft: '12px',
      paddingRight: '12px',
      paddingTop: '4px',
      paddingBottom: '4px',
      borderRadius: '9999px',
      fontSize: '12px',
      fontWeight: 600,
      letterSpacing: '0.025em',
      background: colors.bg,
      color: colors.text,
      lineHeight: 1.2
    }}>
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
        <div className="space-y-6">
          <div ref={resultRef} className="space-y-6 bg-white p-6 rounded-lg">
          <div className="flex items-start gap-6 pb-6 border-b">
            <div className="flex-shrink-0">
              {result.profile_image_url ? (
                <img
                  src={result.profile_image_url}
                  alt={result.username || ''}
                  className="h-32 w-32 rounded-2xl object-cover border-2 shadow-sm"
                />
              ) : (
                <div className="h-32 w-32 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400 text-3xl font-semibold">
                  {result.username?.slice(0, 2).toUpperCase() || 'IG'}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0 space-y-3">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-1">{result.username}</h2>
                {searchedId && (
                  <span className="text-sm text-gray-400">
                    {language === 'ja' ? `分析ID: ${searchedId}` : `조회 ID: ${searchedId}`}
                  </span>
                )}
              </div>
              {result.full_name && (
                <p className="text-base text-gray-700 font-medium">{result.full_name}</p>
              )}
              {result.biography && (
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                  {result.biography}
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
            <div className="space-y-6">
              <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            <MetricBox label={t('accountOptimizationFollowerCount')} value={formatNumber(result.follower_count)} />
            <MetricBox label={t('accountOptimizationFollowCount')} value={formatNumber(result.follow_count)} />
            <MetricBox label={t('accountOptimizationPostCount')} value={formatNumber(result.post_count)} />
            <MetricBox label={t('accountOptimizationAverageLikes')} value={formatNumber(result.average_like_count)} />
            <MetricBox label={t('accountOptimizationAverageComments')} value={formatNumber(result.average_comment_count)} />
            <MetricBox
              label={t('accountOptimizationAverageInterval')}
              value={formatHourInterval(result.average_post_hour)}
            />
              </div>

              <Card className="shadow-sm bg-white">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-blue-600 flex items-center gap-2">
                    <Sparkle className="h-4 w-4" />
                    {t('accountOptimizationPostTypeTitle')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-gray-700 font-medium">
                    {postTypeLabel[result.post_type ?? ''] || t('accountOptimizationPostTypeFallback')}
                  </p>
                  <div className="space-y-3">
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
                    <div className="pt-3 border-t border-blue-100">
                      <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-2 flex items-center gap-1">
                        <Hash className="h-4 w-4" />
                        {t('accountOptimizationHashtagTitle')}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {result.recent_hashtag_list.slice(0, 15).map((tag) => (
                          <span
                            key={`${tag.hashtag}-${tag.count}`}
                            className="px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-medium"
                          >
                            #{tag.hashtag}
                            {tag.count > 1 && <span className="ml-1 text-blue-400">×{tag.count}</span>}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="lg:w-80">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <LegendItem
                  title={t('accountOptimizationLegendOverallLabel')}
                  description={t('accountOptimizationLegendOverallDesc')}
                  badge={result.total_grade}
                />
                <LegendItem
                  title={t('accountOptimizationLegendFollowerLabel')}
                  description={t('accountOptimizationLegendFollowerDesc')}
                  badge={result.follower_grade}
                />
                <LegendItem
                  title={t('accountOptimizationLegendPostLabel')}
                  description={t('accountOptimizationLegendPostDesc')}
                  badge={result.post_count_grade}
                />
                <LegendItem
                  title={t('accountOptimizationLegendActivityLabel')}
                  description={t('accountOptimizationLegendActivityDesc')}
                  badge={result.activity_grade}
                />
              </div>
            </div>
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

function MetricBox({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div style={{
      textAlign: 'center',
      padding: '16px',
      backgroundColor: '#ffffff',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      minHeight: '90px'
    }}>
      <p style={{
        fontSize: '12px',
        color: '#6b7280',
        fontWeight: 500,
        lineHeight: 1.2,
        marginBottom: '8px'
      }}>{label}</p>
      <p style={{
        fontSize: '20px',
        fontWeight: 700,
        color: '#111827',
        lineHeight: 1.2
      }}>{value}</p>
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
  const colorMap: Record<string, string> = {
    'bg-sky-400': '#38bdf8',
    'bg-amber-400': '#fbbf24',
    'bg-emerald-400': '#34d399'
  }
  
  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '6px'
      }}>
        <span style={{
          fontSize: '12px',
          fontWeight: 600,
          color: '#4b5563',
          lineHeight: 1.2
        }}>{label}</span>
        <span style={{
          fontSize: '12px',
          fontWeight: 700,
          color: '#111827',
          lineHeight: 1.2
        }}>{Math.round(Math.min(100, Math.max(0, value)))}%</span>
      </div>
      <div style={{
        height: '10px',
        borderRadius: '9999px',
        backgroundColor: '#f3f4f6',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center'
      }}>
        <div style={{
          height: '100%',
          width: `${Math.min(100, Math.max(0, value))}%`,
          backgroundColor: colorMap[color] || '#38bdf8',
          transition: 'width 0.7s ease'
        }} />
      </div>
    </div>
  )
}

function LegendItem({
  title,
  description,
  badge,
}: {
  title: string
  description: string
  badge?: string
}) {
  return (
    <div style={{
      padding: '16px',
      borderRadius: '8px',
      border: '1px solid #dbeafe',
      backgroundColor: 'rgba(239, 246, 255, 0.6)',
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100px'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '8px'
      }}>
        <p style={{
          fontSize: '14px',
          fontWeight: 600,
          color: '#1d4ed8',
          lineHeight: 1.2
        }}>{title}</p>
        {badge && <GradeBadge label={badge} />}
      </div>
      <p style={{
        fontSize: '12px',
        color: '#2563eb',
        lineHeight: 1.5,
        flex: 1
      }}>{description}</p>
    </div>
  )
}


