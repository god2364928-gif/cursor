import { useState, useCallback, useRef } from 'react'
import { useI18nStore } from '../i18n'
import api from '../lib/api'
import { Hash, Search, Download, Loader2, CheckCircle2, XCircle, ArrowUpDown, Clock } from 'lucide-react'

interface BulkResult {
  hashtag: string
  post_count: number | null
  status: 'pending' | 'loading' | 'done' | 'error'
  error?: string
}

type SortKey = 'hashtag' | 'post_count'
type SortDir = 'asc' | 'desc'

const TAB_OPTIONS = [
  { value: 'popular', labelJa: 'ポピュラー', labelKo: '인기' },
  { value: 'top', labelJa: 'トップ', labelKo: '상위' },
  { value: 'recent', labelJa: '最新', labelKo: '최근' },
  { value: 'foryou', labelJa: 'おすすめ', labelKo: '추천' },
]

function formatNumber(n: number): string {
  return n.toLocaleString()
}

export default function HashtagBulkPage() {
  const { language, t } = useI18nStore()
  const [input, setInput] = useState('')
  const [tab, setTab] = useState('popular')
  const [results, setResults] = useState<BulkResult[]>([])
  const [running, setRunning] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('hashtag')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const abortRef = useRef(false)

  const isJa = language === 'ja'

  const parseHashtags = (text: string): string[] => {
    return text
      .split(/[\n,、]+/)
      .map(s => s.trim().replace(/^#/, ''))
      .filter(s => s.length > 0)
      .filter((v, i, arr) => arr.indexOf(v) === i)
  }

  const startBulk = useCallback(async () => {
    const tags = parseHashtags(input)
    if (tags.length === 0) return

    abortRef.current = false
    setRunning(true)

    const initial: BulkResult[] = tags.map(h => ({ hashtag: h, post_count: null, status: 'pending' }))
    setResults(initial)

    for (let i = 0; i < tags.length; i++) {
      if (abortRef.current) break

      setResults(prev => prev.map((r, idx) =>
        idx === i ? { ...r, status: 'loading' } : r
      ))

      try {
        const res = await api.get('/hashtag-analysis', {
          params: { hashtag: tags[i], tab },
        })
        setResults(prev => prev.map((r, idx) =>
          idx === i ? { ...r, status: 'done', post_count: res.data.post_count ?? 0 } : r
        ))
      } catch (e: any) {
        setResults(prev => prev.map((r, idx) =>
          idx === i ? { ...r, status: 'error', error: e?.response?.data?.error || 'Failed' } : r
        ))
      }
    }

    setRunning(false)
  }, [input, tab])

  const stopBulk = useCallback(() => {
    abortRef.current = true
  }, [])

  const downloadCsv = useCallback(() => {
    const header = 'hashtag,post_count,status\n'
    const rows = results
      .map(r => `${r.hashtag},${r.post_count ?? ''},${r.status}`)
      .join('\n')
    const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `hashtag_bulk_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [results])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir(key === 'post_count' ? 'desc' : 'asc')
    }
  }

  const sortedResults = [...results].sort((a, b) => {
    if (sortKey === 'hashtag') {
      return sortDir === 'asc' ? a.hashtag.localeCompare(b.hashtag) : b.hashtag.localeCompare(a.hashtag)
    }
    const av = a.post_count ?? -1
    const bv = b.post_count ?? -1
    return sortDir === 'asc' ? av - bv : bv - av
  })

  const doneCount = results.filter(r => r.status === 'done').length
  const errorCount = results.filter(r => r.status === 'error').length
  const totalCount = results.length
  const tagCount = parseHashtags(input).length

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('hashtagBulkTitle')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('hashtagBulkSubtitle')}
          </p>
        </div>

        {/* Input */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('hashtagBulkInputLabel')}
          </label>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            rows={6}
            placeholder={isJa
              ? '1行に1つ、またはカンマ区切りでハッシュタグを入力\n\n例：\n東京グルメ\n大阪カフェ\n渋谷ランチ'
              : '줄바꿈 또는 쉼표로 구분하여 해시태그를 입력\n\n예:\n홍대맛집\n강남카페\n이태원맛집'
            }
            className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none resize-none font-mono"
            disabled={running}
          />
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-3">
              <select
                value={tab}
                onChange={e => setTab(e.target.value)}
                disabled={running}
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-violet-500 outline-none"
              >
                {TAB_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{isJa ? o.labelJa : o.labelKo}</option>
                ))}
              </select>
              <span className="text-xs text-gray-400">
                {tagCount > 0 && (isJa ? `${tagCount}件のハッシュタグ` : `${tagCount}개 해시태그`)}
              </span>
            </div>
            <div className="flex gap-2">
              {running ? (
                <button
                  onClick={stopBulk}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  {isJa ? '中止' : '중지'}
                </button>
              ) : (
                <button
                  onClick={startBulk}
                  disabled={tagCount === 0}
                  className="px-5 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                >
                  <Search className="w-4 h-4" />
                  {t('hashtagBulkStart')}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Progress */}
        {results.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            {/* Progress bar */}
            {running && (
              <div className="mb-4">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {isJa ? '照会中...' : '조회 중...'}
                  </span>
                  <span>{doneCount + errorCount} / {totalCount}</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-violet-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${((doneCount + errorCount) / totalCount) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Stats bar */}
            {!running && totalCount > 0 && (
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1.5 text-green-600">
                    <CheckCircle2 className="w-4 h-4" />
                    {doneCount}{isJa ? '件完了' : '개 완료'}
                  </span>
                  {errorCount > 0 && (
                    <span className="flex items-center gap-1.5 text-red-500">
                      <XCircle className="w-4 h-4" />
                      {errorCount}{isJa ? '件エラー' : '개 에러'}
                    </span>
                  )}
                </div>
                <button
                  onClick={downloadCsv}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4" />
                  CSV
                </button>
              </div>
            )}

            {/* Results Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700">
                    <th className="text-left py-2.5 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-10">#</th>
                    <th className="text-left py-2.5 px-3">
                      <button
                        onClick={() => toggleSort('hashtag')}
                        className="flex items-center gap-1 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700 dark:hover:text-gray-300"
                      >
                        {isJa ? 'ハッシュタグ' : '해시태그'}
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="text-right py-2.5 px-3">
                      <button
                        onClick={() => toggleSort('post_count')}
                        className="flex items-center gap-1 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700 dark:hover:text-gray-300 ml-auto"
                      >
                        {isJa ? '投稿数' : '게시물 수'}
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="text-center py-2.5 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                      {isJa ? '状態' : '상태'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedResults.map((r, idx) => (
                    <tr
                      key={r.hashtag}
                      className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                    >
                      <td className="py-2.5 px-3 text-xs text-gray-400">{idx + 1}</td>
                      <td className="py-2.5 px-3">
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                          #{r.hashtag}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {r.status === 'done' && r.post_count !== null ? (
                          <span className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums">
                            {formatNumber(r.post_count)}
                          </span>
                        ) : r.status === 'loading' ? (
                          <Loader2 className="w-4 h-4 text-violet-500 animate-spin ml-auto" />
                        ) : r.status === 'error' ? (
                          <span className="text-xs text-red-400">-</span>
                        ) : (
                          <span className="text-xs text-gray-300">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {r.status === 'done' && (
                          <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3" />
                          </span>
                        )}
                        {r.status === 'loading' && (
                          <span className="inline-flex items-center gap-1 text-xs text-violet-600 bg-violet-50 dark:bg-violet-900/20 px-2 py-0.5 rounded-full">
                            <Loader2 className="w-3 h-3 animate-spin" />
                          </span>
                        )}
                        {r.status === 'error' && (
                          <span className="inline-flex items-center gap-1 text-xs text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-full">
                            <XCircle className="w-3 h-3" />
                          </span>
                        )}
                        {r.status === 'pending' && (
                          <span className="text-xs text-gray-300">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty state */}
        {results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Hash className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-600 dark:text-gray-400">
              {t('hashtagBulkEmptyTitle')}
            </h3>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              {t('hashtagBulkEmptyDesc')}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
