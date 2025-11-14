import { useState, useEffect } from 'react'
import { invoiceAPI } from '../lib/api'
import { FreeeInvoice } from '../types'
import { Button } from '../components/ui/button'
import { useI18nStore } from '../i18n'
import { FileText, Plus, Download } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function InvoicePage() {
  const navigate = useNavigate()
  const { language } = useI18nStore()
  const [invoices, setInvoices] = useState<FreeeInvoice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

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
      const pdfResponse = await invoiceAPI.downloadPdf(invoice.freee_invoice_id, invoice.freee_company_id)
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
            <Button onClick={() => navigate('/receipts/create')} variant="outline" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              {language === 'ja' ? '領収書発行' : '영수증 발급'}
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
