import { useState, useEffect } from 'react'
import { Clock, Hash, User, MessageSquare } from 'lucide-react'
import api from '../lib/api'
import { useI18nStore } from '../i18n'

interface HistoryEntry {
  id: string
  sales_tracking_id: string
  round: number
  contact_date: string
  content: string | null
  user_id: string
  user_name: string
  created_at: string
}

interface Props {
  entityType: 'retargeting' | 'customer'
  entityId: string
}

export default function SalesHistoryTimeline({ entityType, entityId }: Props) {
  const { language } = useI18nStore()
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [hasHistory, setHasHistory] = useState<boolean | null>(null) // null = 확인 중

  // 마운트 시 히스토리 존재 여부 먼저 확인
  useEffect(() => {
    if (entityId) {
      checkHistoryExists()
    }
  }, [entityId])

  useEffect(() => {
    if (entityId && isExpanded && hasHistory) {
      loadHistory()
    }
  }, [entityId, isExpanded, hasHistory])

  const checkHistoryExists = async () => {
    try {
      const endpoint = entityType === 'retargeting' 
        ? `/retargeting/${entityId}/sales-history`
        : `/customers/${entityId}/sales-history`
      const response = await api.get(endpoint)
      const data = response.data || []
      setHasHistory(data.length > 0)
      if (data.length > 0) {
        setHistory(data)
      }
    } catch (error) {
      console.error('Failed to check sales history:', error)
      setHasHistory(false)
    }
  }

  const loadHistory = async () => {
    try {
      setIsLoading(true)
      const endpoint = entityType === 'retargeting' 
        ? `/retargeting/${entityId}/sales-history`
        : `/customers/${entityId}/sales-history`
      const response = await api.get(endpoint)
      setHistory(response.data || [])
    } catch (error) {
      console.error('Failed to load sales history:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString(language === 'ja' ? 'ja-JP' : 'ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // 차수별 색상 테마
  const getRoundColors = (round: number) => {
    const colors = [
      { dot: 'bg-blue-500', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-800', card: 'bg-blue-50' },
      { dot: 'bg-emerald-500', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-800', card: 'bg-emerald-50' },
      { dot: 'bg-amber-500', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-800', card: 'bg-amber-50' },
      { dot: 'bg-purple-500', border: 'border-purple-200', badge: 'bg-purple-100 text-purple-800', card: 'bg-purple-50' },
      { dot: 'bg-rose-500', border: 'border-rose-200', badge: 'bg-rose-100 text-rose-800', card: 'bg-rose-50' },
    ]
    return colors[(round - 1) % colors.length]
  }

  // 히스토리가 없으면 컴포넌트를 렌더링하지 않음
  if (hasHistory === false) {
    return null
  }

  return (
    <div className="border-t pt-4 mt-4">
      <button
        onClick={() => hasHistory && setIsExpanded(!isExpanded)}
        disabled={hasHistory === null}
        className={`flex items-center gap-2 text-sm font-medium transition-colors w-full ${
          hasHistory === null 
            ? 'text-gray-400 cursor-wait' 
            : 'text-gray-700 hover:text-blue-600 cursor-pointer'
        }`}
      >
        <MessageSquare className="h-4 w-4" />
        <span>{language === 'ja' ? '営業履歴' : '영업 이력 히스토리'}</span>
        {hasHistory === null ? (
          <span className="text-gray-400 text-xs animate-pulse">...</span>
        ) : (
          <span className="text-gray-400 text-xs">
            {isExpanded ? '▼' : '▶'}
          </span>
        )}
        {history.length > 0 && (
          <span className="ml-auto text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
            {history.length}
          </span>
        )}
      </button>

      {isExpanded && (
        <div className="mt-3">
          {isLoading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-4 text-gray-400 text-sm">
              <Clock className="h-8 w-8 mx-auto mb-1 opacity-50" />
              <p>{language === 'ja' ? '営業履歴がありません' : '영업 이력 기록이 없습니다'}</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {history.map((entry) => {
                const colorTheme = getRoundColors(entry.round)
                return (
                  <div 
                    key={entry.id} 
                    className={`relative pl-5 pb-3 border-l-2 ${colorTheme.border} last:border-l-0`}
                  >
                    {/* Timeline dot */}
                    <div className={`absolute left-[-8px] top-0 w-4 h-4 ${colorTheme.dot} rounded-full border-2 border-white shadow-sm flex items-center justify-center`}>
                      <span className="text-[8px] text-white font-bold">{entry.round}</span>
                    </div>
                    
                    <div className={`${colorTheme.card} rounded-lg p-2.5 ml-1 shadow-sm`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${colorTheme.badge}`}>
                          <Hash className="h-2.5 w-2.5 mr-0.5" />
                          {entry.round}{language === 'ja' ? '次' : '차'}
                        </span>
                        <span className="text-[10px] text-gray-500 flex items-center gap-0.5">
                          <User className="h-2.5 w-2.5" />
                          {entry.user_name}
                        </span>
                        <span className="text-[10px] text-gray-400 ml-auto">
                          {formatDate(entry.contact_date)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">
                        {entry.content || (language === 'ja' ? '(内容なし)' : '(내용 없음)')}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
