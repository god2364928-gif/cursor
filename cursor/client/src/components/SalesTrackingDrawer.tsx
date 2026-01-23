import { useState, useEffect } from 'react'
import { X, Send, Clock, User, MessageSquare, Hash, Plus } from 'lucide-react'
import { Button } from './ui/button'
import api from '../lib/api'
import { useToast } from './ui/toast'
import { useI18nStore } from '../i18n'
import { useAuthStore } from '../store/authStore'

interface SalesTrackingRecord {
  id: string
  date: string
  occurred_at?: string
  manager_name: string
  company_name?: string
  account_id?: string
  industry?: string
  contact_method?: string
  status: string
  phone?: string
  memo?: string
  last_contact_at?: string
}

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
  record: SalesTrackingRecord | null
  onClose: () => void
  onUpdate?: () => void
}

export default function SalesTrackingDrawer({ record, onClose, onUpdate }: Props) {
  const { showToast } = useToast()
  const { t, language } = useI18nStore()
  const user = useAuthStore((state) => state.user)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [nextRound, setNextRound] = useState(1)
  const [newContent, setNewContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (record) {
      loadHistory()
    }
  }, [record?.id])

  const loadHistory = async () => {
    if (!record) return
    
    try {
      setIsLoading(true)
      const [historyRes, roundRes] = await Promise.all([
        api.get(`/sales-tracking/${record.id}/history`),
        api.get(`/sales-tracking/${record.id}/next-round`)
      ])
      setHistory(historyRes.data || [])
      setNextRound(roundRes.data.nextRound || 1)
    } catch (error) {
      console.error('Failed to load history:', error)
      showToast(language === 'ja' ? '履歴の読み込みに失敗しました' : '히스토리 로딩 실패', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddHistory = async () => {
    if (!record || !newContent.trim()) {
      showToast(language === 'ja' ? '内容を入力してください' : '내용을 입력해주세요', 'error')
      return
    }

    try {
      setIsSubmitting(true)
      await api.post(`/sales-tracking/${record.id}/history`, {
        round: nextRound,
        content: newContent.trim()
      })
      
      showToast(
        language === 'ja' 
          ? `${nextRound}次連絡を記録しました` 
          : `${nextRound}차 연락 기록 완료`,
        'success'
      )
      
      setNewContent('')
      await loadHistory()
      onUpdate?.()
    } catch (error: any) {
      console.error('Failed to add history:', error)
      showToast(
        error.response?.data?.message || (language === 'ja' ? '記録に失敗しました' : '기록 실패'),
        'error'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteHistory = async (historyId: string) => {
    if (!confirm(language === 'ja' ? 'この記録を削除しますか？' : '이 기록을 삭제하시겠습니까?')) {
      return
    }

    try {
      await api.delete(`/sales-tracking/history/${historyId}`)
      showToast(language === 'ja' ? '削除しました' : '삭제 완료', 'success')
      await loadHistory()
      onUpdate?.()
    } catch (error) {
      console.error('Failed to delete history:', error)
      showToast(language === 'ja' ? '削除に失敗しました' : '삭제 실패', 'error')
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

  const canEdit = record?.manager_name === user?.name || user?.role === 'admin'

  if (!record) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-[480px] bg-white shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {record.company_name || record.account_id || (language === 'ja' ? '詳細' : '상세')}
            </h2>
            <p className="text-sm text-gray-500">{record.manager_name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Customer Info */}
        <div className="px-6 py-4 border-b bg-white">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-500">{language === 'ja' ? '業種' : '업종'}:</span>
              <span className="ml-2 text-gray-900">{record.industry || '-'}</span>
            </div>
            <div>
              <span className="text-gray-500">{language === 'ja' ? '方法' : '방법'}:</span>
              <span className="ml-2 text-gray-900">{record.contact_method || '-'}</span>
            </div>
            <div>
              <span className="text-gray-500">{language === 'ja' ? '電話' : '전화'}:</span>
              <span className="ml-2 text-gray-900">{record.phone || '-'}</span>
            </div>
            <div>
              <span className="text-gray-500">{language === 'ja' ? 'ステータス' : '상태'}:</span>
              <span className="ml-2 text-gray-900">{record.status}</span>
            </div>
            {record.account_id && (
              <div className="col-span-2">
                <span className="text-gray-500">{language === 'ja' ? 'アカウント' : '계정'}:</span>
                <span className="ml-2 text-gray-900">{record.account_id}</span>
              </div>
            )}
            {record.memo && (
              <div className="col-span-2">
                <span className="text-gray-500">{language === 'ja' ? 'メモ' : '메모'}:</span>
                <p className="mt-1 text-gray-900 text-xs bg-gray-50 p-2 rounded">{record.memo}</p>
              </div>
            )}
          </div>
        </div>

        {/* History Timeline */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <h3 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {language === 'ja' ? '連絡履歴' : '연락 히스토리'}
            <span className="text-gray-400 text-xs">({history.length})</span>
          </h3>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>{language === 'ja' ? '連絡履歴がありません' : '연락 기록이 없습니다'}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((entry) => {
                // 차수별 색상 테마
                const roundColors = [
                  { dot: 'bg-blue-500', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-800', card: 'bg-blue-50' },
                  { dot: 'bg-emerald-500', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-800', card: 'bg-emerald-50' },
                  { dot: 'bg-amber-500', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-800', card: 'bg-amber-50' },
                  { dot: 'bg-purple-500', border: 'border-purple-200', badge: 'bg-purple-100 text-purple-800', card: 'bg-purple-50' },
                  { dot: 'bg-rose-500', border: 'border-rose-200', badge: 'bg-rose-100 text-rose-800', card: 'bg-rose-50' },
                ]
                const colorTheme = roundColors[(entry.round - 1) % roundColors.length]
                
                return (
                  <div 
                    key={entry.id} 
                    className={`relative pl-6 pb-4 border-l-2 ${colorTheme.border} last:border-l-0`}
                  >
                    {/* Timeline dot */}
                    <div className={`absolute left-[-9px] top-0 w-5 h-5 ${colorTheme.dot} rounded-full border-2 border-white shadow-md flex items-center justify-center`}>
                      <span className="text-[9px] text-white font-bold">{entry.round}</span>
                    </div>
                    
                    <div className={`${colorTheme.card} rounded-lg p-3 ml-2 shadow-sm`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${colorTheme.badge}`}>
                            <Hash className="h-3 w-3 mr-1" />
                            {entry.round}{language === 'ja' ? '次' : '차'}
                          </span>
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {entry.user_name}
                          </span>
                        </div>
                        {canEdit && (
                          <button
                            onClick={() => handleDeleteHistory(entry.id)}
                            className="text-xs text-red-400 hover:text-red-600 transition-colors"
                          >
                            {language === 'ja' ? '削除' : '삭제'}
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                        {entry.content || (language === 'ja' ? '(内容なし)' : '(내용 없음)')}
                      </p>
                      <p className="text-xs text-gray-400 mt-2">
                        {formatDate(entry.contact_date)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Add New History - Fixed at bottom */}
        {canEdit && (
          <div className="border-t bg-gray-50 px-6 py-4">
            <div className="flex items-center gap-2 mb-3">
              <Plus className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">
                {language === 'ja' ? `${nextRound}次連絡を追加` : `${nextRound}차 연락 추가`}
              </span>
            </div>
            <textarea
              value={newContent}
              onChange={(e) => {
                setNewContent(e.target.value)
                // 자동 높이 조절
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px'
              }}
              placeholder={language === 'ja' ? '送信した内容を入力...' : '보낸 내용을 입력...'}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[80px] max-h-[200px] overflow-y-auto"
              style={{ height: 'auto' }}
            />
            <Button
              onClick={handleAddHistory}
              disabled={isSubmitting || !newContent.trim()}
              className="w-full mt-2 flex items-center justify-center gap-2"
            >
              <Send className="h-4 w-4" />
              {isSubmitting 
                ? (language === 'ja' ? '保存中...' : '저장 중...') 
                : (language === 'ja' ? '記録する' : '기록하기')}
            </Button>
          </div>
        )}
      </div>
    </>
  )
}
