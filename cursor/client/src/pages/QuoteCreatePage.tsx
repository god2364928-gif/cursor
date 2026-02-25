import { useState } from 'react'
import { quoteAPI } from '../lib/api'
import { QuoteFormData, QuoteLineItem } from '../types'
import { Button } from '../components/ui/button'
import { useI18nStore } from '../i18n'
import { Plus, Trash2, FileText, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import QuotePreviewModal from '../components/QuotePreviewModal'
import { useAuthStore } from '../store/authStore'
import { DatePickerInput } from '../components/ui/date-picker-input'
import { getLocalToday } from '../utils/dateUtils'

export default function QuoteCreatePage() {
  const navigate = useNavigate()
  const { language } = useI18nStore()
  const user = useAuthStore((state) => state.user)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPreview, setShowPreview] = useState(false)

  const companyInfo = {
    name: '株式会社ホットセラー',
    registrationNumber: 'T5013301050765',
    address: '〒104-0053\n東京都中央区晴海一丁目8番10号\n晴海アイランドトリトンスクエア\nオフィスタワーX棟8階',
    tel: '080-6464-1138',
  }

  const [formData, setFormData] = useState<QuoteFormData>({
    partner_name: '',
    partner_title: '御中',
    quote_title: 'COCOマーケ利用料',
    quote_date: getLocalToday(),
    delivery_date: '',
    quote_expiry: '発行日より2週間',
    tax_entry_method: 'exclusive',
    line_items: [
      { name: '', quantity: 1, unit_price: '', tax: 0, tax_rate: 10 },
    ],
    memo: '',
    contact_tel: '',
    contact_person: user?.name || '',
  })

  const calculateTax = (unitPrice: number, quantity: number, taxRate: number, isInclusive: boolean) => {
    const subtotal = unitPrice * quantity
    if (isInclusive) {
      return Math.floor(subtotal * taxRate / (100 + taxRate))
    } else {
      return Math.floor(subtotal * taxRate / 100)
    }
  }

  const handleAddLineItem = () => {
    if (formData.line_items.length >= 5) {
      setError(language === 'ja' ? '品目は最大5つまでです' : '품목은 최대 5개까지 가능합니다')
      return
    }
    setFormData({
      ...formData,
      line_items: [...formData.line_items, { name: '', quantity: 1, unit_price: '', tax: 0, tax_rate: 10 }],
    })
  }

  const handleRemoveLineItem = (index: number) => {
    if (formData.line_items.length <= 1) {
      setError(language === 'ja' ? '品目は最低1つ必要です' : '품목은 최소 1개 필요합니다')
      return
    }
    const newItems = formData.line_items.filter((_, i) => i !== index)
    setFormData({ ...formData, line_items: newItems })
  }

  const handleLineItemChange = (index: number, field: keyof QuoteLineItem, value: string | number) => {
    const newItems = [...formData.line_items]
    newItems[index] = { ...newItems[index], [field]: value }

    if (field === 'unit_price' || field === 'quantity' || field === 'tax_rate') {
      const unitPrice = field === 'unit_price'
        ? (typeof value === 'string' ? (value === '' ? 0 : Number(value)) : Number(value))
        : (typeof newItems[index].unit_price === 'string'
          ? (newItems[index].unit_price === '' ? 0 : Number(newItems[index].unit_price))
          : newItems[index].unit_price)
      const quantity = field === 'quantity' ? Number(value) : newItems[index].quantity
      const taxRate = field === 'tax_rate' ? Number(value) : newItems[index].tax_rate
      const isInclusive = formData.tax_entry_method === 'inclusive'
      newItems[index].tax = calculateTax(unitPrice, quantity, taxRate, isInclusive)
    }

    setFormData({ ...formData, line_items: newItems })
  }

  const calculateSubtotal = (item: QuoteLineItem) => {
    const price = typeof item.unit_price === 'string' ? (item.unit_price === '' ? 0 : Number(item.unit_price)) : item.unit_price
    return price * item.quantity
  }

  const calculateTotal = () => formData.line_items.reduce((sum, item) => sum + calculateSubtotal(item), 0)
  const calculateTaxTotal = () => formData.line_items.reduce((sum, item) => sum + item.tax, 0)

  const calculateGrandTotal = () => {
    if (formData.tax_entry_method === 'inclusive') {
      return calculateTotal()
    } else {
      return calculateTotal() + calculateTaxTotal()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!formData.partner_name.trim()) {
      setError(language === 'ja' ? '取引先名を入力してください' : '거래처명을 입력하세요')
      return
    }

    if (!formData.quote_date) {
      setError(language === 'ja' ? '見積日を入力してください' : '견적일을 입력하세요')
      return
    }

    const hasEmptyLineItem = formData.line_items.some(item => {
      const price = typeof item.unit_price === 'string' ? (item.unit_price === '' ? 0 : Number(item.unit_price)) : item.unit_price
      return !item.name.trim() || item.quantity <= 0 || price <= 0
    })
    if (hasEmptyLineItem) {
      setError(language === 'ja' ? '品目情報を正しく入力してください' : '품목 정보를 올바르게 입력하세요')
      return
    }

    setShowPreview(true)
  }

  const handleConfirmQuote = async () => {
    setError('')
    setSuccess('')
    setIsSubmitting(true)

    try {
      const processedLineItems = formData.line_items.map(item => ({
        ...item,
        unit_price: typeof item.unit_price === 'string' ? Number(item.unit_price) : item.unit_price,
      }))

      const response = await quoteAPI.createQuote({
        ...formData,
        line_items: processedLineItems,
      })

      const quoteId = response.data.quote_id
      const quoteNumber = response.data.quote_number

      setSuccess(language === 'ja' ? `見積書を作成しました (${quoteNumber})` : `견적서가 작성되었습니다 (${quoteNumber})`)

      try {
        const pdfResponse = await quoteAPI.downloadPdf(quoteId)
        const blob = new Blob([pdfResponse.data], { type: 'application/pdf' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        const dateStr = formData.quote_date.replace(/-/g, '')
        const partnerNameWithTitle = formData.partner_name + (formData.partner_title || '')
        const sanitizedName = partnerNameWithTitle.replace(/[\\/:*?"<>|]/g, '_')
        a.download = `${sanitizedName}_COCOマーケ見積書_${dateStr}.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      } catch (pdfError) {
        console.error('PDF download error:', pdfError)
      }

      setShowPreview(false)

      setTimeout(() => {
        navigate('/quotes')
      }, 2000)
    } catch (error: any) {
      console.error('Error creating quote:', error)
      setError(error.response?.data?.error || (language === 'ja' ? '見積書の作成に失敗しました' : '견적서 작성 실패'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-6">
          <Button onClick={() => navigate('/quotes')} variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6" />
            {language === 'ja' ? '見積書作成' : '견적서 작성'}
          </h1>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded mb-4">{error}</div>
        )}

        {success && (
          <div className="bg-green-50 text-green-600 p-3 rounded mb-4">{success}</div>
        )}

        <form onSubmit={handleSubmit}>
          {/* 자사 정보 */}
          <div className="mb-6 bg-gray-50 p-4 rounded">
            <h3 className="font-bold mb-2">{language === 'ja' ? '自社情報' : '자사 정보'}</h3>
            <div className="text-sm space-y-1 text-gray-700">
              <p><strong>{language === 'ja' ? '会社名:' : '회사명:'}</strong> {companyInfo.name}</p>
              <p><strong>{language === 'ja' ? '登録番号:' : '등록번호:'}</strong> {companyInfo.registrationNumber}</p>
              <div>
                <strong>{language === 'ja' ? '住所:' : '주소:'}</strong>
                <div className="whitespace-pre-line ml-16">{companyInfo.address}</div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                <div>
                  <label className="block text-sm font-medium mb-1">TEL</label>
                  <input
                    type="text"
                    value={formData.contact_tel}
                    onChange={(e) => setFormData({ ...formData, contact_tel: e.target.value })}
                    className="w-full border rounded px-3 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {language === 'ja' ? '担当' : '담당'}
                  </label>
                  <input
                    type="text"
                    value={formData.contact_person}
                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                    className="w-full border rounded px-3 py-1.5 text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 거래처 정보 */}
          <div className="mb-6">
            <h3 className="font-bold mb-3">{language === 'ja' ? '取引先情報' : '거래처 정보'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">
                  {language === 'ja' ? '取引先名' : '거래처명'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.partner_name}
                  onChange={(e) => setFormData({ ...formData, partner_name: e.target.value })}
                  placeholder={language === 'ja' ? '取引先名を入力' : '거래처명 입력'}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  {language === 'ja' ? '敬称' : '경칭'} <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.partner_title}
                  onChange={(e) => setFormData({ ...formData, partner_title: e.target.value as '御中' | '様' | '' })}
                  className="w-full border rounded px-3 py-2"
                  required
                >
                  <option value="御中">御中</option>
                  <option value="様">様</option>
                  <option value="">{language === 'ja' ? 'なし' : '없음'}</option>
                </select>
              </div>
            </div>
          </div>

          {/* 견적일 */}
          <div className="mb-6">
            <h3 className="font-bold mb-3">{language === 'ja' ? '見積日' : '견적일'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  {language === 'ja' ? '見積日' : '견적일'} <span className="text-red-500">*</span>
                </label>
                <DatePickerInput
                  value={formData.quote_date}
                  onChange={(value) => setFormData({ ...formData, quote_date: value })}
                  className="w-full"
                  isClearable={false}
                />
              </div>
            </div>
          </div>

          {/* 견적 정보 */}
          <div className="mb-6">
            <h3 className="font-bold mb-3">{language === 'ja' ? '見積情報' : '견적 정보'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  {language === 'ja' ? '件名' : '건명'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.quote_title}
                  onChange={(e) => setFormData({ ...formData, quote_title: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  {language === 'ja' ? '納期' : '납기'}
                </label>
                <input
                  type="text"
                  value={formData.delivery_date}
                  onChange={(e) => setFormData({ ...formData, delivery_date: e.target.value })}
                  placeholder={language === 'ja' ? '例: 2026年3月末' : '예: 2026년 3월 말'}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  {language === 'ja' ? '見積期限' : '견적 유효기한'}
                </label>
                <input
                  type="text"
                  value={formData.quote_expiry}
                  onChange={(e) => setFormData({ ...formData, quote_expiry: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
            </div>
          </div>

          {/* 품목 */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold">{language === 'ja' ? '品目' : '품목'}</h3>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-sm text-gray-600">
                    {language === 'ja' ? '税込' : '소비세 포함'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const newMethod = formData.tax_entry_method === 'inclusive' ? 'exclusive' : 'inclusive'
                      const isInclusive = newMethod === 'inclusive'
                      const updatedItems = formData.line_items.map(item => {
                        const unitPrice = typeof item.unit_price === 'string'
                          ? (item.unit_price === '' ? 0 : Number(item.unit_price))
                          : item.unit_price
                        const tax = calculateTax(unitPrice, item.quantity, item.tax_rate, isInclusive)
                        return { ...item, tax }
                      })
                      setFormData({
                        ...formData,
                        tax_entry_method: newMethod,
                        line_items: updatedItems,
                      })
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      formData.tax_entry_method === 'inclusive' ? 'bg-blue-500' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        formData.tax_entry_method === 'inclusive' ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </label>
                <Button
                  type="button"
                  onClick={handleAddLineItem}
                  disabled={formData.line_items.length >= 5}
                  className="flex items-center gap-1"
                  size="sm"
                >
                  <Plus className="w-4 h-4" />
                  {language === 'ja' ? '追加' : '추가'}
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {formData.line_items.map((item, index) => (
                <div key={index} className="border rounded p-3">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                    <div className="md:col-span-4">
                      <label className="block text-xs mb-1">{language === 'ja' ? '項目名' : '항목명'}</label>
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => handleLineItemChange(index, 'name', e.target.value)}
                        className="w-full border rounded px-2 py-1 text-sm"
                        required
                      />
                    </div>
                    <div className="md:col-span-1">
                      <label className="block text-xs mb-1">{language === 'ja' ? '数量' : '수량'}</label>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleLineItemChange(index, 'quantity', Number(e.target.value))}
                        onWheel={(e) => e.currentTarget.blur()}
                        className="w-full border rounded px-2 py-1 text-sm"
                        min="1"
                        required
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs mb-1">{language === 'ja' ? '単価' : '단가'}</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={item.unit_price}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, '')
                          handleLineItemChange(index, 'unit_price', val)
                        }}
                        className="w-full border rounded px-2 py-1 text-sm"
                        placeholder="0"
                        required
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs mb-1">{language === 'ja' ? '税率' : '세율'}</label>
                      <select
                        value={item.tax_rate}
                        onChange={(e) => handleLineItemChange(index, 'tax_rate', Number(e.target.value))}
                        className="w-full border rounded px-2 py-1 text-sm"
                      >
                        <option value={0}>0%</option>
                        <option value={8}>8%</option>
                        <option value={10}>10%</option>
                      </select>
                    </div>
                    <div className="md:col-span-2 flex flex-col items-end justify-end">
                      <label className="block text-xs mb-1">{language === 'ja' ? '金額' : '금액'}</label>
                      <div className="text-sm font-medium py-1 text-right min-w-[120px]">
                        ¥{calculateSubtotal(item).toLocaleString()}
                      </div>
                    </div>
                    <div className="md:col-span-1 flex items-end">
                      <Button
                        type="button"
                        onClick={() => handleRemoveLineItem(index)}
                        variant="ghost"
                        size="sm"
                        disabled={formData.line_items.length <= 1}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 합계 */}
          <div className="mb-6 bg-gray-50 p-4 rounded">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>{language === 'ja' ? '小計' : '소계'}:</span>
                <span className="font-medium">¥{calculateTotal().toLocaleString()}</span>
              </div>
              {formData.tax_entry_method === 'exclusive' && (
                <div className="flex justify-between">
                  <span>{language === 'ja' ? '消費税' : '소비세'}:</span>
                  <span className="font-medium">¥{calculateTaxTotal().toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>
                  {formData.tax_entry_method === 'inclusive'
                    ? (language === 'ja' ? '合計（税込）' : '합계(세금포함)')
                    : (language === 'ja' ? '税込合計' : '세금포함 합계')}:
                </span>
                <span>¥{calculateGrandTotal().toLocaleString()}</span>
              </div>
              {formData.tax_entry_method === 'inclusive' && (
                <div className="text-xs text-gray-500 mt-2">
                  {language === 'ja'
                    ? '※ 消費税が含まれています'
                    : '※ 소비세가 포함되어 있습니다'}
                </div>
              )}
            </div>
          </div>

          {/* 비고 */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              {language === 'ja' ? '備考' : '비고'}
            </label>
            <textarea
              value={formData.memo}
              onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
              className="w-full border rounded px-3 py-2 min-h-[100px]"
              placeholder={language === 'ja' ? '備考を入力（任意）' : '비고를 입력하세요 (선택사항)'}
            />
          </div>

          {/* 제출 버튼 */}
          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center gap-2"
            >
              <FileText className="w-4 h-4" />
              {language === 'ja' ? 'プレビュー' : '미리보기'}
            </Button>
          </div>
        </form>
      </div>

      <QuotePreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        onConfirm={handleConfirmQuote}
        formData={formData}
        companyInfo={companyInfo}
        isSubmitting={isSubmitting}
        language={language}
      />
    </div>
  )
}
