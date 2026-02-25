import { X } from 'lucide-react'
import { Button } from './ui/button'
import { QuoteFormData } from '../types'
import { useEffect } from 'react'

interface QuotePreviewModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  formData: QuoteFormData
  companyInfo: {
    name: string
    registrationNumber: string
    address: string
    tel: string
  }
  isSubmitting: boolean
  language: 'ja' | 'ko'
}

export default function QuotePreviewModal({
  isOpen,
  onClose,
  onConfirm,
  formData,
  companyInfo,
  isSubmitting,
  language,
}: QuotePreviewModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    if (isOpen) {
      window.addEventListener('keydown', handleEscape)
    }
    return () => {
      window.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const calculateSubtotal = (item: typeof formData.line_items[0]) => {
    const price = typeof item.unit_price === 'string' ? (item.unit_price === '' ? 0 : Number(item.unit_price)) : item.unit_price
    return price * item.quantity
  }

  const totalSubtotal = formData.line_items.reduce((sum, item) => sum + calculateSubtotal(item), 0)
  const totalTax = formData.line_items.reduce((sum, item) => sum + item.tax, 0)
  const grandTotal = formData.tax_entry_method === 'inclusive' ? totalSubtotal : totalSubtotal + totalTax

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">
            {language === 'ja' ? '見積書プレビュー' : '견적서 미리보기'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-8 bg-white">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold">{language === 'ja' ? '見積書' : '견적서'}</h1>
            <p className="text-sm text-gray-500 mt-2">
              {language === 'ja' ? '（プレビュー）' : '(미리보기)'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-6">
            <div>
              <p className="text-sm text-gray-600 mb-1">
                {language === 'ja' ? '宛先' : '수신'}
              </p>
              <p className="text-xl font-bold border-b border-black pb-1">
                {formData.partner_name}{formData.partner_title}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500 mb-2">
                {language === 'ja' ? '発行日: ' : '발행일: '}{formData.quote_date}
              </p>
              <p className="font-bold text-lg">{companyInfo.name}</p>
              <p className="text-xs text-gray-600 mt-1">
                {language === 'ja' ? '登録番号: ' : '등록번호: '}{companyInfo.registrationNumber}
              </p>
              <p className="text-xs text-gray-600 whitespace-pre-line mt-1">{companyInfo.address}</p>
              <p className="text-xs text-gray-600 mt-1">TEL: {formData.contact_tel}</p>
              <p className="text-xs text-gray-600 mt-1">
                {language === 'ja' ? '担当: ' : '담당: '}{formData.contact_person}
              </p>
            </div>
          </div>

          <p className="text-sm mb-4">
            {language === 'ja' ? '下記の通り、お見積申し上げます。' : '아래와 같이 견적 드립니다.'}
          </p>

          <div className="border-2 border-black p-3 mb-6 flex justify-between items-center">
            <span className="font-bold">
              {language === 'ja' ? '金額' : '금액'}
            </span>
            <span className="text-2xl font-bold">
              ¥{grandTotal.toLocaleString()}
              <span className="text-sm font-normal ml-1">
                {language === 'ja' ? '（税込）' : '(세금포함)'}
              </span>
            </span>
          </div>

          <div className="border rounded-lg overflow-hidden mb-6">
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b">
                  <td className="px-4 py-2 bg-gray-50 font-medium w-24">
                    {language === 'ja' ? '件名' : '건명'}
                  </td>
                  <td className="px-4 py-2">{formData.quote_title}</td>
                  <td className="px-4 py-2 bg-gray-50 font-medium w-24">
                    {language === 'ja' ? '納期' : '납기'}
                  </td>
                  <td className="px-4 py-2">{formData.delivery_date || '-'}</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 bg-gray-50 font-medium">
                    {language === 'ja' ? '見積期限' : '견적기한'}
                  </td>
                  <td className="px-4 py-2" colSpan={3}>{formData.quote_expiry || '発行日より2週間'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="border rounded-lg overflow-hidden mb-6">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-center font-medium text-gray-700 w-12">No.</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-700">
                    {language === 'ja' ? '項目' : '항목'}
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
                    {language === 'ja' ? '金額' : '금액'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {formData.line_items.map((item, index) => (
                  <tr key={index} className="border-t">
                    <td className="px-4 py-3 text-center">{index + 1}</td>
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
                    : (language === 'ja' ? '税込合計' : '세금포함 합계')}:
                </span>
                <span>¥{grandTotal.toLocaleString()}</span>
              </div>
              {formData.tax_entry_method === 'inclusive' && (
                <p className="text-xs text-gray-500 mt-1">
                  {language === 'ja' ? '※ 消費税が含まれています' : '※ 소비세가 포함되어 있습니다'}
                </p>
              )}
            </div>
          </div>

          {formData.memo && (
            <div className="border-t pt-4">
              <p className="text-sm font-medium text-gray-700 mb-2">
                {language === 'ja' ? '備考' : '비고'}
              </p>
              <p className="text-sm whitespace-pre-line text-gray-600">{formData.memo}</p>
            </div>
          )}
        </div>

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
