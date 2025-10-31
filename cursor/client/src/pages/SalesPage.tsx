import { useState, useEffect } from 'react'
import api from '../lib/api'
import { Sales } from '../types'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { useAuthStore } from '../store/authStore'
import { useI18nStore } from '../i18n'
import { formatNumber } from '../lib/utils'
import { Plus, Edit, Trash2 } from 'lucide-react'

export default function SalesPage() {
  const { t } = useI18nStore()
  const user = useAuthStore(state => state.user)
  const [sales, setSales] = useState<Sales[]>([])
  const [loading, setLoading] = useState(true)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [managerFilter, setManagerFilter] = useState<string>('all')
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingSale, setEditingSale] = useState<Sales | null>(null)
  const [includeTax, setIncludeTax] = useState(true)
  const [currentBaseMonth, setCurrentBaseMonth] = useState<number>(new Date().getMonth())
  const [managerOptions, setManagerOptions] = useState<string[]>([])
  
  
  // 초기 날짜 설정 (당월 - 오늘까지)
  useEffect(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() // 0-11 (0=Jan, 9=Oct)
    
    // 현재 월의 첫째 날
    const firstDayString = `${year}-${String(month + 1).padStart(2, '0')}-01`
    
    // 오늘 날짜
    const todayString = `${year}-${String(month + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    
    console.log('SalesPage initial date setting:', { year, month, firstDayString, todayString })
    setStartDate(firstDayString)
    setEndDate(todayString)
  }, [])

  useEffect(() => {
    if (startDate && endDate) {
      fetchSales()
    }
  }, [startDate, endDate])

  // 모든 직원 목록(관리자 전용 API)을 읽어 드롭다운에 항상 표시
  useEffect(() => {
    ;(async () => {
      try {
        console.log('Loading users for manager filter...')
        const res = await api.get('/auth/users')
        console.log('Users loaded:', res.data)
        const names = (res.data || []).map((u: any) => u.name).sort()
        console.log('Manager options set:', names)
        setManagerOptions(names)
      } catch (e) {
        console.error('Failed to load users for manager filter', e)
      }
    })()
  }, [])
  

  const fetchSales = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/sales?startDate=${startDate}&endDate=${endDate}`)
      setSales(response.data)
    } catch (error) {
      console.error('Failed to fetch sales:', error)
    } finally {
      setLoading(false)
    }
  }

  

  const handlePreviousMonth = () => {
    const now = new Date()
    const year = now.getFullYear()
    
    // 현재 기준 월에서 한 달 빼기
    const newBaseMonth = currentBaseMonth - 1
    setCurrentBaseMonth(newBaseMonth)
    
    // 음수가 되면 이전 년도로 넘어가기
    let targetYear = year
    let targetMonth = newBaseMonth
    if (newBaseMonth < 0) {
      targetYear = year - 1
      targetMonth = 11 // 12월
    }
    
    // 해당 월의 첫째 날
    const prevMonthFirstDay = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-01`
    
    // 해당 월의 마지막 날
    const prevMonthLastDay = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(new Date(targetYear, targetMonth + 1, 0).getDate()).padStart(2, '0')}`
    
    console.log('SalesPage previous month:', { targetYear, targetMonth, prevMonthFirstDay, prevMonthLastDay })
    setStartDate(prevMonthFirstDay)
    setEndDate(prevMonthLastDay)
  }

  const handleCurrentMonth = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    
    // 기준 월을 현재 월로 리셋
    setCurrentBaseMonth(month)
    
    // 현재 월의 첫째 날
    const firstDayString = `${year}-${String(month + 1).padStart(2, '0')}-01`
    
    // 오늘 날짜
    const todayString = `${year}-${String(month + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    
    console.log('SalesPage current month:', { year, month, firstDayString, todayString })
    setStartDate(firstDayString)
    setEndDate(todayString)
  }

  const handleAddSale = async () => {
    const companyName = (document.getElementById('add-companyName') as HTMLInputElement)?.value
    const payerName = (document.getElementById('add-payerName') as HTMLInputElement)?.value
    const salesType = (document.getElementById('add-salesType') as HTMLSelectElement)?.value
    const sourceType = (document.getElementById('add-sourceType') as HTMLSelectElement)?.value
    let amount = parseFormattedNumber((document.getElementById('add-amount') as HTMLInputElement)?.value || '0')
    const contractDate = (document.getElementById('add-contractDate') as HTMLInputElement)?.value
    const marketingContent = (document.getElementById('add-marketingContent') as HTMLTextAreaElement)?.value

    if (!companyName || !salesType || !sourceType || !amount || !contractDate || !marketingContent) {
      alert('모든 필드를 입력해주세요')
      return
    }

    // 소비세 포함일 경우 1.1로 나누기 (세전 금액 계산)
    if (includeTax) {
      amount = Math.floor(amount / 1.1)
    }

    try {
      await api.post('/sales', {
        companyName,
        payerName,
        salesType,
        sourceType,
        amount, // 계산된 세전 금액 저장
        contractDate,
        marketingContent
      })
      
      // 폼 초기화
      ;(document.getElementById('add-companyName') as HTMLInputElement).value = ''
      ;(document.getElementById('add-payerName') as HTMLInputElement).value = ''
      ;(document.getElementById('add-salesType') as HTMLSelectElement).value = ''
      ;(document.getElementById('add-sourceType') as HTMLSelectElement).value = ''
      ;(document.getElementById('add-amount') as HTMLInputElement).value = ''
      ;(document.getElementById('add-contractDate') as HTMLInputElement).value = ''
      ;(document.getElementById('add-marketingContent') as HTMLTextAreaElement).value = ''
      setIncludeTax(false) // 체크박스 해제
      setShowAddForm(false)
      fetchSales()
    } catch (error: any) {
        alert(error.response?.data?.message || t('sales') + ' 추가 실패')
    }
  }

  const handleUpdateSale = async () => {
    if (!editingSale) return

    const payerName = (document.getElementById('edit-payerName') as HTMLInputElement)?.value
    const salesType = (document.getElementById('edit-salesType') as HTMLSelectElement)?.value
    const sourceType = (document.getElementById('edit-sourceType') as HTMLSelectElement)?.value
    let amount = parseFormattedNumber((document.getElementById('edit-amount') as HTMLInputElement)?.value || '0')
    const contractDate = (document.getElementById('edit-contractDate') as HTMLInputElement)?.value
    const marketingContent = (document.getElementById('edit-marketingContent') as HTMLTextAreaElement)?.value

    // 소비세 포함일 경우 1.1로 나누기 (세전 금액 계산)
    if (includeTax) {
      amount = Math.floor(amount / 1.1)
    }

    try {
      await api.put(`/sales/${editingSale.id}`, {
        companyName: editingSale.companyName,
        payerName,
        salesType,
        sourceType,
        amount, // 계산된 세전 금액 저장
        contractDate,
        marketingContent
      })
      setIncludeTax(false) // 체크박스 해제
      setEditingSale(null)
      fetchSales()
      alert(t('update') + '되었습니다')
    } catch (error: any) {
      if (error.response?.status === 403) {
        alert('본인만 내용을 수정 가능합니다')
      } else {
        alert(error.response?.data?.message || t('update') + ' 실패')
      }
    }
  }

  const handleDeleteSale = async (id: string) => {
    if (!confirm('정말로 ' + t('delete') + '하시겠습니까?')) return

    try {
      await api.delete(`/sales/${id}`)
      fetchSales()
      alert(t('delete') + '되었습니다')
    } catch (error: any) {
      if (error.response?.status === 403) {
        alert('본인만 내용을 수정 가능합니다')
      } else {
        alert(error.response?.data?.message || t('delete') + ' 실패')
      }
    }
  }

  const parseFormattedNumber = (formattedStr: string): number => {
    if (!formattedStr) return 0
    const cleanStr = formattedStr.replace(/,/g, '')
    const num = parseFloat(cleanStr)
    return isNaN(num) ? 0 : num
  }

  // 언어와 무관한 분류 정규화/표시
  const toTypeCode = (v?: string): 'new' | 'renew' | 'cancel' | 'other' => {
    const s = (v || '').trim()
    if (s === '신규매출' || s === '新規売上') return 'new'
    if (s === '연장매출' || s === '延長売上') return 'renew'
    if (s === '해지매출' || s === '解約売上') return 'cancel'
    return 'other'
  }

  const typeLabel = (v?: string): string => {
    const code = toTypeCode(v)
    if (code === 'new') return t('newSales')
    if (code === 'renew') return t('renewalSales')
    if (code === 'cancel') return t('cancellationSales')
    return v || ''
  }

  // 소스 유형 라벨 현지화 (데이터는 한글로 저장됨)
  const toSourceToken = (v?: string): string | null => {
    const s = (v || '').trim()
    const map: Record<string, string> = {
      '아웃바운드(전화)': 'outboundPhone',
      'アウトバウンド(電話)': 'outboundPhone',
      '아웃바운드(라인)': 'outboundLine',
      'アウトバウンド(ライン)': 'outboundLine',
      '아웃바운드(DM)': 'outboundDM',
      'アウトバウンド(DM)': 'outboundDM',
      '아웃바운드(기타)': 'outboundOther',
      'アウトバウンド(その他)': 'outboundOther',
      '인바운드(홈페이지)': 'inboundHomepage',
      'インバウンド(ホームページ)': 'inboundHomepage',
      '인바운드(상위노출)': 'inboundTopExposure',
      'インバウンド(上位表示)': 'inboundTopExposure',
      '인바운드(기타)': 'inboundOther',
      'インバウンド(その他)': 'inboundOther',
      '무료체험': 'freeTrial',
      '無料体験': 'freeTrial',
      '소개': 'introduction',
      '紹介': 'introduction',
      '기타': 'other',
      'その他': 'other',
    }
    return map[s] || null
  }

  const sourceLabel = (v?: string): string => {
    const token = toSourceToken(v)
    return token ? t(token) : (v || '')
  }

  // 통계 계산
  const filteredSales = sales.filter(s => managerFilter === 'all' || s.userName === managerFilter)
  
  const totalSales = filteredSales.reduce((sum, s) => sum + s.amount, 0)
  const newSales = filteredSales.filter(s => toTypeCode(s.salesType) === 'new')
  const renewalSales = filteredSales.filter(s => toTypeCode(s.salesType) === 'renew')
  const cancellationSales = filteredSales.filter(s => toTypeCode(s.salesType) === 'cancel')

  if (loading) {
    return <div className="p-6">로딩 중...</div>
  }

  return (
    <div className="p-6 space-y-6">

      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('sales')}</h1>
        <p className="text-muted-foreground">{t('sales')} 실적을 관리하고 조회합니다</p>
      </div>

      {/* 날짜 필터 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm text-gray-600 mb-2 block">{t('startDate')}</label>
              <input
                type="date"
                className="w-full border rounded px-3 py-2"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <label className="text-sm text-gray-600 mb-2 block">{t('endDate')}</label>
              <input
                type="date"
                className="w-full border rounded px-3 py-2"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
              />
            </div>
            <Button onClick={handlePreviousMonth} variant="outline">{t('previousMonth')}</Button>
            <Button onClick={handleCurrentMonth}>{t('currentMonth')}</Button>
          </div>
        </CardContent>
      </Card>

      {/* 통계 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t('totalSalesAmount')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalSales)}{t('yen')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t('newSalesAmount')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatNumber(newSales.reduce((sum, s) => sum + s.amount, 0))}{t('yen')}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t('renewalSalesAmount')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatNumber(renewalSales.reduce((sum, s) => sum + s.amount, 0))}{t('yen')}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t('cancellationSalesAmount')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatNumber(cancellationSales.reduce((sum, s) => sum + s.amount, 0))}{t('yen')}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 매출 리스트 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('salesList')}</CardTitle>
              <p className="text-sm text-gray-500 mt-1">{t('total')} {filteredSales.length}{t('cases')}</p>
            </div>
            <Button onClick={() => setShowAddForm(!showAddForm)}>
              <Plus className="h-4 w-4 mr-2" />
              {t('add')}
            </Button>
          </div>
          {/* 담당자 필터 */}
          <div className="mt-4">
            <label className="text-sm text-gray-600 mb-2 block">{t('manager')}</label>
            <select
              className="w-full border rounded px-3 py-2 max-w-xs"
              value={managerFilter}
              onChange={e => setManagerFilter(e.target.value)}
            >
              <option value="all">{t('all')}</option>
              {managerOptions.map(manager => (
                <option key={manager} value={manager}>{manager}</option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {/* 추가 폼 */}
          {showAddForm && (
            <div className="mb-6 p-6 pb-8 border rounded-lg bg-gray-50">
              <h3 className="font-semibold mb-3">{t('addSales')}</h3>
              <div className="flex items-center gap-4 mb-4 overflow-x-auto pt-2 pl-2 pb-4">
                <Input 
                  placeholder={t('companyName')} 
                  id="add-companyName" 
                  className="w-64 flex-shrink-0 mb-2 focus-visible:ring-offset-0" 
                />
                <Input 
                  placeholder={t('payerName')} 
                  id="add-payerName" 
                  className="w-48 flex-shrink-0 mb-2 focus-visible:ring-offset-0" 
                />
                <select className="border rounded px-3 py-2 w-28 flex-shrink-0 h-10" id="add-salesType">
                  <option value="">{t('salesType')}</option>
                  <option value="신규매출">{t('newSales')}</option>
                  <option value="연장매출">{t('renewalSales')}</option>
                  <option value="해지매출">{t('cancellationSales')}</option>
                </select>
                <select className="border rounded px-3 py-2 w-40 flex-shrink-0 h-10" id="add-sourceType">
                  <option value="">{t('sourceType')}</option>
                  <option value="아웃바운드(전화)">{t('outboundPhone')}</option>
                  <option value="아웃바운드(라인)">{t('outboundLine')}</option>
                  <option value="아웃바운드(DM)">{t('outboundDM')}</option>
                  <option value="아웃바운드(기타)">{t('outboundOther')}</option>
                  <option value="인바운드(홈페이지)">{t('inboundHomepage')}</option>
                  <option value="인바운드(상위노출)">{t('inboundTopExposure')}</option>
                  <option value="인바운드(기타)">{t('inboundOther')}</option>
                  <option value="무료체험">{t('freeTrial')}</option>
                  <option value="소개">{t('introduction')}</option>
                  <option value="기타">{t('other')}</option>
                </select>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Input 
                    type="text" 
                    placeholder={t('amount')} 
                    id="add-amount"
                    className="w-28 h-10"
                    onChange={e => {
                      const value = e.target.value.replace(/,/g, '')
                      const formatted = formatNumber(parseInt(value) || 0)
                      e.target.value = formatted
                    }}
                  />
                  <label className="flex items-center gap-1 text-sm whitespace-nowrap">
                    <input 
                      type="checkbox" 
                      checked={includeTax}
                      onChange={e => setIncludeTax(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span>{t('includeTax')}</span>
                  </label>
                </div>
                <input type="date" className="border rounded px-3 py-2 w-40 flex-shrink-0 h-10" id="add-contractDate" />
                <textarea className="border rounded px-3 py-2 w-80 flex-shrink-0 h-10 resize-none overflow-hidden" rows={1} placeholder={t('marketingContent')} id="add-marketingContent" style={{resize: 'none'}} />
                <div className="flex gap-2 flex-shrink-0">
                  <Button onClick={handleAddSale}>{t('save')}</Button>
                  <Button variant="outline" onClick={() => setShowAddForm(false)}>{t('cancel')}</Button>
                </div>
              </div>
            </div>
          )}

          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase w-20">{t('manager')}</th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase w-32">{t('companyName')}</th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase w-28">{t('payerName')}</th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase w-24">{t('salesType')}</th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase w-32">{t('sourceType')}</th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase w-24">{t('amount')}</th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase w-28">{t('contractDate')}</th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase w-48">{t('marketingContent')}</th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase w-20">{t('action')}</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50">
                    {editingSale?.id === sale.id ? (
                      <>
                        <td className="px-2 py-3 text-sm">{sale.userName}</td>
                        <td className="px-2 py-3 text-sm">{sale.companyName}</td>
                        <td className="px-2 py-3 text-sm">
                          <Input 
                            type="text" 
                            defaultValue={sale.payerName || ''} 
                            id="edit-payerName"
                            className="w-full"
                          />
                        </td>
                        <td className="px-2 py-3 text-sm">
                          <select className="border rounded px-2 py-1 w-full" id="edit-salesType" defaultValue={sale.salesType}>
                            <option value="신규매출">{t('newSales')}</option>
                            <option value="연장매출">{t('renewalSales')}</option>
                            <option value="해지매출">{t('cancellationSales')}</option>
                          </select>
                        </td>
                        <td className="px-2 py-3 text-sm">
                          <select className="border rounded px-2 py-1 w-full" id="edit-sourceType" defaultValue={sale.sourceType}>
                            <option value="아웃바운드(전화)">{t('outboundPhone')}</option>
                            <option value="아웃바운드(라인)">{t('outboundLine')}</option>
                            <option value="아웃바운드(DM)">{t('outboundDM')}</option>
                            <option value="아웃바운드(기타)">{t('outboundOther')}</option>
                            <option value="인바운드(홈페이지)">{t('inboundHomepage')}</option>
                            <option value="인바운드(상위노출)">{t('inboundTopExposure')}</option>
                            <option value="인바운드(기타)">{t('inboundOther')}</option>
                            <option value="무료체험">{t('freeTrial')}</option>
                            <option value="소개">{t('introduction')}</option>
                            <option value="기타">{t('other')}</option>
                          </select>
                        </td>
                        <td className="px-2 py-3 text-sm">
                          <div className="flex items-center gap-2">
                            <Input 
                              type="text" 
                              defaultValue={formatNumber(sale.amount)} 
                              id="edit-amount"
                              className="flex-1"
                              onChange={e => {
                                const value = e.target.value.replace(/,/g, '')
                                const formatted = formatNumber(parseInt(value) || 0)
                                e.target.value = formatted
                              }}
                            />
                            <label className="flex items-center gap-1 text-xs whitespace-nowrap">
                              <input 
                                type="checkbox" 
                                checked={includeTax}
                                onChange={e => setIncludeTax(e.target.checked)}
                                className="w-3 h-3"
                              />
                              <span>{t('includeTax')}</span>
                            </label>
                          </div>
                        </td>
                        <td className="px-2 py-3 text-sm">
                          <input type="date" className="border rounded px-2 py-1 w-full" defaultValue={sale.contractDate} id="edit-contractDate" />
                        </td>
                        <td className="px-2 py-3 text-sm">
                          <textarea className="border rounded px-2 py-1 w-full resize-none overflow-hidden" rows={2} defaultValue={sale.marketingContent} id="edit-marketingContent" style={{resize: 'none'}} />
                        </td>
                        <td className="px-2 py-3 text-sm">
                          <Button size="sm" onClick={handleUpdateSale}>{t('save')}</Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingSale(null)} className="ml-2">{t('cancel')}</Button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-2 py-3 text-sm text-gray-900">{sale.userName}</td>
                        <td className="px-2 py-3 text-sm text-gray-900">{sale.companyName}</td>
                        <td className="px-2 py-3 text-sm text-gray-900">{sale.payerName || ''}</td>
                        <td className="px-2 py-3 text-sm">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            toTypeCode(sale.salesType) === 'new' ? 'bg-green-100 text-green-800' :
                            toTypeCode(sale.salesType) === 'renew' ? 'bg-blue-100 text-blue-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {typeLabel(sale.salesType)}
                          </span>
                        </td>
                        <td className="px-2 py-3 text-sm text-gray-500">{sourceLabel(sale.sourceType)}</td>
                        <td className="px-2 py-3 text-sm font-medium text-gray-900">{formatNumber(sale.amount)}{t('yen')}</td>
                        <td className="px-2 py-3 text-sm text-gray-500">{sale.contractDate?.split('T')[0] || sale.contractDate}</td>
                        <td className="px-2 py-3 text-sm text-gray-500 max-w-xs truncate">{sale.marketingContent}</td>
                        <td className="px-2 py-3 text-sm">
                          {sale.userId === user?.id && (
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => setEditingSale(sale)}>
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => handleDeleteSale(sale.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
