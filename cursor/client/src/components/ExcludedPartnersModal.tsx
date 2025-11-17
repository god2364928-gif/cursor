import { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { X, Trash2, Plus } from 'lucide-react'
import api from '../lib/api'

interface ExcludedPartner {
  id: number
  partner_name: string
  created_by: string
  created_at: string
}

interface ExcludedPartnersModalProps {
  isOpen: boolean
  onClose: () => void
  onUpdate: () => void
  language: string
}

export default function ExcludedPartnersModal({
  isOpen,
  onClose,
  onUpdate,
  language
}: ExcludedPartnersModalProps) {
  const [excludedPartners, setExcludedPartners] = useState<ExcludedPartner[]>([])
  const [newPartnerName, setNewPartnerName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (isOpen) {
      loadExcludedPartners()
    }
  }, [isOpen])

  const loadExcludedPartners = async () => {
    setIsLoading(true)
    try {
      const response = await api.get('/excluded-partners')
      setExcludedPartners(response.data)
    } catch (error) {
      console.error('Error loading excluded partners:', error)
      setError(language === 'ja' ? '除外取引先の読み込みに失敗しました' : '제외 거래처 불러오기 실패')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAdd = async () => {
    if (!newPartnerName.trim()) {
      setError(language === 'ja' ? '取引先名を入力してください' : '거래처명을 입력하세요')
      return
    }

    try {
      await api.post('/excluded-partners', { partner_name: newPartnerName.trim() })
      setSuccess(language === 'ja' ? '除外取引先を追加しました' : '제외 거래처를 추가했습니다')
      setNewPartnerName('')
      await loadExcludedPartners()
      onUpdate() // 부모 컴포넌트에 변경 알림
      setTimeout(() => setSuccess(''), 3000)
    } catch (error: any) {
      if (error.response?.status === 409) {
        setError(language === 'ja' ? 'この取引先は既に除外されています' : '이미 제외된 거래처입니다')
      } else {
        setError(error.response?.data?.message || (language === 'ja' ? '追加に失敗しました' : '추가 실패'))
      }
      setTimeout(() => setError(''), 3000)
    }
  }

  const handleDelete = async (id: number, partnerName: string) => {
    if (!confirm(language === 'ja' 
      ? `「${partnerName}」を除外リストから削除しますか？` 
      : `「${partnerName}」을(를) 제외 목록에서 삭제하시겠습니까?`)) {
      return
    }

    try {
      await api.delete(`/excluded-partners/${id}`)
      setSuccess(language === 'ja' ? '除外取引先を削除しました' : '제외 거래처를 삭제했습니다')
      await loadExcludedPartners()
      onUpdate() // 부모 컴포넌트에 변경 알림
      setTimeout(() => setSuccess(''), 3000)
    } catch (error: any) {
      setError(error.response?.data?.message || (language === 'ja' ? '削除に失敗しました' : '삭제 실패'))
      setTimeout(() => setError(''), 3000)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold">
            {language === 'ja' ? '除外取引先管理' : '제외 거래처 관리'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(80vh-200px)]">
          {/* 에러/성공 메시지 */}
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded mb-4">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 text-green-600 p-3 rounded mb-4">
              {success}
            </div>
          )}

          {/* 새 거래처 추가 */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              {language === 'ja' ? '新しい除外取引先を追加' : '새 제외 거래처 추가'}
            </label>
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-3">
              <p className="text-xs text-yellow-800">
                ⚠️ {language === 'ja' 
                  ? '文字種に注意: ㈱(合字)と(株)、２(全角)と2(半角)は別の文字です' 
                  : '문자 형식 주의: ㈱(유니코드 합자)와 (株), ２(전각)와 2(반각)는 다른 문자입니다'}
              </p>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newPartnerName}
                onChange={(e) => setNewPartnerName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
                className="flex-1 border rounded px-3 py-2"
                placeholder={language === 'ja' ? '取引先名を入力...' : '거래처명 입력...'}
              />
              <Button onClick={handleAdd} className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                {language === 'ja' ? '追加' : '추가'}
              </Button>
            </div>
          </div>

          {/* 제외 거래처 목록 */}
          <div>
            <h3 className="font-medium mb-3">
              {language === 'ja' ? '除外取引先リスト' : '제외 거래처 목록'} ({excludedPartners.length})
            </h3>
            {isLoading ? (
              <div className="text-center py-4 text-gray-500">
                {language === 'ja' ? '読み込み中...' : '로딩 중...'}
              </div>
            ) : excludedPartners.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                {language === 'ja' ? '除外取引先がありません' : '제외된 거래처가 없습니다'}
              </div>
            ) : (
              <div className="space-y-2">
                {excludedPartners.map((partner) => (
                  <div
                    key={partner.id}
                    className="flex items-center justify-between p-3 border rounded hover:bg-gray-50"
                  >
                    <div>
                      <div className="font-medium">{partner.partner_name}</div>
                      <div className="text-xs text-gray-500">
                        {language === 'ja' ? '追加者' : '추가자'}: {partner.created_by || 'system'}
                      </div>
                    </div>
                    <Button
                      onClick={() => handleDelete(partner.id, partner.partner_name)}
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t">
          <Button onClick={onClose} variant="outline">
            {language === 'ja' ? '閉じる' : '닫기'}
          </Button>
        </div>
      </div>
    </div>
  )
}

