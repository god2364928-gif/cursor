import { useState, useCallback } from 'react'
import { useI18nStore } from '../i18n'
import api from '../lib/api'
import { Search, Hash, TrendingUp, Image, Heart, MessageCircle, Play, Clock, Loader2, X } from 'lucide-react'

interface AutocompleteHashtag {
  hashtag: string
  hashtag_pk: string
  post_count: number
}

interface RelationHashtag {
  hashtag: string
  score: number
}

interface PostOwner {
  user_pk: string
  username: string
  thumbnail_url: string
}

interface PostItem {
  post_pk: string
  shortcode: string
  media_type: string
  like_count: number
  comment_count: number
  play_count: number
  contents: string
  hashtag_list: string[]
  thumbnail_url: string
  owner: PostOwner
  post_time: number
}

interface HashtagData {
  result: number
  tab: string
  hashtag: string
  hashtag_pk: string
  post_count: number
  autocomplete_hashtag_list: AutocompleteHashtag[]
  relation_hashtag_list: RelationHashtag[]
  post_list: PostItem[]
}

const TAB_OPTIONS = [
  { value: 'popular', labelJa: 'ポピュラー', labelKo: '인기' },
  { value: 'top', labelJa: 'トップ', labelKo: '상위' },
  { value: 'recent', labelJa: '最新', labelKo: '최근' },
  { value: 'foryou', labelJa: 'おすすめ', labelKo: '추천' },
]

const RECENT_KEY = 'hashtag-analysis-recent'

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return n.toLocaleString()
}

function timeAgo(timestamp: number, lang: string): string {
  const now = Math.floor(Date.now() / 1000)
  const diff = now - timestamp
  const days = Math.floor(diff / 86400)
  if (days > 30) {
    const months = Math.floor(days / 30)
    return lang === 'ja' ? `${months}ヶ月前` : `${months}개월 전`
  }
  if (days > 0) return lang === 'ja' ? `${days}日前` : `${days}일 전`
  const hours = Math.floor(diff / 3600)
  if (hours > 0) return lang === 'ja' ? `${hours}時間前` : `${hours}시간 전`
  return lang === 'ja' ? '数分前' : '방금 전'
}

export default function HashtagAnalysisPage() {
  const { language, t } = useI18nStore()
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState('popular')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState<HashtagData | null>(null)
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]')
    } catch { return [] }
  })

  const isJa = language === 'ja'

  const addRecent = useCallback((tag: string) => {
    setRecentSearches(prev => {
      const next = [tag, ...prev.filter(s => s !== tag)].slice(0, 5)
      localStorage.setItem(RECENT_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const search = useCallback(async (hashtag?: string) => {
    const term = (hashtag || query).trim().replace(/^#/, '')
    if (!term) return

    setLoading(true)
    setError('')
    setData(null)

    try {
      const res = await api.get('/hashtag-analysis', { params: { hashtag: term, tab } })
      setData(res.data)
      addRecent(term)
    } catch (e: any) {
      setError(isJa ? '分析に失敗しました。しばらくしてから再度お試しください。' : '분석에 실패했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }, [query, tab, addRecent, isJa])

  const maxAutoCount = data?.autocomplete_hashtag_list?.length
    ? Math.max(...data.autocomplete_hashtag_list.map(h => h.post_count))
    : 1

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('hashtagAnalysisTitle')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('hashtagAnalysisSubtitle')}
          </p>
        </div>

        {/* Search */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && search()}
                placeholder={isJa ? 'ハッシュタグを入力（例：東京グルメ）' : '해시태그를 입력 (예: 홍대맛집)'}
                className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={tab}
                onChange={e => setTab(e.target.value)}
                className="px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-violet-500 outline-none"
              >
                {TAB_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{isJa ? o.labelJa : o.labelKo}</option>
                ))}
              </select>
              <button
                onClick={() => search()}
                disabled={loading || !query.trim()}
                className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                {t('hashtagAnalysisSearch')}
              </button>
            </div>
          </div>

          {recentSearches.length > 0 && (
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-400">{t('hashtagAnalysisRecent')}:</span>
              {recentSearches.map(s => (
                <button
                  key={s}
                  onClick={() => { setQuery(s); search(s) }}
                  className="text-xs px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-violet-100 dark:hover:bg-violet-900/30 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
                >
                  #{s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-10 h-10 text-violet-500 animate-spin" />
            <p className="text-sm text-gray-500">{isJa ? '分析中です。15〜30秒ほどかかります...' : '분석 중입니다. 15~30초 정도 소요됩니다...'}</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center gap-3">
            <X className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && !data && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Hash className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-600 dark:text-gray-400">
              {t('hashtagAnalysisEmptyTitle')}
            </h3>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              {t('hashtagAnalysisEmptyDesc')}
            </p>
          </div>
        )}

        {/* Results */}
        {data && !loading && (
          <div className="space-y-6">
            {/* Main Stats */}
            <div className="bg-gradient-to-br from-violet-600 to-indigo-700 rounded-xl p-6 text-white shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Hash className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">#{data.hashtag}</h2>
                  <p className="text-violet-200 text-sm">{TAB_OPTIONS.find(o => o.value === data.tab)?.[isJa ? 'labelJa' : 'labelKo']} tab</p>
                </div>
              </div>
              <div className="mt-2">
                <p className="text-violet-200 text-xs uppercase tracking-wider mb-1">
                  {isJa ? '総投稿数' : '총 게시물 수'}
                </p>
                <p className="text-4xl font-bold tracking-tight">{data.post_count.toLocaleString()}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Related Hashtags (autocomplete) */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-violet-500" />
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {t('hashtagAnalysisRelated')}
                  </h3>
                  <span className="text-xs text-gray-400 ml-auto">{data.autocomplete_hashtag_list?.length || 0}{isJa ? '件' : '개'}</span>
                </div>
                <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                  {data.autocomplete_hashtag_list?.slice(0, 30).map((item, i) => (
                    <button
                      key={item.hashtag_pk}
                      onClick={() => { setQuery(item.hashtag); search(item.hashtag) }}
                      className="w-full group"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400 w-5 text-right flex-shrink-0">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-800 dark:text-gray-200 group-hover:text-violet-600 dark:group-hover:text-violet-400 truncate transition-colors">
                              #{item.hashtag}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 ml-2">
                              {formatNumber(item.post_count)}
                            </span>
                          </div>
                          <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                            <div
                              className="bg-violet-500 h-1.5 rounded-full transition-all"
                              style={{ width: `${Math.max((item.post_count / maxAutoCount) * 100, 2)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Relation hashtags */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Hash className="w-5 h-5 text-indigo-500" />
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {t('hashtagAnalysisRelation')}
                  </h3>
                </div>
                {data.relation_hashtag_list?.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {data.relation_hashtag_list.map(rel => (
                      <button
                        key={rel.hashtag}
                        onClick={() => { setQuery(rel.hashtag); search(rel.hashtag) }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                      >
                        <span>#{rel.hashtag}</span>
                        <span className="text-xs opacity-60">({rel.score})</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">{isJa ? 'データがありません' : '데이터가 없습니다'}</p>
                )}

                {/* Post Stats Summary */}
                {data.post_list?.length > 0 && (
                  <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-700">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      {isJa ? '投稿統計サマリー' : '게시물 통계 요약'}
                    </h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center p-3 bg-pink-50 dark:bg-pink-900/20 rounded-lg">
                        <Heart className="w-4 h-4 text-pink-500 mx-auto mb-1" />
                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                          {formatNumber(Math.round(data.post_list.reduce((s, p) => s + p.like_count, 0) / data.post_list.length))}
                        </p>
                        <p className="text-xs text-gray-500">{isJa ? '平均いいね' : '평균 좋아요'}</p>
                      </div>
                      <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <MessageCircle className="w-4 h-4 text-blue-500 mx-auto mb-1" />
                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                          {formatNumber(Math.round(data.post_list.reduce((s, p) => s + p.comment_count, 0) / data.post_list.length))}
                        </p>
                        <p className="text-xs text-gray-500">{isJa ? '平均コメント' : '평균 댓글'}</p>
                      </div>
                      <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <Play className="w-4 h-4 text-green-500 mx-auto mb-1" />
                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                          {formatNumber(Math.round(data.post_list.filter(p => p.play_count > 0).reduce((s, p) => s + p.play_count, 0) / Math.max(data.post_list.filter(p => p.play_count > 0).length, 1)))}
                        </p>
                        <p className="text-xs text-gray-500">{isJa ? '平均再生数' : '평균 재생수'}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Posts Grid */}
            {data.post_list?.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Image className="w-5 h-5 text-violet-500" />
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {t('hashtagAnalysisPosts')}
                  </h3>
                  <span className="text-xs text-gray-400 ml-auto">{data.post_list.length}{isJa ? '件' : '개'}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {data.post_list.map(post => (
                    <a
                      key={post.post_pk}
                      href={`https://www.instagram.com/p/${post.shortcode}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group border border-gray-100 dark:border-gray-700 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                    >
                      <div className="aspect-square bg-gray-100 dark:bg-gray-700 relative overflow-hidden">
                        <img
                          src={post.thumbnail_url}
                          alt=""
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                        />
                        {post.media_type === 'GraphVideo' && (
                          <div className="absolute top-2 right-2 bg-black/60 rounded-full p-1">
                            <Play className="w-3 h-3 text-white fill-white" />
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <img
                            src={post.owner.thumbnail_url}
                            alt=""
                            className="w-6 h-6 rounded-full object-cover"
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                          />
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
                            @{post.owner.username}
                          </span>
                          <span className="text-xs text-gray-400 ml-auto flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {timeAgo(post.post_time, language)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-2 min-h-[2rem]">
                          {post.contents?.slice(0, 100)}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Heart className="w-3 h-3 text-pink-500" />
                            {formatNumber(post.like_count)}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageCircle className="w-3 h-3 text-blue-500" />
                            {formatNumber(post.comment_count)}
                          </span>
                          {post.play_count > 0 && (
                            <span className="flex items-center gap-1">
                              <Play className="w-3 h-3 text-green-500" />
                              {formatNumber(post.play_count)}
                            </span>
                          )}
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
