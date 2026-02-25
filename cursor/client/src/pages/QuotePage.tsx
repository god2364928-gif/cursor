import { useState, useEffect } from 'react'
import { quoteAPI } from '../lib/api'
import { Quote } from '../types'
import { Button } from '../components/ui/button'
import { useI18nStore } from '../i18n'
import { FileText, Plus, Download, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

function CancelConfirmModal({
  quote,
  onClose,
  onConfirm,
  language,
}: {
  quote: Quote | null
  onClose: () => void
  onConfirm: () => void
  language: string
}) {
  if (!quote) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4 text-red-600">
          {language === 'ja' ? '見積書のキャンセル' : '견적서 취소'}
        </h2>
        <div className="mb-6">
          <p className="mb-4">
            {language === 'ja'
              ? 'この見積書をキャンセルしますか？'
              : '이 견적서를 취소하시겠습니까?'}
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-4">
            <p className="text-sm text-yellow-800">
              {language === 'ja'
                ? '⚠️ キャンセルした見積書は元に戻せません。'
                : '⚠️ 취소한 견적서는 복구할 수 없습니다.'}
            </p>
          </div>
          <div className="bg-gray-50 p-3 rounded text-sm">
            <div className="mb-2">
              <span className="text-gray-600">{language === 'ja' ? '取引先' : '거래처'}:</span>
              <span className="ml-2 font-medium">{quote.partner_name}</span>
            </div>
            <div>
              <span className="text-gray-600">{language === 'ja' ? '金額' : '금액'}:</span>
              <span className="ml-2 font-medium">¥{quote.total_amount.toLocaleString()}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onClose}>
            {language === 'ja' ? 'いいえ' : '아니오'}
          </Button>
          <Button type="button" onClick={onConfirm} className="bg-red-600 hover:bg-red-700">
            {language === 'ja' ? 'はい、キャンセルする' : '예, 취소합니다'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function QuotePage() {
  const navigate = useNavigate()
  const { language } = useI18nStore()
  const { user } = useAuthStore()
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedQuoteForCancel, setSelectedQuoteForCancel] = useState<Quote | null>(null)

  useEffect(() => {
    loadQuotes()
  }, [])

  const loadQuotes = async () => {
    try {
      setIsLoading(true)
      const response = await quoteAPI.getQuoteList()
      setQuotes(response.data)
    } catch (error: any) {
      console.error('Error loading quotes:', error)
      setError(error.response?.data?.error || (language === 'ja' ? '見積書の読み込みに失敗しました' : '견적서 불러오기 실패'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownloadPdf = async (quote: Quote) => {
    try {
      const pdfResponse = await quoteAPI.downloadPdf(quote.id)
      const blob = new Blob([pdfResponse.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const dateStr = quote.quote_date ? quote.quote_date.split('T')[0].replace(/-/g, '') : 'unknown'
      const sanitizedName = quote.partner_name.replace(/[\\/:*?"<>|]/g, '_')
      a.download = `${sanitizedName}_COCOマーケ見積書_${dateStr}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error: any) {
      console.error('PDF download error:', error)
      setError(language === 'ja' ? 'PDFのダウンロードに失敗しました' : 'PDF 다운로드 실패')
    }
  }

  const handleCancelQuote = async () => {
    if (!selectedQuoteForCancel) return
    try {
      await quoteAPI.cancelQuote(selectedQuoteForCancel.id)
      await loadQuotes()
      setSelectedQuoteForCancel(null)
      setError('')
    } catch (error: any) {
      console.error('Error cancelling quote:', error)
      setError(error.response?.data?.error || (language === 'ja' ? '見積書のキャンセルに失敗しました' : '견적서 취소 실패'))
      setSelectedQuoteForCancel(null)
    }
  }

  const canCancelQuote = (quote: Quote): boolean => {
    if (quote.is_cancelled) return false
    if (quote.issued_by_user_id !== user?.id) return false
    return true
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}/${month}/${day}`
  }

  const formatCurrency = (amount: number) => `¥${amount.toLocaleString()}`

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center">{language === 'ja' ? '読み込み中...' : '로딩 중...'}</div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b flex justify-between items-center">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6" />
            {language === 'ja' ? '見積書管理' : '견적서 관리'}
          </h1>
          <div className="flex gap-2">
            <Button onClick={() => navigate('/quotes/create')} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              {language === 'ja' ? '見積書作成' : '견적서 작성'}
            </Button>
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-6 bg-red-50 text-red-600 p-3 rounded">{error}</div>
        )}

        <div className="p-6">
          {quotes.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>{language === 'ja' ? 'まだ見積書が作成されていません' : '아직 작성된 견적서가 없습니다'}</p>
              <p className="text-sm mt-2">
                {language === 'ja'
                  ? '「見積書作成」ボタンから新しい見積書を作成してください'
                  : '"견적서 작성" 버튼을 눌러 새 견적서를 작성하세요'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">
                      {language === 'ja' ? '見積番号' : '견적번호'}
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">
                      {language === 'ja' ? '取引先名' : '거래처명'}
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">
                      {language === 'ja' ? '見積日' : '견적일'}
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">
                      {language === 'ja' ? '見積期限' : '견적기한'}
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700">
                      {language === 'ja' ? '金額' : '금액'}
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">
                      {language === 'ja' ? '担当者' : '담당자'}
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">
                      {language === 'ja' ? '作成日' : '작성일'}
                    </th>
                    <th className="text-center py-3 px-4 font-medium text-gray-700">
                      {language === 'ja' ? '状態' : '상태'}
                    </th>
                    <th className="text-center py-3 px-4 font-medium text-gray-700">
                      {language === 'ja' ? '操作' : '작업'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {quotes.map((quote) => (
                    <tr
                      key={quote.id}
                      className={`border-b hover:bg-gray-50 ${quote.is_cancelled ? 'opacity-50 bg-gray-50' : ''}`}
                    >
                      <td className="py-3 px-4">
                        <span className="font-mono text-sm">{quote.quote_number}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium">{quote.partner_name}</div>
                      </td>
                      <td className="py-3 px-4 text-sm">{formatDate(quote.quote_date)}</td>
                      <td className="py-3 px-4 text-sm">{quote.quote_expiry || '-'}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="font-medium">{formatCurrency(quote.total_amount)}</div>
                        <div className="text-xs text-gray-500">
                          {language === 'ja' ? '税' : '세액'}: {formatCurrency(quote.tax_amount)}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm">{quote.issued_by_user_name}</td>
                      <td className="py-3 px-4 text-sm text-gray-500">{formatDate(quote.created_at)}</td>
                      <td className="py-3 px-4 text-center">
                        {quote.is_cancelled ? (
                          <div className="inline-flex items-center px-2 py-1 rounded-full bg-red-100 text-red-800 text-xs font-medium">
                            {language === 'ja' ? 'キャンセル済' : '취소됨'}
                          </div>
                        ) : (
                          <div className="inline-flex items-center px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs font-medium">
                            {language === 'ja' ? '有効' : '유효'}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 justify-center">
                          <Button
                            onClick={() => handleDownloadPdf(quote)}
                            variant="ghost"
                            size="sm"
                            className="flex items-center gap-1"
                          >
                            <Download className="w-4 h-4" />
                            PDF
                          </Button>
                          {canCancelQuote(quote) && (
                            <Button
                              onClick={() => setSelectedQuoteForCancel(quote)}
                              variant="ghost"
                              size="sm"
                              className="flex items-center gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <X className="w-4 h-4" />
                              {language === 'ja' ? 'キャンセル' : '취소'}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {selectedQuoteForCancel && (
        <CancelConfirmModal
          quote={selectedQuoteForCancel}
          onClose={() => setSelectedQuoteForCancel(null)}
          onConfirm={handleCancelQuote}
          language={language}
        />
      )}
    </div>
  )
}
