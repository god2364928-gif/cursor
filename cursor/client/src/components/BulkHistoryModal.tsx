import { useState } from 'react'
import { X, Send, Hash, Users } from 'lucide-react'
import { Button } from './ui/button'
import api from '../lib/api'
import { useToast } from './ui/toast'
import { useI18nStore } from '../i18n'

interface Props {
  selectedIds: string[]
  onClose: () => void
  onSuccess: () => void
}

export default function BulkHistoryModal({ selectedIds, onClose, onSuccess }: Props) {
  const { showToast } = useToast()
  const { language } = useI18nStore()
  const [round, setRound] = useState(1)
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (round < 1) {
      showToast(language === 'ja' ? '次数を入力してください' : '차수를 입력해주세요', 'error')
      return
    }

    if (!content.trim()) {
      showToast(language === 'ja' ? '内容を入力してください' : '내용을 입력해주세요', 'error')
      return
    }

    try {
      setIsSubmitting(true)
      const response = await api.post('/sales-tracking/bulk-history', {
        ids: selectedIds,
        round,
        content: content.trim()
      })
      
      showToast(
        response.data.message || (language === 'ja' 
          ? `${selectedIds.length}件の連絡記録を追加しました` 
          : `${selectedIds.length}건의 연락 기록을 추가했습니다`),
        'success'
      )
      
      onSuccess()
      onClose()
    } catch (error: any) {
      console.error('Bulk history add failed:', error)
      showToast(
        error.response?.data?.message || (language === 'ja' ? '記録に失敗しました' : '기록 실패'),
        'error'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] bg-white rounded-xl shadow-2xl z-50">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {language === 'ja' ? '一括連絡記録' : '일괄 연락 기록'}
              </h2>
              <p className="text-sm text-gray-500">
                {language === 'ja' 
                  ? `${selectedIds.length}件の顧客に同じ記録を追加` 
                  : `${selectedIds.length}명의 고객에게 동일 기록 추가`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Round Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Hash className="h-4 w-4" />
              {language === 'ja' ? '連絡次数' : '연락 차수'}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                value={round}
                onChange={(e) => setRound(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-center text-lg font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <span className="text-gray-600">
                {language === 'ja' ? '次' : '차'}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {language === 'ja' 
                ? '1次、2次、3次... など連絡の回数' 
                : '1차, 2차, 3차... 등 연락 횟수'}
            </p>
          </div>

          {/* Content Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {language === 'ja' ? '送信内容' : '보낸 내용'}
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={language === 'ja' 
                ? '送信したメッセージ内容を入力...\n例: 初回提案メッセージ送信' 
                : '보낸 메시지 내용을 입력...\n예: 첫 제안 메시지 발송'}
              className="w-full px-3 py-3 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={5}
            />
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-700">
              {language === 'ja' 
                ? '📌 記録日時は現在時刻で自動設定されます' 
                : '📌 기록 일시는 현재 시각으로 자동 설정됩니다'}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-xl">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            {language === 'ja' ? 'キャンセル' : '취소'}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !content.trim()}
            className="flex items-center gap-2"
          >
            <Send className="h-4 w-4" />
            {isSubmitting 
              ? (language === 'ja' ? '保存中...' : '저장 중...') 
              : (language === 'ja' 
                  ? `${selectedIds.length}件に記録` 
                  : `${selectedIds.length}건 기록`)}
          </Button>
        </div>
      </div>
    </>
  )
}
