import { useState, useEffect } from 'react'
import api, { invoiceAPI } from '../lib/api'
import { FreeeInvoice } from '../types'
import { Button } from '../components/ui/button'
import { useI18nStore } from '../i18n'
import { FileText, Plus, Download, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { DatePickerInput } from '../components/ui/date-picker-input'

// 청구서 취소 확인 모달 컴포넌트
function CancelConfirmModal({
  invoice,
  onClose,
  onConfirm,
  language,
}: {
  invoice: FreeeInvoice | null
  onClose: () => void
  onConfirm: () => void
  language: string
}) {
  if (!invoice) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4 text-red-600">
          {language === 'ja' ? '請求書のキャンセル' : '청구서 취소'}
        </h2>

        <div className="mb-6">
          <p className="mb-4">
            {language === 'ja' 
              ? 'この請求書をキャンセルしますか？' 
              : '이 청구서를 취소하시겠습니까?'}
          </p>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-4">
            <p className="text-sm text-yellow-800">
              {language === 'ja' 
                ? '⚠️ キャンセルした請求書は元に戻せません。' 
                : '⚠️ 취소한 청구서는 복구할 수 없습니다.'}
            </p>
          </div>

          <div className="bg-gray-50 p-3 rounded text-sm">
            <div className="mb-2">
              <span className="text-gray-600">{language === 'ja' ? '取引先' : '거래처'}:</span>
              <span className="ml-2 font-medium">{invoice.partner_name}</span>
            </div>
            <div>
              <span className="text-gray-600">{language === 'ja' ? '金額' : '금액'}:</span>
              <span className="ml-2 font-medium">¥{invoice.total_amount.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onClose}>
            {language === 'ja' ? 'いいえ' : '아니오'}
          </Button>
          <Button 
            type="button" 
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700"
          >
            {language === 'ja' ? 'はい、キャンセルする' : '예, 취소합니다'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// 영수증 발급 모달 컴포넌트
function ReceiptModal({ 
  invoice, 
  onClose, 
  language 
}: { 
  invoice: FreeeInvoice | null
  onClose: () => void
  language: string
}) {
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  if (!invoice) return null

  const formatDate = (dateString: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}/${month}/${day}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')
    setSuccess('')

    try {
      const response = await api.post('/receipts/from-invoice', {
        invoice_id: invoice.id,
        issue_date: issueDate,
      })

      setSuccess(language === 'ja' ? '領収書を発行しました' : '영수증이 발급되었습니다')
      
      // 2초 후 모달 닫기
      setTimeout(() => {
        onClose()
        window.location.reload() // 목록 새로고침
      }, 2000)
    } catch (error: any) {
      console.error('Error creating receipt:', error)
      console.error('Error details:', error.response?.data)
      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Error creating receipt'
      setError(errorMsg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4">
          {language === 'ja' ? '領収書発行' : '영수증 발급'}
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-green-700 text-sm">
            {success}
          </div>
        )}

        {/* 청구서 정보 미리보기 */}
        <div className="bg-gray-50 p-4 rounded mb-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-600">{language === 'ja' ? '取引先' : '거래처'}:</span>
              <span className="ml-2 font-medium">{invoice.partner_name}</span>
            </div>
            <div>
              <span className="text-gray-600">{language === 'ja' ? '請求日' : '청구일'}:</span>
              <span className="ml-2">{formatDate(invoice.invoice_date)}</span>
            </div>
            <div>
              <span className="text-gray-600">{language === 'ja' ? '金額' : '금액'}:</span>
              <span className="ml-2 font-medium">¥{invoice.total_amount.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-gray-600">{language === 'ja' ? '税額' : '세액'}:</span>
              <span className="ml-2">¥{invoice.tax_amount.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* 영수일 입력 */}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              {language === 'ja' ? '領収日' : '영수일'} *
            </label>
            <DatePickerInput
              value={issueDate}
              onChange={setIssueDate}
              className="w-full"
              isClearable={false}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              {language === 'ja' ? 'キャンセル' : '취소'}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting 
                ? (language === 'ja' ? '発行中...' : '발급 중...')
                : (language === 'ja' ? '領収書を発行' : '영수증 발급')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function InvoicePage() {
  const navigate = useNavigate()
  const { language } = useI18nStore()
  const { user } = useAuthStore()
  const [invoices, setInvoices] = useState<FreeeInvoice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedInvoiceForReceipt, setSelectedInvoiceForReceipt] = useState<FreeeInvoice | null>(null)
  const [selectedInvoiceForCancel, setSelectedInvoiceForCancel] = useState<FreeeInvoice | null>(null)

  useEffect(() => {
    loadInvoices()
  }, [])

  const loadInvoices = async () => {
    try {
      setIsLoading(true)
      const response = await invoiceAPI.getInvoiceList()
      setInvoices(response.data)
    } catch (error: any) {
      console.error('Error loading invoices:', error)
      setError(error.response?.data?.error || (language === 'ja' ? '請求書の読み込みに失敗しました' : '청구서 불러오기 실패'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownloadPdf = async (invoice: FreeeInvoice) => {
    try {
      console.log('📥 Downloading PDF for invoice:', invoice.id, invoice.freee_invoice_id)
      const pdfResponse = await invoiceAPI.downloadPdf(invoice.id)
      console.log('✅ PDF response received:', pdfResponse)
      const blob = new Blob([pdfResponse.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      
      // 파일명 생성: {거래처명}_COCOマーケ請求書_{날짜}.pdf
      const dateStr = invoice.invoice_date ? invoice.invoice_date.split('T')[0].replace(/-/g, '') : 'unknown'
      const partnerName = invoice.partner_name || 'unknown'
      const sanitizedName = partnerName.replace(/[\\/:*?"<>|]/g, '_')  // 파일명에 사용 불가능한 문자 제거
      a.download = `${sanitizedName}_COCOマーケ請求書_${dateStr}.pdf`
      
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      console.log('✅ PDF download completed')
    } catch (error: any) {
      console.error('❌ PDF download error:', error)
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      })
      setError(language === 'ja' ? `PDFのダウンロードに失敗しました: ${error.response?.data?.error || error.message}` : `PDF 다운로드 실패: ${error.response?.data?.error || error.message}`)
    }
  }

  const handleDownloadReceiptPdf = async (invoice: FreeeInvoice) => {
    try {
      const response = await api.get(`/receipts/${invoice.receipt_id}/pdf`, {
        responseType: 'blob'
      })

      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      
      // 파일명 생성: {거래처명}_COCOマーケ領収書_{날짜}.pdf
      const dateStr = invoice.invoice_date ? invoice.invoice_date.split('T')[0].replace(/-/g, '') : 'unknown'
      const partnerName = invoice.partner_name || 'unknown'
      const sanitizedName = partnerName.replace(/[\\/:*?"<>|]/g, '_')  // 파일명에 사용 불가능한 문자 제거
      a.download = `${sanitizedName}_COCOマーケ領収書_${dateStr}.pdf`
      
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error: any) {
      console.error('Receipt PDF download error:', error)
      setError(language === 'ja' ? '領収書PDFのダウンロードに失敗しました' : '영수증 PDF 다운로드 실패')
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}/${month}/${day}`
  }

  const formatCurrency = (amount: number) => {
    return `¥${amount.toLocaleString()}`
  }

  const handleCancelInvoice = async () => {
    if (!selectedInvoiceForCancel) return

    try {
      await invoiceAPI.cancelInvoice(selectedInvoiceForCancel.id)
      
      // 목록 새로고침
      await loadInvoices()
      
      setSelectedInvoiceForCancel(null)
      setError('')
    } catch (error: any) {
      console.error('Error cancelling invoice:', error)
      const errorMsg = error.response?.data?.error || (language === 'ja' ? '請求書のキャンセルに失敗しました' : '청구서 취소 실패')
      setError(errorMsg)
      setSelectedInvoiceForCancel(null)
    }
  }

  const canCancelInvoice = (invoice: FreeeInvoice): boolean => {
    // 이미 취소된 경우
    if (invoice.is_cancelled) return false
    // 영수증이 발급된 경우
    if (invoice.receipt_id) return false
    // 발급자가 아닌 경우
    if (invoice.issued_by_user_id !== user?.id) return false
    return true
  }

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
        {/* 헤더 */}
        <div className="p-6 border-b flex justify-between items-center">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6" />
            {language === 'ja' ? '請求書管理' : '청구서 관리'}
          </h1>
          <div className="flex gap-2">
            <Button onClick={() => navigate('/invoices/create')} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              {language === 'ja' ? '請求書発行' : '청구서 발행'}
            </Button>
          </div>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="mx-6 mt-6 bg-red-50 text-red-600 p-3 rounded">
            {error}
          </div>
        )}

        {/* 청구서 목록 */}
        <div className="p-6">
          {invoices.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>{language === 'ja' ? 'まだ請求書が発行されていません' : '아직 발행된 청구서가 없습니다'}</p>
              <p className="text-sm mt-2">{language === 'ja' ? '「請求書発行」ボタンから新しい請求書を作成してください' : '"청구서 발행" 버튼을 눌러 새 청구서를 작성하세요'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">
                      {language === 'ja' ? '請求ID' : '청구 ID'}
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">
                      {language === 'ja' ? '取引先名' : '거래처명'}
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">
                      {language === 'ja' ? '請求日' : '청구일'}
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">
                      {language === 'ja' ? '入金期限' : '입금기한'}
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700">
                      {language === 'ja' ? '金額' : '금액'}
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">
                      {language === 'ja' ? '担当者' : '담당자'}
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">
                      {language === 'ja' ? '発行日' : '발행일'}
                    </th>
                    <th className="text-center py-3 px-4 font-medium text-gray-700">
                      {language === 'ja' ? '状態' : '상태'}
                    </th>
                    <th className="text-center py-3 px-4 font-medium text-gray-700">
                      {language === 'ja' ? '操作' : '작업'}
                    </th>
                    <th className="text-center py-3 px-4 font-medium text-gray-700">
                      {language === 'ja' ? '領収書' : '영수증'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => (
                    <tr 
                      key={invoice.id} 
                      className={`border-b hover:bg-gray-50 ${invoice.is_cancelled ? 'opacity-50 bg-gray-50' : ''}`}
                    >
                      <td className="py-3 px-4">
                        <span className="font-mono text-sm">#{invoice.freee_invoice_id}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium">{invoice.partner_name}</div>
                          {invoice.partner_address && (
                            <div className="text-xs text-gray-500">{invoice.partner_address}</div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {formatDate(invoice.invoice_date)}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {formatDate(invoice.due_date)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="font-medium">{formatCurrency(invoice.total_amount)}</div>
                        <div className="text-xs text-gray-500">
                          {language === 'ja' ? '税' : '세액'}: {formatCurrency(invoice.tax_amount)}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {invoice.issued_by_user_name}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500">
                        {formatDate(invoice.created_at)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {invoice.is_cancelled ? (
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
                            onClick={() => handleDownloadPdf(invoice)}
                            variant="ghost"
                            size="sm"
                            className="flex items-center gap-1"
                          >
                            <Download className="w-4 h-4" />
                            PDF
                          </Button>
                          {canCancelInvoice(invoice) && (
                            <Button
                              onClick={() => setSelectedInvoiceForCancel(invoice)}
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
                      <td className="py-3 px-4 text-center">
                        {invoice.receipt_id ? (
                          <Button
                            onClick={() => handleDownloadReceiptPdf(invoice)}
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-1"
                          >
                            <Download className="w-4 h-4" />
                            {language === 'ja' ? '領収書PDF' : '영수증 PDF'}
                          </Button>
                        ) : invoice.is_cancelled ? (
                          <span className="text-xs text-gray-400">
                            {language === 'ja' ? '発行不可' : '발급 불가'}
                          </span>
                        ) : (
                          <Button
                            onClick={() => setSelectedInvoiceForReceipt(invoice)}
                            variant="outline"
                            size="sm"
                          >
                            {language === 'ja' ? '領収書発行' : '영수증 발급'}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 영수증 발급 모달 */}
      {selectedInvoiceForReceipt && (
        <ReceiptModal
          invoice={selectedInvoiceForReceipt}
          onClose={() => setSelectedInvoiceForReceipt(null)}
          language={language}
        />
      )}

      {/* 청구서 취소 확인 모달 */}
      {selectedInvoiceForCancel && (
        <CancelConfirmModal
          invoice={selectedInvoiceForCancel}
          onClose={() => setSelectedInvoiceForCancel(null)}
          onConfirm={handleCancelInvoice}
          language={language}
        />
      )}
    </div>
  )
}
