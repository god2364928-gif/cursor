import { useState, useEffect } from 'react'
import { invoiceAPI } from '../lib/api'
import { FreeeInvoice } from '../types'
import { Button } from '../components/ui/button'
import { useI18nStore } from '../i18n'
import { FileText, Plus, Download } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('https://cursor-production.up.railway.app/api/receipts/from-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          invoice_id: invoice.id,
          issue_date: issueDate,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to create receipt')
      }

      const data = await response.json()
      setSuccess(language === 'ja' ? '領収書を発行しました' : '영수증이 발급되었습니다')
      
      // 2초 후 모달 닫기
      setTimeout(() => {
        onClose()
        window.location.reload() // 목록 새로고침
      }, 2000)
    } catch (error: any) {
      console.error('Error creating receipt:', error)
      setError(error.message || 'Error creating receipt')
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
              <span className="ml-2">{invoice.invoice_date}</span>
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
            <input
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              className="w-full border rounded px-3 py-2"
              required
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
  const [invoices, setInvoices] = useState<FreeeInvoice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedInvoiceForReceipt, setSelectedInvoiceForReceipt] = useState<FreeeInvoice | null>(null)

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
      const pdfResponse = await invoiceAPI.downloadPdf(invoice.id)
      const blob = new Blob([pdfResponse.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `invoice_${invoice.freee_invoice_id}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('PDF download error:', error)
      setError(language === 'ja' ? 'PDFのダウンロードに失敗しました' : 'PDF 다운로드 실패')
    }
  }

  const handleDownloadReceiptPdf = async (invoice: FreeeInvoice) => {
    try {
      const response = await fetch(`https://cursor-production.up.railway.app/api/receipts/${invoice.receipt_id}/pdf`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to download receipt PDF')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `receipt_${invoice.receipt_id}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Receipt PDF download error:', error)
      setError(language === 'ja' ? '領収書PDFのダウンロードに失敗しました' : '영수증 PDF 다운로드 실패')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(language === 'ja' ? 'ja-JP' : 'ko-KR')
  }

  const formatCurrency = (amount: number) => {
    return `¥${amount.toLocaleString()}`
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
                      {language === 'ja' ? '操作' : '작업'}
                    </th>
                    <th className="text-center py-3 px-4 font-medium text-gray-700">
                      {language === 'ja' ? '領収書' : '영수증'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="border-b hover:bg-gray-50">
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
                      <td className="py-3 px-4">
                        <Button
                          onClick={() => handleDownloadPdf(invoice)}
                          variant="ghost"
                          size="sm"
                          className="flex items-center gap-1"
                        >
                          <Download className="w-4 h-4" />
                          PDF
                        </Button>
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
    </div>
  )
}
