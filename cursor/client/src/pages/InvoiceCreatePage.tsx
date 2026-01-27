import { useState, useEffect } from 'react'
import { invoiceAPI } from '../lib/api'
import { InvoiceFormData, InvoiceLineItem, FreeeCompany } from '../types'
import { Button } from '../components/ui/button'
import { useI18nStore } from '../i18n'
import { Plus, Trash2, FileText, Download, ArrowLeft, Settings } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import InvoicePreviewModal from '../components/InvoicePreviewModal'
import ExcludedPartnersModal from '../components/ExcludedPartnersModal'
import { useAuthStore } from '../store/authStore'
import api from '../lib/api'
import { DatePickerInput } from '../components/ui/date-picker-input'

export default function InvoiceCreatePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { language, t } = useI18nStore()
  const user = useAuthStore((state) => state.user)
  const isAdmin = user?.role === 'admin'
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [companies, setCompanies] = useState<FreeeCompany[]>([])
  const [selectedCompany, setSelectedCompany] = useState<number | null>(null)
  const [partners, setPartners] = useState<any[]>([])
  const [excludedPartnerNames, setExcludedPartnerNames] = useState<string[]>([])
  const [showExcludedPartnersModal, setShowExcludedPartnersModal] = useState(false)
  const [selectedPartner, setSelectedPartner] = useState<number | null>(null)
  const [isLoadingPartners, setIsLoadingPartners] = useState(false)
  const [showNewPartnerForm, setShowNewPartnerForm] = useState(false)
  const [partnerSearchKeyword, setPartnerSearchKeyword] = useState('')  // 거래처 검색어
  const [authCode, setAuthCode] = useState('')
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPreview, setShowPreview] = useState(false)

  // 청구서 폼 데이터
  const [formData, setFormData] = useState<Omit<InvoiceFormData, 'company_id'>>({
    partner_name: '',
    partner_title: '様',
    invoice_title: 'COCOマーケご利用料',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: '',
    tax_entry_method: 'exclusive',
    line_items: [
      { name: '', quantity: 1, unit_price: '', tax: 0, tax_rate: 10 },
    ],
    payment_bank_info: '三井住友銀行\nトランクＮＯＲＴＨ支店（403）\n普通　0122078\n(株) ホットセラー',
    memo: '',
  })

  const [paymentMethod, setPaymentMethod] = useState<'bank' | 'paypay' | 'paypal'>('bank')

  // 자사 정보 (고정값)
  const companyInfo = {
    name: '株式会社ホットセラー',
    registrationNumber: 'T5013301050765',
    address: '〒104-0053\n東京都中央区晴海一丁目8番10号\n晴海アイランドトリトンスクエア\nオフィスタワーX棟8階',
    bankInfo: '三井住友銀行\nトランクＮＯＲＴＨ支店（403）\n普通　0122078\n(株) ホットセラー',
  }

  // 인증 상태 확인 (페이지 마운트 시 + 포커스될 때마다)
  useEffect(() => {
    console.log('🔄 Checking auth status...')
    checkAuthStatus()
    loadExcludedPartners() // 제외 거래처 목록 로드

    // 페이지가 포커스될 때마다 인증 상태 재확인
    const handleFocus = () => {
      console.log('🔄 Page focused - checking auth status')
      checkAuthStatus()
      loadExcludedPartners()
    }

    window.addEventListener('focus', handleFocus)
    
    return () => {
      window.removeEventListener('focus', handleFocus)
    }
  }, [location.pathname]) // location 변경 시에도 재확인

  const loadExcludedPartners = async () => {
    try {
      const response = await api.get('/excluded-partners')
      const names = response.data.map((p: any) => p.partner_name)
      setExcludedPartnerNames(names)
      console.log('🚫 제외 거래처 목록 로드:', names.length, '개')
    } catch (error) {
      console.error('Error loading excluded partners:', error)
    }
  }

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
          // 거래처 목록도 로드
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
        console.log('📋 [Client] Partners loaded:', response.data.partners.length)
        
        // test1, test2 확인
        const testPartners = response.data.partners.filter((p: any) => 
          p.name.toLowerCase().includes('test')
        )
        if (testPartners.length > 0) {
          console.log('🔍 [Client] Test partners found:', testPartners.map((p: any) => p.name))
        } else {
          console.log('⚠️ [Client] No test partners in response')
        }
        
        // 제외 거래처 필터링 확인
        const filteredCount = response.data.partners.filter((partner: any) => {
          const isNotExcluded = !excludedPartnerNames.some(excludedName => 
            partner.name.includes(excludedName)
          )
          return isNotExcluded
        }).length
        console.log(`📋 [Client] After filtering: ${filteredCount} partners (excluded: ${response.data.partners.length - filteredCount})`)
      }
    } catch (error) {
      console.error('Error loading partners:', error)
    } finally {
      setIsLoadingPartners(false)
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

  // 세액 계산 함수 (내세/외세에 따라 다르게 계산)
  const calculateTax = (unitPrice: number, quantity: number, taxRate: number, isInclusive: boolean) => {
    const subtotal = unitPrice * quantity
    if (isInclusive) {
      // 내세: 세금 포함 금액에서 역산
      return Math.floor(subtotal * taxRate / (100 + taxRate))
    } else {
      // 외세: 세금 별도 계산
      return Math.floor(subtotal * taxRate / 100)
    }
  }

  const handleLineItemChange = (index: number, field: keyof InvoiceLineItem, value: string | number) => {
    const newItems = [...formData.line_items]
    newItems[index] = { ...newItems[index], [field]: value }
    
    // 세액 자동 계산 (품목별 세율 적용, 내세/외세 구분)
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

  // 송금처 변경 핸들러
  const handlePaymentMethodChange = (method: 'bank' | 'paypay' | 'paypal') => {
    setPaymentMethod(method)
    if (method === 'bank') {
      setFormData({
        ...formData,
        payment_bank_info: '三井住友銀行\nトランクＮＯＲＴＨ支店（403）\n普通　0122078\n(株) ホットセラー'
      })
    } else if (method === 'paypay') {
      setFormData({
        ...formData,
        payment_bank_info: 'PayPayアカウント名：株式会社ホットセラー\nPayPayID：hotseller_jp'
      })
    } else {
      setFormData({
        ...formData,
        payment_bank_info: 'PayPal（決済リンク別途ご案内）'
      })
    }
  }

  const calculateSubtotal = (item: InvoiceLineItem) => {
    const price = typeof item.unit_price === 'string' ? (item.unit_price === '' ? 0 : Number(item.unit_price)) : item.unit_price
    return price * item.quantity
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

  // 미리보기 열기 (유효성 검사)
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

    const hasEmptyLineItem = formData.line_items.some(item => {
      const price = typeof item.unit_price === 'string' ? (item.unit_price === '' ? 0 : Number(item.unit_price)) : item.unit_price
      return !item.name.trim() || item.quantity <= 0 || price <= 0
    })
    if (hasEmptyLineItem) {
      setError(language === 'ja' ? '品目情報を正しく入力してください' : '품목 정보를 올바르게 입력하세요')
      return
    }

    // 유효성 검사 통과하면 미리보기 표시
    setShowPreview(true)
  }

  // 실제 발급 처리
  const handleConfirmInvoice = async () => {
    setError('')
    setSuccess('')
    setIsSubmitting(true)

    try {
      // line_items의 unit_price를 숫자로 변환
      const processedLineItems = formData.line_items.map(item => ({
        ...item,
        unit_price: typeof item.unit_price === 'string' ? Number(item.unit_price) : item.unit_price
      }))

      const response = await invoiceAPI.createInvoice({
        company_id: selectedCompany!,
        partner_id: selectedPartner || undefined,  // 선택된 거래처 ID
        payment_method: paymentMethod,  // 결제 방식 (bank/paypay/paypal)
        ...formData,
        line_items: processedLineItems,
      })

      const invoiceId = response.data.invoice_id
      const dbId = response.data.db_id  // DB UUID ID

      setSuccess(language === 'ja' ? `請求書を発行しました (ID: ${invoiceId})` : `청구서가 발행되었습니다 (ID: ${invoiceId})`)

      // PDF 자동 다운로드 (DB ID 사용)
      try {
        const pdfResponse = await invoiceAPI.downloadPdf(dbId)
        const blob = new Blob([pdfResponse.data], { type: 'application/pdf' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        
        // 파일명 생성: {거래처명}_COCOマーケ請求書_{날짜}.pdf
        const dateStr = formData.invoice_date.split('T')[0].replace(/-/g, '')
        const partnerName = formData.partner_name || 'unknown'
        const sanitizedName = partnerName.replace(/[\\/:*?"<>|]/g, '_')  // 파일명에 사용 불가능한 문자 제거
        a.download = `${sanitizedName}_COCOマーケ請求書_${dateStr}.pdf`
        
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      } catch (pdfError) {
        console.error('PDF download error:', pdfError)
        // PDF 다운로드 실패는 무시하고 계속 진행
      }

      // 미리보기 닫기
      setShowPreview(false)

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

            <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
              <p className="text-sm text-yellow-800">
                {language === 'ja'
                  ? '⚠️ freee請求書 API権限で再認証が必要です'
                  : '⚠️ freee請求書 API 권한으로 재인증이 필요합니다'}
              </p>
            </div>

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
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Button onClick={() => navigate('/invoices')} variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="w-6 h-6" />
              {language === 'ja' ? '請求書発行' : '청구서 발행'}
            </h1>
          </div>
          {isAdmin && (
            <Button
              onClick={() => setShowExcludedPartnersModal(true)}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              {language === 'ja' ? '除外取引先管理' : '제외 거래처 관리'}
            </Button>
          )}
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
              <div>
                <strong>{language === 'ja' ? '住所:' : '주소:'}</strong>
                <div className="whitespace-pre-line ml-16">{companyInfo.address}</div>
              </div>
              <div>
                <strong>{language === 'ja' ? '振込先:' : '입금처:'}</strong>
                <div className="whitespace-pre-line ml-16">{companyInfo.bankInfo}</div>
              </div>
            </div>
          </div>

          {/* 청구서 제목 삭제 - 나중에 품목 위로 이동 */}

          {/* 거래처 정보 */}
          <div className="mb-6">
            <h3 className="font-bold mb-3">{language === 'ja' ? '取引先情報' : '거래처 정보'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">
                  {language === 'ja' ? '取引先名' : '거래처명'} <span className="text-red-500">*</span>
                </label>
                {showNewPartnerForm ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={formData.partner_name}
                      onChange={(e) => setFormData({ ...formData, partner_name: e.target.value })}
                      placeholder={language === 'ja' ? '新しい取引先名を入力' : '새 거래처명 입력'}
                      className="w-full border rounded px-3 py-2"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowNewPartnerForm(false)
                        setFormData({ ...formData, partner_name: '' })
                      }}
                    >
                      {language === 'ja' ? '既存取引先から選択' : '기존 거래처에서 선택'}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* 거래처 검색 */}
                    <input
                      type="text"
                      value={partnerSearchKeyword}
                      onChange={(e) => setPartnerSearchKeyword(e.target.value)}
                      placeholder={language === 'ja' ? '取引先名で検索...' : '거래처명 검색...'}
                      className="w-full border rounded px-3 py-2"
                    />
                    <select
                      value={selectedPartner || ''}
                      onChange={(e) => {
                        const partnerId = e.target.value ? Number(e.target.value) : null
                        setSelectedPartner(partnerId)
                        if (partnerId) {
                          const partner = partners.find(p => p.id === partnerId)
                          if (partner) {
                            setFormData({ ...formData, partner_name: partner.name })
                          }
                        } else {
                          setFormData({ ...formData, partner_name: '' })
                        }
                      }}
                      className="w-full border rounded px-3 py-2"
                      required={!showNewPartnerForm}
                      disabled={isLoadingPartners}
                    >
                      <option value="">
                        {isLoadingPartners 
                          ? (language === 'ja' ? '読み込み中...' : '로딩 중...') 
                          : (language === 'ja' ? '取引先を選択' : '거래처 선택')}
                      </option>
                      {partners
                        .filter(partner => {
                          // 검색어 필터링
                          const matchesSearch = !partnerSearchKeyword || 
                            partner.name.toLowerCase().includes(partnerSearchKeyword.toLowerCase())
                          
                          // 제외 목록에 없는 거래처만 표시 (DB에서 로드한 목록 사용)
                          const isNotExcluded = !excludedPartnerNames.some(excludedName => 
                            partner.name.includes(excludedName)
                          )
                          
                          return matchesSearch && isNotExcluded
                        })
                        .map((partner) => (
                          <option key={partner.id} value={partner.id}>
                            {partner.name} {partner.code ? `(${partner.code})` : ''}
                          </option>
                        ))}
                    </select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowNewPartnerForm(true)}
                    >
                      + {language === 'ja' ? '新規登録' : '새로 등록'}
                    </Button>
                  </div>
                )}
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

          {/* 송금처 선택 */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              {language === 'ja' ? '振込先' : '송금처'} <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handlePaymentMethodChange('bank')}
                className={`flex-1 px-4 py-2 rounded border text-left ${paymentMethod === 'bank' ? 'bg-blue-500 text-white border-blue-500' : 'bg-white border-gray-300'}`}
              >
                <div className="text-sm">三井住友銀行</div>
                <div className="text-xs opacity-80">トランクＮＯＲＴＨ支店（403）</div>
              </button>
              <button
                type="button"
                onClick={() => handlePaymentMethodChange('paypay')}
                className={`flex-1 px-4 py-2 rounded border text-left ${paymentMethod === 'paypay' ? 'bg-blue-500 text-white border-blue-500' : 'bg-white border-gray-300'}`}
              >
                <div className="text-sm">PayPayアカウント</div>
                <div className="text-xs opacity-80">株式会社ホットセラー</div>
              </button>
              <button
                type="button"
                onClick={() => handlePaymentMethodChange('paypal')}
                className={`flex-1 px-4 py-2 rounded border text-left ${paymentMethod === 'paypal' ? 'bg-blue-500 text-white border-blue-500' : 'bg-white border-gray-300'}`}
              >
                <div className="text-sm">{language === 'ja' ? 'カード決済' : '카드결제'}</div>
                <div className="text-xs opacity-80">PayPal</div>
              </button>
            </div>
          </div>

          {/* 날짜 */}
          <div className="mb-6">
            <h3 className="font-bold mb-3">{language === 'ja' ? '日付' : '날짜'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  {language === 'ja' ? '請求日' : '청구일'} <span className="text-red-500">*</span>
                </label>
                <DatePickerInput
                  value={formData.invoice_date}
                  onChange={(value) => setFormData({ ...formData, invoice_date: value })}
                  className="w-full"
                  isClearable={false}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  {language === 'ja' ? '入金期限' : '입금기한'} <span className="text-red-500">*</span>
                </label>
                <DatePickerInput
                  value={formData.due_date}
                  onChange={(value) => setFormData({ ...formData, due_date: value })}
                  className="w-full"
                  isClearable={false}
                />
              </div>
            </div>
          </div>

          {/* 件名 (청구서 제목) */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              {language === 'ja' ? '件名' : '건명'} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.invoice_title}
              onChange={(e) => setFormData({ ...formData, invoice_title: e.target.value })}
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>

          {/* 품목 */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold">{language === 'ja' ? '品目' : '품목'}</h3>
              <div className="flex items-center gap-4">
                {/* 소비세 포함 토글 */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-sm text-gray-600">
                    {language === 'ja' ? '税込' : '소비세 포함'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const newMethod = formData.tax_entry_method === 'inclusive' ? 'exclusive' : 'inclusive'
                      const isInclusive = newMethod === 'inclusive'
                      // 모든 품목의 세액 재계산
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
                        line_items: updatedItems
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
                      <label className="block text-xs mb-1">{language === 'ja' ? '品目名' : '품목명'}</label>
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
                        onChange={(e) => handleLineItemChange(index, 'unit_price', e.target.value)}
                        className="w-full border rounded px-2 py-1 text-sm"
                        min="0"
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
                      <label className="block text-xs mb-1">{language === 'ja' ? '小計' : '소계'}</label>
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
                    : (language === 'ja' ? '合計' : '합계')}:
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
              value={formData.memo || ''}
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

      {/* 미리보기 모달 */}
      <InvoicePreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        onConfirm={handleConfirmInvoice}
        formData={formData}
        companyInfo={companyInfo}
        isSubmitting={isSubmitting}
        language={language}
      />

      {/* 제외 거래처 관리 모달 (어드민만) */}
      {isAdmin && (
        <ExcludedPartnersModal
          isOpen={showExcludedPartnersModal}
          onClose={() => setShowExcludedPartnersModal(false)}
          onUpdate={loadExcludedPartners}
          language={language}
        />
      )}
    </div>
  )
}

