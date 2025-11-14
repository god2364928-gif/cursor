import { X } from 'lucide-react'
import { Button } from './ui/button'
import { InvoiceFormData } from '../types'

interface InvoicePreviewModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  formData: Omit<InvoiceFormData, 'company_id'>
  companyInfo: {
    name: string
    registrationNumber: string
    address: string
    bankInfo: string
  }
  isSubmitting: boolean
  language: 'ja' | 'ko'
}

export default function InvoicePreviewModal({
  isOpen,
  onClose,
  onConfirm,
  formData,
  companyInfo,
  isSubmitting,
  language,
}: InvoicePreviewModalProps) {
  if (!isOpen) return null

  // 소계 계산
  const calculateSubtotal = (item: typeof formData.line_items[0]) => {
    const price = typeof item.unit_price === 'string' ? (item.unit_price === '' ? 0 : Number(item.unit_price)) : item.unit_price
    return price * item.quantity
  }

  // 전체 소계
  const totalSubtotal = formData.line_items.reduce((sum, item) => sum + calculateSubtotal(item), 0)

  // 전체 세액
  const totalTax = formData.line_items.reduce((sum, item) => sum + item.tax, 0)

  // 합계
  const grandTotal = formData.tax_entry_method === 'inclusive' ? totalSubtotal : totalSubtotal + totalTax

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">
            {language === 'ja' ? '請求書プレビュー' : '청구서 미리보기'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* 청구서 미리보기 내용 */}
        <div className="p-8 bg-white">
          {/* 청구서 타이틀 */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold">{language === 'ja' ? '請求書' : '청구서'}</h1>
            <p className="text-sm text-gray-500 mt-2">
              {language === 'ja' ? '（プレビュー）' : '(미리보기)'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-8">
            {/* 좌측: 거래처 정보 */}
            <div>
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-1">
                  {language === 'ja' ? '請求先' : '청구처'}
                </p>
                <p className="text-xl font-bold">
                  {formData.partner_name}
                  {formData.partner_title}
                </p>
              </div>
            </div>

            {/* 우측: 자사 정보 */}
            <div className="text-right">
              <p className="font-bold text-lg">{companyInfo.name}</p>
              <p className="text-xs text-gray-600 whitespace-pre-line mt-2">
                {language === 'ja' ? '登録番号: ' : '등록번호: '}{companyInfo.registrationNumber}
              </p>
              <p className="text-xs text-gray-600 whitespace-pre-line mt-1">
                {companyInfo.address}
              </p>
            </div>
          </div>

          {/* 청구 정보 */}
          <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
            <div>
              <span className="text-gray-600">
                {language === 'ja' ? '請求日: ' : '청구일: '}
              </span>
              <span className="font-medium">{formData.invoice_date}</span>
            </div>
            <div>
              <span className="text-gray-600">
                {language === 'ja' ? '入金期限: ' : '입금기한: '}
              </span>
              <span className="font-medium">{formData.due_date}</span>
            </div>
          </div>

          {/* 건명 */}
          <div className="mb-6">
            <p className="text-sm text-gray-600 mb-1">
              {language === 'ja' ? '件名' : '건명'}
            </p>
            <p className="font-medium text-lg">{formData.invoice_title}</p>
          </div>

          {/* 품목 테이블 */}
          <div className="border rounded-lg overflow-hidden mb-6">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-700">
                    {language === 'ja' ? '品目' : '품목'}
                  </th>
                  <th className="px-4 py-2 text-right font-medium text-gray-700">
                    {language === 'ja' ? '数量' : '수량'}
                  </th>
                  <th className="px-4 py-2 text-right font-medium text-gray-700">
                    {language === 'ja' ? '単価' : '단가'}
                  </th>
                  <th className="px-4 py-2 text-center font-medium text-gray-700">
                    {language === 'ja' ? '税率' : '세율'}
                  </th>
                  <th className="px-4 py-2 text-right font-medium text-gray-700">
                    {language === 'ja' ? '小計' : '소계'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {formData.line_items.map((item, index) => (
                  <tr key={index} className="border-t">
                    <td className="px-4 py-3">{item.name}</td>
                    <td className="px-4 py-3 text-right">{item.quantity}</td>
                    <td className="px-4 py-3 text-right">
                      ¥{typeof item.unit_price === 'string' 
                        ? (item.unit_price === '' ? '0' : Number(item.unit_price).toLocaleString())
                        : item.unit_price.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center">{item.tax_rate}%</td>
                    <td className="px-4 py-3 text-right">
                      ¥{calculateSubtotal(item).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 합계 */}
          <div className="flex justify-end mb-6">
            <div className="w-80 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{language === 'ja' ? '小計' : '소계'}:</span>
                <span className="font-medium">¥{totalSubtotal.toLocaleString()}</span>
              </div>
              {formData.tax_entry_method === 'exclusive' && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{language === 'ja' ? '消費税' : '소비세'}:</span>
                  <span className="font-medium">¥{totalTax.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>
                  {formData.tax_entry_method === 'inclusive'
                    ? (language === 'ja' ? '合計（税込）' : '합계(세금포함)')
                    : (language === 'ja' ? '合計' : '합계')}:
                </span>
                <span>¥{grandTotal.toLocaleString()}</span>
              </div>
              {formData.tax_entry_method === 'inclusive' && (
                <p className="text-xs text-gray-500 mt-1">
                  {language === 'ja'
                    ? '※ 消費税が含まれています'
                    : '※ 소비세가 포함되어 있습니다'}
                </p>
              )}
            </div>
          </div>

          {/* 세금 표시 방법 */}
          <div className="mb-4 text-sm">
            <span className="text-gray-600">
              {language === 'ja' ? '税の表示: ' : '세금 표시: '}
            </span>
            <span className="font-medium">
              {formData.tax_entry_method === 'inclusive'
                ? (language === 'ja' ? '内税' : '내세')
                : (language === 'ja' ? '外税' : '외세')}
            </span>
          </div>

          {/* 송금처 정보 */}
          <div className="border-t pt-4 mb-4">
            <p className="text-sm font-medium text-gray-700 mb-2">
              {language === 'ja' ? '振込先' : '송금처'}
            </p>
            <p className="text-sm whitespace-pre-line text-gray-600">
              {formData.payment_bank_info}
            </p>
          </div>

          {/* 비고 */}
          {formData.memo && (
            <div className="border-t pt-4">
              <p className="text-sm font-medium text-gray-700 mb-2">
                {language === 'ja' ? '備考' : '비고'}
              </p>
              <p className="text-sm whitespace-pre-line text-gray-600">
                {formData.memo}
              </p>
            </div>
          )}
        </div>

        {/* 푸터 버튼 */}
        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t">
          <Button onClick={onClose} variant="ghost" disabled={isSubmitting}>
            {language === 'ja' ? '修正' : '수정'}
          </Button>
          <Button onClick={onConfirm} disabled={isSubmitting}>
            {isSubmitting
              ? (language === 'ja' ? '発行中...' : '발행 중...')
              : (language === 'ja' ? '発行してPDFダウンロード' : '발행 및 PDF 다운로드')}
          </Button>
        </div>
      </div>
    </div>
  )
}

