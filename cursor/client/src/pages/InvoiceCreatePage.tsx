import { useState, useEffect } from 'react'
import { invoiceAPI } from '../lib/api'
import { InvoiceFormData, InvoiceLineItem, FreeeCompany } from '../types'
import { Button } from '../components/ui/button'
import { useI18nStore } from '../i18n'
import { Plus, Trash2, FileText, Download, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function InvoiceCreatePage() {
  const navigate = useNavigate()
  const { language, t } = useI18nStore()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [companies, setCompanies] = useState<FreeeCompany[]>([])
  const [selectedCompany, setSelectedCompany] = useState<number | null>(null)
  const [authCode, setAuthCode] = useState('')
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // 청구서 폼 데이터
  const [formData, setFormData] = useState<Omit<InvoiceFormData, 'company_id'>>({
    partner_name: '',
    partner_title: '様',
    invoice_title: 'COCOマーケご利用料',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: '',
    tax_entry_method: 'exclusive',
    line_items: [
      { name: '', quantity: 1, unit_price: 0, tax: 0 },
    ],
    payment_bank_info: 'PayPay銀行 ビジネス営業部支店（005） 普通 7136331 カブシキガイシャホットセラー',
  })

  const [taxRate, setTaxRate] = useState<number>(10) // 세율 (0, 8, 10)

  // 자사 정보 (고정값)
  const companyInfo = {
    name: '株式会社ホットセラー',
    registrationNumber: 'T5013301050765',
    address: '〒104-0053 東京都中央区晴海一丁目8番10号 晴海アイランドトリトンスクエア オフィスタワーX棟8階',
    bankInfo: 'PayPay銀行 ビジネス営業部支店（005） 普通 7136331 カブシキガイシャホットセラー',
  }

  // 인증 상태 확인
  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    try {
      const response = await invoiceAPI.checkAuthStatus()
      setIsAuthenticated(response.data.authenticated)
      
      if (response.data.authenticated) {
        await loadCompanies()
      }
    } catch (error) {
      console.error('Error checking auth status:', error)
    } finally {
      setIsCheckingAuth(false)
    }
  }

  const loadCompanies = async () => {
    try {
      const response = await invoiceAPI.getCompanies()
      if (response.data.companies) {
        setCompanies(response.data.companies)
        if (response.data.companies.length > 0) {
          setSelectedCompany(response.data.companies[0].id)
        }
      }
    } catch (error) {
      console.error('Error loading companies:', error)
    }
  }

  const handleAuthRedirect = async () => {
    try {
      const response = await invoiceAPI.getAuthUrl()
      window.open(response.data.authUrl, '_blank')
      setError('')
    } catch (error) {
      setError(language === 'ja' ? '認証URLの取得に失敗しました' : '인증 URL 가져오기 실패')
    }
  }

  const handleAuthCallback = async () => {
    if (!authCode.trim()) {
      setError(language === 'ja' ? '認証コードを入力してください' : '인증 코드를 입력하세요')
      return
    }

    setIsAuthenticating(true)
    setError('')

    try {
      await invoiceAPI.authCallback(authCode)
      setIsAuthenticated(true)
      setAuthCode('')
      await loadCompanies()
      setSuccess(language === 'ja' ? '認証に成功しました' : '인증 성공')
    } catch (error: any) {
      setError(error.response?.data?.error || (language === 'ja' ? '認証に失敗しました' : '인증 실패'))
    } finally {
      setIsAuthenticating(false)
    }
  }

  const handleAddLineItem = () => {
    if (formData.line_items.length >= 5) {
      setError(language === 'ja' ? '品目は最大5つまでです' : '품목은 최대 5개까지 가능합니다')
      return
    }
    setFormData({
      ...formData,
      line_items: [...formData.line_items, { name: '', quantity: 1, unit_price: 0, tax: 0 }],
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

  const handleLineItemChange = (index: number, field: keyof InvoiceLineItem, value: string | number) => {
    const newItems = [...formData.line_items]
    newItems[index] = { ...newItems[index], [field]: value }
    
    // 세액 자동 계산 (선택된 세율 적용)
    if (field === 'unit_price' || field === 'quantity') {
      const unitPrice = field === 'unit_price' ? Number(value) : newItems[index].unit_price
      const quantity = field === 'quantity' ? Number(value) : newItems[index].quantity
      newItems[index].tax = Math.floor(unitPrice * quantity * (taxRate / 100))
    }
    
    setFormData({ ...formData, line_items: newItems })
  }

  // 세율 변경 시 모든 품목의 세액 재계산
  const handleTaxRateChange = (newTaxRate: number) => {
    setTaxRate(newTaxRate)
    const newItems = formData.line_items.map(item => ({
      ...item,
      tax: Math.floor(item.unit_price * item.quantity * (newTaxRate / 100))
    }))
    setFormData({ ...formData, line_items: newItems })
  }

  const calculateSubtotal = (item: InvoiceLineItem) => {
    return item.unit_price * item.quantity
  }

  const calculateTotal = () => {
    return formData.line_items.reduce((sum, item) => sum + calculateSubtotal(item), 0)
  }

  const calculateTaxTotal = () => {
    return formData.line_items.reduce((sum, item) => sum + item.tax, 0)
  }

  const calculateGrandTotal = () => {
    if (formData.tax_entry_method === 'inclusive') {
      // 내세(포함): 소계만 표시 (세금 이미 포함)
      return calculateTotal()
    } else {
      // 외세(별도): 소계 + 세액
      return calculateTotal() + calculateTaxTotal()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!selectedCompany) {
      setError(language === 'ja' ? '事業所を選択してください' : '사업소를 선택하세요')
      return
    }

    // 유효성 검사
    if (!formData.partner_name.trim()) {
      setError(language === 'ja' ? '取引先名を入力してください' : '거래처명을 입력하세요')
      return
    }

    if (!formData.invoice_date || !formData.due_date) {
      setError(language === 'ja' ? '日付を入力してください' : '날짜를 입력하세요')
      return
    }

    const hasEmptyLineItem = formData.line_items.some(item => !item.name.trim() || item.quantity <= 0 || item.unit_price <= 0)
    if (hasEmptyLineItem) {
      setError(language === 'ja' ? '品目情報を正しく入力してください' : '품목 정보를 올바르게 입력하세요')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await invoiceAPI.createInvoice({
        company_id: selectedCompany,
        ...formData,
      })

      const invoiceId = response.data.invoice_id

      setSuccess(language === 'ja' ? `請求書を発行しました (ID: ${invoiceId})` : `청구서가 발행되었습니다 (ID: ${invoiceId})`)

      // PDF 자동 다운로드
      try {
        const pdfResponse = await invoiceAPI.downloadPdf(invoiceId, selectedCompany)
        const blob = new Blob([pdfResponse.data], { type: 'application/pdf' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `invoice_${invoiceId}.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      } catch (pdfError) {
        console.error('PDF download error:', pdfError)
        setError(language === 'ja' ? 'PDFのダウンロードに失敗しました' : 'PDF 다운로드 실패')
      }

      // 2초 후 목록 페이지로 이동
      setTimeout(() => {
        navigate('/invoices')
      }, 2000)
    } catch (error: any) {
      console.error('Error creating invoice:', error)
      setError(error.response?.data?.error || (language === 'ja' ? '請求書の発行に失敗しました' : '청구서 발행 실패'))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isCheckingAuth) {
    return (
      <div className="p-6">
        <div className="text-center">{language === 'ja' ? '読み込み中...' : '로딩 중...'}</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-6">
            <Button onClick={() => navigate('/invoices')} variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="w-6 h-6" />
              {language === 'ja' ? '請求書発行' : '청구서 발행'}
            </h1>
          </div>

          <div className="mb-6">
            <p className="text-gray-600 mb-4">
              {language === 'ja' 
                ? 'freeeと連携して請求書を発行します。まず認証を行ってください。' 
                : 'freee와 연동하여 청구서를 발행합니다. 먼저 인증을 진행하세요.'}
            </p>

            <Button onClick={handleAuthRedirect} className="w-full mb-4">
              {language === 'ja' ? 'freee認証ページを開く' : 'freee 인증 페이지 열기'}
            </Button>

            <div className="border-t pt-4">
              <label className="block text-sm font-medium mb-2">
                {language === 'ja' ? '認証コードを入力' : '인증 코드 입력'}
              </label>
              <input
                type="text"
                value={authCode}
                onChange={(e) => setAuthCode(e.target.value)}
                className="w-full border rounded px-3 py-2 mb-2"
                placeholder={language === 'ja' ? '認証コード' : '인증 코드'}
              />
              <Button 
                onClick={handleAuthCallback} 
                disabled={isAuthenticating}
                className="w-full"
              >
                {isAuthenticating 
                  ? (language === 'ja' ? '認証中...' : '인증 중...') 
                  : (language === 'ja' ? '認証を完了' : '인증 완료')}
              </Button>
            </div>
          </div>

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
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-6">
          <Button onClick={() => navigate('/invoices')} variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6" />
            {language === 'ja' ? '請求書発行' : '청구서 발행'}
          </h1>
        </div>

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

        <form onSubmit={handleSubmit}>
          {/* 사업소 선택 */}
          {companies.length > 0 && (
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">
                {language === 'ja' ? '事業所' : '사업소'}
              </label>
              <select
                value={selectedCompany || ''}
                onChange={(e) => setSelectedCompany(Number(e.target.value))}
                className="w-full border rounded px-3 py-2"
              >
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.display_name || company.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 자사 정보 */}
          <div className="mb-6 bg-gray-50 p-4 rounded">
            <h3 className="font-bold mb-2">{language === 'ja' ? '自社情報' : '자사 정보'}</h3>
            <div className="text-sm space-y-1 text-gray-700">
              <p><strong>{language === 'ja' ? '会社名:' : '회사명:'}</strong> {companyInfo.name}</p>
              <p><strong>{language === 'ja' ? '登録番号:' : '등록번호:'}</strong> {companyInfo.registrationNumber}</p>
              <p><strong>{language === 'ja' ? '住所:' : '주소:'}</strong> {companyInfo.address}</p>
              <p><strong>{language === 'ja' ? '振込先:' : '입금처:'}</strong> {companyInfo.bankInfo}</p>
            </div>
          </div>

          {/* 청구서 제목 */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              {language === 'ja' ? '請求書タイトル' : '청구서 제목'} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.invoice_title}
              onChange={(e) => setFormData({ ...formData, invoice_title: e.target.value })}
              className="w-full border rounded px-3 py-2 bg-gray-50"
              required
              readOnly
            />
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
                  <option value="様">様</option>
                  <option value="御中">御中</option>
                  <option value="">{language === 'ja' ? 'なし' : '없음'}</option>
                </select>
              </div>
            </div>
          </div>

          {/* 세율 및 내세/외세 선택 */}
          <div className="mb-6 bg-blue-50 p-4 rounded">
            <h3 className="font-bold mb-3">{language === 'ja' ? '税率設定' : '세율 설정'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  {language === 'ja' ? '税率' : '세율'} <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleTaxRateChange(0)}
                    className={`flex-1 px-4 py-2 rounded border ${taxRate === 0 ? 'bg-blue-500 text-white border-blue-500' : 'bg-white border-gray-300'}`}
                  >
                    0%
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTaxRateChange(8)}
                    className={`flex-1 px-4 py-2 rounded border ${taxRate === 8 ? 'bg-blue-500 text-white border-blue-500' : 'bg-white border-gray-300'}`}
                  >
                    8%
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTaxRateChange(10)}
                    className={`flex-1 px-4 py-2 rounded border ${taxRate === 10 ? 'bg-blue-500 text-white border-blue-500' : 'bg-white border-gray-300'}`}
                  >
                    10%
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  {language === 'ja' ? '税の表示方法' : '세금 표시 방법'} <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, tax_entry_method: 'inclusive' })}
                    className={`flex-1 px-4 py-2 rounded border ${formData.tax_entry_method === 'inclusive' ? 'bg-blue-500 text-white border-blue-500' : 'bg-white border-gray-300'}`}
                  >
                    {language === 'ja' ? '内税（込）' : '내세(포함)'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, tax_entry_method: 'exclusive' })}
                    className={`flex-1 px-4 py-2 rounded border ${formData.tax_entry_method === 'exclusive' ? 'bg-blue-500 text-white border-blue-500' : 'bg-white border-gray-300'}`}
                  >
                    {language === 'ja' ? '外税（別）' : '외세(별도)'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 송금처 정보 */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              {language === 'ja' ? '振込先' : '송금처'} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.payment_bank_info}
              onChange={(e) => setFormData({ ...formData, payment_bank_info: e.target.value })}
              className="w-full border rounded px-3 py-2"
              required
              placeholder="PayPay銀行 ビジネス営業部支店（005） 普通 7136331 カブシキガイシャホットセラー"
            />
            <p className="text-xs text-gray-500 mt-1">
              {language === 'ja' 
                ? 'PayPay決済の場合は送金先を変更してください' 
                : 'PayPay 결제의 경우 송금처를 변경하세요'}
            </p>
          </div>

          {/* 날짜 */}
          <div className="mb-6">
            <h3 className="font-bold mb-3">{language === 'ja' ? '日付' : '날짜'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  {language === 'ja' ? '請求日' : '청구일'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.invoice_date}
                  onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  {language === 'ja' ? '入金期限' : '입금기한'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>
            </div>
          </div>

          {/* 품목 */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold">{language === 'ja' ? '品目' : '품목'}</h3>
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

            <div className="space-y-3">
              {formData.line_items.map((item, index) => (
                <div key={index} className="border rounded p-3">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                    <div className="md:col-span-5">
                      <label className="block text-xs mb-1">{language === 'ja' ? '品目名' : '품목명'}</label>
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => handleLineItemChange(index, 'name', e.target.value)}
                        className="w-full border rounded px-2 py-1 text-sm"
                        required
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs mb-1">{language === 'ja' ? '数量' : '수량'}</label>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleLineItemChange(index, 'quantity', Number(e.target.value))}
                        className="w-full border rounded px-2 py-1 text-sm"
                        min="1"
                        required
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs mb-1">{language === 'ja' ? '単価' : '단가'}</label>
                      <input
                        type="number"
                        value={item.unit_price}
                        onChange={(e) => handleLineItemChange(index, 'unit_price', Number(e.target.value))}
                        className="w-full border rounded px-2 py-1 text-sm"
                        min="0"
                        required
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs mb-1">{language === 'ja' ? '小計' : '소계'}</label>
                      <div className="text-sm font-medium py-1">
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
                  <span>{language === 'ja' ? `消費税(${taxRate}%)` : `소비세(${taxRate}%)`}:</span>
                  <span className="font-medium">¥{calculateTaxTotal().toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>
                  {formData.tax_entry_method === 'inclusive' 
                    ? (language === 'ja' ? '合計（税込）' : '합계(세금포함)') 
                    : (language === 'ja' ? '合計' : '합계')}:
                </span>
                <span>¥{calculateGrandTotal().toLocaleString()}</span>
              </div>
              {formData.tax_entry_method === 'inclusive' && taxRate > 0 && (
                <div className="text-xs text-gray-500 mt-2">
                  {language === 'ja' 
                    ? `※ 消費税${taxRate}%が含まれています` 
                    : `※ 소비세 ${taxRate}%가 포함되어 있습니다`}
                </div>
              )}
            </div>
          </div>

          {/* 제출 버튼 */}
          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              {isSubmitting 
                ? (language === 'ja' ? '発行中...' : '발행 중...') 
                : (language === 'ja' ? '請求書を発行してPDFダウンロード' : '청구서 발행 및 PDF 다운로드')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

