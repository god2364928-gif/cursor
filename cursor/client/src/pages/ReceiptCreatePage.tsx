import { useState, useEffect } from 'react'
import { invoiceAPI } from '../lib/api'
import { InvoiceLineItem, FreeeCompany } from '../types'
import { Button } from '../components/ui/button'
import { useI18nStore } from '../i18n'
import { Plus, Trash2, FileText, ArrowLeft } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'

export default function ReceiptCreatePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { language, t } = useI18nStore()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [companies, setCompanies] = useState<FreeeCompany[]>([])
  const [selectedCompany, setSelectedCompany] = useState<number | null>(null)
  const [partners, setPartners] = useState<any[]>([])
  const [selectedPartner, setSelectedPartner] = useState<number | null>(null)
  const [isLoadingPartners, setIsLoadingPartners] = useState(false)
  const [showNewPartnerForm, setShowNewPartnerForm] = useState(false)
  const [partnerSearchKeyword, setPartnerSearchKeyword] = useState('')
  const [authCode, setAuthCode] = useState('')
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPreview, setShowPreview] = useState(false)

  // 영수증 폼 데이터
  const [formData, setFormData] = useState<any>({
    partner_name: '',
    partner_title: '様',
    receipt_title: 'COCOマーケご利用料 領収書',
    receipt_date: new Date().toISOString().split('T')[0],
    issue_date: new Date().toISOString().split('T')[0],  // 영수일
    tax_entry_method: 'exclusive',
    receipt_contents: [
      { name: '', quantity: 1, unit_price: '', tax: 0, tax_rate: 10 },
    ],
    payment_bank_info: 'PayPay銀行\nビジネス営業部支店（005）\n普通　7136331\nカブシキガイシャホットセラー',
  })

  const [paymentMethod, setPaymentMethod] = useState<'bank' | 'paypay'>('bank')

  // 자사 정보
  const companyInfo = {
    name: '株式会社ホットセラー',
    registrationNumber: 'T5013301050765',
    address: '〒104-0053\n東京都中央区晴海一丁目8番10号\n晴海アイランドトリトンスクエア\nオフィスタワーX棟8階',
    bankInfo: 'PayPay銀行\nビジネス営業部支店（005）\n普通　7136331\nカブシキガイシャホットセラー',
  }

  useEffect(() => {
    console.log('🔄 Checking auth status...')
    checkAuthStatus()

    const handleFocus = () => {
      console.log('🔄 Page focused - checking auth status')
      checkAuthStatus()
    }

    window.addEventListener('focus', handleFocus)
    
    return () => {
      window.removeEventListener('focus', handleFocus)
    }
  }, [location.pathname])

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
          const firstCompanyId = response.data.companies[0].id
          setSelectedCompany(firstCompanyId)
          await loadPartners(firstCompanyId)
        }
      }
    } catch (error) {
      console.error('Error loading companies:', error)
    }
  }

  const loadPartners = async (companyId: number) => {
    setIsLoadingPartners(true)
    try {
      const response = await invoiceAPI.getPartners(companyId)
      if (response.data.partners) {
        setPartners(response.data.partners)
      }
    } catch (error) {
      console.error('Error loading partners:', error)
    } finally {
      setIsLoadingPartners(false)
    }
  }

  const handleCompanyChange = async (companyId: string) => {
    const id = parseInt(companyId, 10)
    setSelectedCompany(id)
    setSelectedPartner(null)
    await loadPartners(id)
  }

  const handlePartnerChange = (partnerId: string) => {
    const id = parseInt(partnerId, 10)
    setSelectedPartner(id)
    
    const partner = partners.find((p) => p.id === id)
    if (partner) {
      setFormData((prev: any) => ({
        ...prev,
        partner_name: partner.name,
      }))
    }
  }

  const handleNewPartnerCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedCompany) return

    const formElement = e.target as HTMLFormElement
    const newPartnerName = (formElement.elements.namedItem('new_partner_name') as HTMLInputElement)?.value

    if (!newPartnerName) {
      setError(language === 'ja' ? '取引先名を入力してください' : '거래처명을 입력해주세요')
      return
    }

    try {
      await invoiceAPI.createPartner(selectedCompany, newPartnerName)
      setSuccess(language === 'ja' ? '取引先を作成しました' : '거래처가 생성되었습니다')
      setShowNewPartnerForm(false)
      await loadPartners(selectedCompany)
    } catch (error: any) {
      setError(error.response?.data?.message || 'Error creating partner')
    }
  }

  const handleAuthenticate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!authCode.trim()) {
      setError(language === 'ja' ? '認証コードを入力してください' : '인증 코드를 입력해주세요')
      return
    }

    setIsAuthenticating(true)
    setError('')

    try {
      await invoiceAPI.authenticate(authCode)
      setSuccess(language === 'ja' ? '認証が完了しました' : '인증이 완료되었습니다')
      setAuthCode('')
      await checkAuthStatus()
    } catch (error: any) {
      setError(error.response?.data?.message || 'Authentication failed')
    } finally {
      setIsAuthenticating(false)
    }
  }

  const addLineItem = () => {
    setFormData((prev: any) => ({
      ...prev,
      receipt_contents: [...prev.receipt_contents, { name: '', quantity: 1, unit_price: '', tax: 0, tax_rate: 10 }],
    }))
  }

  const removeLineItem = (index: number) => {
    setFormData((prev: any) => ({
      ...prev,
      receipt_contents: prev.receipt_contents.filter((_: any, i: number) => i !== index),
    }))
  }

  const updateLineItem = (index: number, field: keyof InvoiceLineItem, value: string | number) => {
    setFormData((prev: any) => {
      const newItems = [...prev.receipt_contents]
      newItems[index] = { ...newItems[index], [field]: value }
      return { ...prev, receipt_contents: newItems }
    })
  }

  const calculateSubtotal = (item: InvoiceLineItem): number => {
    const subtotal = item.quantity * (parseFloat(String(item.unit_price)) || 0)
    return Math.floor(subtotal)
  }

  const calculateTotalAmount = (): number => {
    return formData.receipt_contents.reduce((acc: number, item: InvoiceLineItem) => acc + calculateSubtotal(item), 0)
  }

  const calculateTax = (): number => {
    const subtotal = calculateTotalAmount()
    if (formData.tax_entry_method === 'inclusive') {
      return Math.floor(subtotal * 10 / 110)
    } else {
      return Math.floor(subtotal * 0.1)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedCompany) {
      setError(language === 'ja' ? '会社を選択してください' : '회사를 선택해주세요')
      return
    }

    if (!formData.partner_name) {
      setError(language === 'ja' ? '取引先を選択してください' : '거래처를 선택해주세요')
      return
    }

    const payload = {
      company_id: selectedCompany,
      partner_id: selectedPartner,
      partner_name: formData.partner_name,
      partner_title: formData.partner_title,
      receipt_title: formData.receipt_title,
      receipt_date: formData.receipt_date,
      issue_date: formData.issue_date,
      tax_entry_method: formData.tax_entry_method,
      payment_bank_info: formData.payment_bank_info,
      receipt_contents: formData.receipt_contents.map((item: InvoiceLineItem) => ({
        name: item.name,
        quantity: item.quantity,
        unit_price: parseFloat(String(item.unit_price)),
        tax: item.tax || 0,
        tax_rate: item.tax_rate || 10,
      })),
    }

    setIsSubmitting(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('https://cursor-production.up.railway.app/api/receipts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to create receipt')
      }

      setSuccess(language === 'ja' ? '領収書を作成しました' : '영수증이 생성되었습니다')
      
      // 폼 초기화
      setFormData({
        partner_name: '',
        partner_title: '様',
        receipt_title: 'COCOマーケご利用料 領収書',
        receipt_date: new Date().toISOString().split('T')[0],
        issue_date: new Date().toISOString().split('T')[0],
        tax_entry_method: 'exclusive',
        receipt_contents: [
          { name: '', quantity: 1, unit_price: '', tax: 0, tax_rate: 10 },
        ],
        payment_bank_info: formData.payment_bank_info,
      })
      setSelectedPartner(null)
      setPartnerSearchKeyword('')
    } catch (error: any) {
      console.error('Error creating receipt:', error)
      setError(error.message || 'Error creating receipt')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isCheckingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>{language === 'ja' ? '認証状態を確認中...' : '인증 상태 확인 중...'}</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {language === 'ja' ? '戻る' : '뒤로'}
        </Button>
        <h1 className="text-2xl font-bold mb-4">
          {language === 'ja' ? 'freee請求書 認証' : 'freee請求書 인증'}
        </h1>
        <div className="space-y-4">
          <p>
            {language === 'ja' 
              ? 'freee請求書APIを使用するには、まず認証が必要です。' 
              : 'freee請求書 API를 사용하려면 먼저 인증이 필요합니다.'}
          </p>
          <Button
            onClick={() => window.open('https://accounts.secure.freee.co.jp/public_api/authorize?client_id=632732953685764&redirect_uri=urn:ietf:wg:oauth:2.0:oob&response_type=code', '_blank')}
          >
            {language === 'ja' ? 'freeeで認証' : 'freee에서 인증'}
          </Button>
          <form onSubmit={handleAuthenticate} className="space-y-2">
            <input
              type="text"
              value={authCode}
              onChange={(e) => setAuthCode(e.target.value)}
              placeholder={language === 'ja' ? '認証コードを入力' : '인증 코드 입력'}
              className="w-full border rounded px-3 py-2"
            />
            <Button type="submit" disabled={isAuthenticating}>
              {isAuthenticating ? (language === 'ja' ? '認証中...' : '인증 중...') : (language === 'ja' ? '認証を完了' : '인증 완료')}
            </Button>
          </form>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          {success && <p className="text-green-500 text-sm">{success}</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        {language === 'ja' ? '戻る' : '뒤로'}
      </Button>
      
      <h1 className="text-2xl font-bold mb-6">
        {language === 'ja' ? '領収書作成' : '영수증 작성'}
      </h1>

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

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 회사 선택 */}
        <div>
          <label className="block text-sm font-medium mb-1">
            {language === 'ja' ? '会社' : '회사'}
          </label>
          <select
            value={selectedCompany || ''}
            onChange={(e) => handleCompanyChange(e.target.value)}
            className="w-full border rounded px-3 py-2"
          >
            <option value="">{language === 'ja' ? '選択してください' : '선택하세요'}</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.display_name || company.name}
              </option>
            ))}
          </select>
        </div>

        {/* 거래처 선택 */}
        {selectedCompany && (
          <div>
            <label className="block text-sm font-medium mb-1">
              {language === 'ja' ? '取引先' : '거래처'}
            </label>
            <input
              type="text"
              value={partnerSearchKeyword}
              onChange={(e) => setPartnerSearchKeyword(e.target.value)}
              placeholder={language === 'ja' ? '取引先名で検索...' : '거래처명 검색...'}
              className="w-full border rounded px-3 py-2 mb-2"
            />
            <select
              value={selectedPartner || ''}
              onChange={(e) => handlePartnerChange(e.target.value)}
              className="w-full border rounded px-3 py-2"
              disabled={isLoadingPartners}
            >
              <option value="">{language === 'ja' ? '選択してください' : '선택하세요'}</option>
              {partners
                .filter(partner =>
                  !partnerSearchKeyword ||
                  partner.name.toLowerCase().includes(partnerSearchKeyword.toLowerCase())
                )
                .map((partner) => (
                  <option key={partner.id} value={partner.id}>
                    {partner.name} {partner.code ? `(${partner.code})` : ''}
                  </option>
                ))}
            </select>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowNewPartnerForm(!showNewPartnerForm)}
              className="mt-2"
            >
              {showNewPartnerForm 
                ? (language === 'ja' ? 'キャンセル' : '취소')
                : (language === 'ja' ? '+ 新しい取引先を作成' : '+ 새 거래처 생성')}
            </Button>
            {showNewPartnerForm && (
              <form onSubmit={handleNewPartnerCreate} className="mt-2 space-y-2">
                <input
                  type="text"
                  name="new_partner_name"
                  placeholder={language === 'ja' ? '取引先名' : '거래처명'}
                  className="w-full border rounded px-3 py-2"
                />
                <Button type="submit">
                  {language === 'ja' ? '作成' : '생성'}
                </Button>
              </form>
            )}
          </div>
        )}

        {/* 영수증 제목 */}
        <div>
          <label className="block text-sm font-medium mb-1">
            {language === 'ja' ? '領収書タイトル' : '영수증 제목'}
          </label>
          <input
            type="text"
            value={formData.receipt_title}
            onChange={(e) => setFormData({ ...formData, receipt_title: e.target.value })}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        {/* 청구일 */}
        <div>
          <label className="block text-sm font-medium mb-1">
            {language === 'ja' ? '請求日' : '청구일'}
          </label>
          <input
            type="date"
            value={formData.receipt_date}
            onChange={(e) => setFormData({ ...formData, receipt_date: e.target.value })}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        {/* 영수일 */}
        <div>
          <label className="block text-sm font-medium mb-1">
            {language === 'ja' ? '領収日' : '영수일'}
          </label>
          <input
            type="date"
            value={formData.issue_date}
            onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        {/* 세금 방식 */}
        <div>
          <label className="block text-sm font-medium mb-1">
            {language === 'ja' ? '税込/税別' : '세금 포함/별도'}
          </label>
          <select
            value={formData.tax_entry_method}
            onChange={(e) => setFormData({ ...formData, tax_entry_method: e.target.value as 'inclusive' | 'exclusive' })}
            className="w-full border rounded px-3 py-2"
          >
            <option value="exclusive">{language === 'ja' ? '税別' : '세금 별도'}</option>
            <option value="inclusive">{language === 'ja' ? '税込' : '세금 포함'}</option>
          </select>
        </div>

        {/* 품목 */}
        <div>
          <label className="block text-sm font-medium mb-2">
            {language === 'ja' ? '品目' : '품목'}
          </label>
          {formData.receipt_contents.map((item: InvoiceLineItem, index: number) => (
            <div key={index} className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-3 p-3 border rounded">
              <div className="md:col-span-2">
                <label className="block text-xs mb-1">{language === 'ja' ? '品目名' : '품목명'}</label>
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) => updateLineItem(index, 'name', e.target.value)}
                  className="w-full border rounded px-2 py-1 text-sm"
                  placeholder={language === 'ja' ? '例: コンサルティング' : '예: 컨설팅'}
                />
              </div>
              <div>
                <label className="block text-xs mb-1">{language === 'ja' ? '数量' : '수량'}</label>
                <input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => updateLineItem(index, 'quantity', parseInt(e.target.value) || 0)}
                  className="w-full border rounded px-2 py-1 text-sm"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-xs mb-1">{language === 'ja' ? '単価' : '단가'}</label>
                <input
                  type="number"
                  value={item.unit_price}
                  onChange={(e) => updateLineItem(index, 'unit_price', e.target.value)}
                  className="w-full border rounded px-2 py-1 text-sm"
                  placeholder="0"
                />
              </div>
              <div className="md:col-span-2 flex flex-col items-end justify-end">
                <label className="block text-xs mb-1">{language === 'ja' ? '小計' : '소계'}</label>
                <div className="text-sm font-medium py-1 text-right min-w-[120px]">
                  ¥{calculateSubtotal(item).toLocaleString()}
                </div>
              </div>
              {formData.receipt_contents.length > 1 && (
                <div className="md:col-span-6 flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeLineItem(index)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              )}
            </div>
          ))}
          <Button type="button" variant="outline" onClick={addLineItem}>
            <Plus className="mr-2 h-4 w-4" />
            {language === 'ja' ? '品目を追加' : '품목 추가'}
          </Button>
        </div>

        {/* 합계 */}
        <div className="bg-gray-50 p-4 rounded">
          <div className="flex justify-between mb-2">
            <span className="font-medium">{language === 'ja' ? '小計' : '소계'}:</span>
            <span>¥{calculateTotalAmount().toLocaleString()}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="font-medium">{language === 'ja' ? '消費税 (10%)' : '소비세 (10%)'}:</span>
            <span>¥{calculateTax().toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-lg font-bold pt-2 border-t">
            <span>{language === 'ja' ? '合計' : '합계'}:</span>
            <span>¥{(calculateTotalAmount() + (formData.tax_entry_method === 'exclusive' ? calculateTax() : 0)).toLocaleString()}</span>
          </div>
        </div>

        {/* 제출 버튼 */}
        <div className="flex gap-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting 
              ? (language === 'ja' ? '作成中...' : '생성 중...')
              : (language === 'ja' ? '領収書を発行' : '영수증 발급')}
          </Button>
          <Button type="button" variant="outline" onClick={() => setShowPreview(true)}>
            <FileText className="mr-2 h-4 w-4" />
            {language === 'ja' ? 'プレビュー' : '미리보기'}
          </Button>
        </div>
      </form>
    </div>
  )
}

