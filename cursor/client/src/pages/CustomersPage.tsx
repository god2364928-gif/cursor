import { useState, useEffect, useRef } from 'react'
import api from '../lib/api'
import { Customer, CustomerHistory } from '../types'
import { useAuthStore } from '../store/authStore'
import { useI18nStore } from '../i18n'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent } from '../components/ui/card'
import { useToast } from '../components/ui/toast'
import { Phone, PhoneOff, MessageSquare, FileText, ExternalLink, Copy, Calendar, Pin, PinOff, Check, Trash2 } from 'lucide-react'
import { formatNumber, parseFormattedNumber } from '../lib/utils'

export default function CustomersPage() {
  const { t } = useI18nStore()
  const user = useAuthStore(state => state.user)
  const { showToast } = useToast()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [history, setHistory] = useState<CustomerHistory[]>([])
  const [statusFilter, setStatusFilter] = useState<'all' | '契約中' | '契約解除'>('all')
  const [managerFilter, setManagerFilter] = useState<string>(user?.name || 'all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [historyType, setHistoryType] = useState<'call_attempt' | 'call_success' | 'line' | 'memo'>('memo')
  const [historyContent, setHistoryContent] = useState('')
  const [phoneNumbers, setPhoneNumbers] = useState<string[]>([''])
  const [instagramAccounts, setInstagramAccounts] = useState<string[]>([''])
  const [savingPhones, setSavingPhones] = useState(false)
  const [initialPhoneCount, setInitialPhoneCount] = useState(0)
  const isAdmin = user?.role === 'admin'
  const lastFetchedId = useRef<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    fetchCustomers()
  }, [])
  
  useEffect(() => {
    if (selectedCustomer?.id && selectedCustomer.id !== lastFetchedId.current) {
      lastFetchedId.current = selectedCustomer.id
      
      // 즉시 리스트 데이터로 초기화 (빠른 반응)
      const phones: string[] = []
      if (selectedCustomer.phone1) phones.push(selectedCustomer.phone1)
      if (selectedCustomer.phone2) phones.push(selectedCustomer.phone2)
      if (selectedCustomer.phone3) phones.push(selectedCustomer.phone3)
      setPhoneNumbers(phones.length > 0 ? phones : [''])
      setInitialPhoneCount(phones.length)
      setInstagramAccounts(selectedCustomer.instagram ? [selectedCustomer.instagram] : [''])
      
      // 이전 요청 취소
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      
      // 새 요청 생성
      abortControllerRef.current = new AbortController()
      
      fetchCustomerDetail(selectedCustomer.id, abortControllerRef.current.signal)
      fetchHistory(selectedCustomer.id, abortControllerRef.current.signal)
    }
  }, [selectedCustomer?.id])
  
  // 담당자 필터가 본인으로 설정되어 있고, 고객이 없으면 전체로 전환
  useEffect(() => {
    if (managerFilter && managerFilter !== 'all' && managerFilter === user?.name && customers.length > 0) {
      const hasCustomersForManager = customers.some(c => c.manager === managerFilter)
      if (!hasCustomersForManager) {
        setManagerFilter('all')
      }
    }
  }, [customers, managerFilter, user?.name])
  
  // 컴포넌트 언마운트 시 요청 취소
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  const fetchCustomers = async () => {
    try {
      const response = await api.get('/customers')
      setCustomers(response.data)
      // 첫 번째 고객을 자동으로 선택
      if (response.data.length > 0 && !selectedCustomer) {
        setSelectedCustomer(response.data[0])
      }
    } catch (error) {
      console.error('Failed to fetch customers:', error)
    }
  }
  
  const fetchCustomerDetail = async (id: string, signal?: AbortSignal) => {
    try {
      const response = await api.get(`/customers/${id}`, { signal })
      const customer = response.data
      // 날짜 필드 정규화
      if (customer.contractStartDate && customer.contractStartDate.includes('T')) {
        customer.contractStartDate = customer.contractStartDate.split('T')[0]
      }
      if (customer.contractExpirationDate && customer.contractExpirationDate.includes('T')) {
        customer.contractExpirationDate = customer.contractExpirationDate.split('T')[0]
      }
      // 전화번호와 인스타그램 배열 초기화 (phone1~3 모두 반영)
      const phones: string[] = []
      if (customer.phone1) phones.push(customer.phone1)
      if (customer.phone2) phones.push(customer.phone2)
      if (customer.phone3) phones.push(customer.phone3)
      setPhoneNumbers(phones.length > 0 ? phones : [''])
      setInitialPhoneCount(phones.length)
      setInstagramAccounts(customer.instagram ? [customer.instagram] : [''])
      // setSelectedCustomer를 호출하지 않음 - 이미 리스트에서 선택된 상태이므로
    } catch (error: any) {
      // AbortError는 무시 (요청이 취소된 경우)
      if (error.name !== 'CanceledError' && error.name !== 'AbortError') {
        console.error('Failed to fetch customer detail:', error)
      }
    }
  }
  
  const fetchHistory = async (id: string, signal?: AbortSignal) => {
    try {
      const response = await api.get(`/customers/${id}/history`, { signal })
      setHistory(response.data)
    } catch (error: any) {
      // AbortError는 무시 (요청이 취소된 경우)
      if (error.name !== 'CanceledError' && error.name !== 'AbortError') {
        console.error('Failed to fetch history:', error)
      }
    }
  }
  
  const handleAddCustomer = async () => {
    const companyName = (document.getElementById('new-companyName') as HTMLInputElement)?.value
    const industry = (document.getElementById('new-industry') as HTMLInputElement)?.value
    const customerName = (document.getElementById('new-customerName') as HTMLInputElement)?.value
    const phone1 = (document.getElementById('new-phone1') as HTMLInputElement)?.value
    const monthlyBudget = parseFormattedNumber((document.getElementById('new-monthlyBudget') as HTMLInputElement)?.value || '0')
    const region = (document.getElementById('new-region') as HTMLInputElement)?.value || ''
    const inflowPath = (document.getElementById('new-inflowPath') as HTMLSelectElement)?.value || ''
    const manager = user?.name || ''
    const managerTeam = user?.team || ''
    
    if (!companyName || !industry || !customerName || !phone1) {
      showToast('필수 항목을 입력해주세요', 'error')
      return
    }
    
    try {
      await api.post('/customers', {
        companyName, industry, customerName, phone1,
        monthlyBudget, region, inflowPath,
        manager, managerTeam, status: '契約中'
      })
      showToast(t('customer') + '이 추가되었습니다', 'success')
      setShowAddForm(false)
      fetchCustomers()
    } catch (error) {
      showToast(t('add') + ' 실패', 'error')
    }
  }
  
  const handleDeleteCustomer = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return
    
    try {
      await api.delete(`/customers/${id}`)
      showToast('삭제되었습니다', 'success')
      setSelectedCustomer(null)
      fetchCustomers()
    } catch (error: any) {
      showToast(error.response?.data?.message || '삭제 실패 (어드민만 가능)', 'error')
    }
  }
  
  const handleSave = async () => {
    if (!selectedCustomer) return
    
    try {
      const payload = {
        ...selectedCustomer,
        phone1: phoneNumbers[0] || '',
        phone2: phoneNumbers[1] || '',
        phone3: phoneNumbers[2] || '',
      }
      await api.put(`/customers/${selectedCustomer.id}`, payload)
      showToast(t('save') + '되었습니다', 'success')
      fetchCustomers()
    } catch (error: any) {
      if (error.response?.status === 403) {
        showToast('본인만 내용을 수정 가능합니다', 'error')
      } else {
        showToast(error.response?.data?.message || t('save') + ' 실패', 'error')
      }
    }
  }

  const handleSavePhones = async () => {
    if (!selectedCustomer) return
    setSavingPhones(true)
    try {
      const payload = {
        phone1: phoneNumbers[0] || '',
        phone2: phoneNumbers[1] || '',
        phone3: phoneNumbers[2] || '',
      }
      await api.put(`/customers/${selectedCustomer.id}`, { ...selectedCustomer, ...payload })
      showToast(t('save') + '되었습니다', 'success')
      fetchCustomers()
    } catch (error: any) {
      showToast(error.response?.data?.message || t('save') + ' 실패', 'error')
    } finally {
      setSavingPhones(false)
      setInitialPhoneCount(phoneNumbers.length)
    }
  }
  
  const handleExtend = async () => {
    if (!selectedCustomer) return
    if (!confirm('계약을 1개월 연장하시겠습니까?')) return
    
    try {
      await api.post(`/customers/${selectedCustomer.id}/extend`)
      fetchHistory(selectedCustomer.id, abortControllerRef.current?.signal)
      showToast('계약이 연장되었습니다', 'success')
    } catch (error: any) {
      if (error.response?.status === 403) {
        showToast('본인만 내용을 수정 가능합니다', 'error')
      } else {
        showToast(error.response?.data?.message || '연장 실패', 'error')
      }
    }
  }
  
  const addPhoneNumber = () => {
    setPhoneNumbers([...phoneNumbers, ''])
  }

  const removePhoneNumber = (index: number) => {
    if (phoneNumbers.length > 1 && index >= initialPhoneCount) {
      setPhoneNumbers(phoneNumbers.filter((_, i) => i !== index))
    }
  }

  const updatePhoneNumber = (index: number, value: string) => {
    const newPhoneNumbers = [...phoneNumbers]
    newPhoneNumbers[index] = value
    setPhoneNumbers(newPhoneNumbers)
    // selectedCustomer를 업데이트하지 않음 - 저장 시에만 서버에 반영
  }

  const addInstagramAccount = () => {
    setInstagramAccounts([...instagramAccounts, ''])
  }

  const removeInstagramAccount = (index: number) => {
    if (instagramAccounts.length > 1) {
      setInstagramAccounts(instagramAccounts.filter((_, i) => i !== index))
    }
  }

  const updateInstagramAccount = (index: number, value: string) => {
    const newInstagramAccounts = [...instagramAccounts]
    newInstagramAccounts[index] = value
    setInstagramAccounts(newInstagramAccounts)
    // selectedCustomer를 업데이트하지 않음 - 저장 시에만 서버에 반영
  }

  const handleDeleteHistory = async (historyId: string) => {
    if (!selectedCustomer) return
    if (!confirm('정말로 이 히스토리를 삭제하시겠습니까?')) return
    
    try {
      await api.delete(`/customers/${selectedCustomer.id}/history/${historyId}`)
      fetchHistory(selectedCustomer.id)
      showToast('히스토리가 삭제되었습니다', 'success')
    } catch (error: any) {
      console.error('Failed to delete history:', error)
      showToast(error.response?.data?.message || '히스토리 삭제에 실패했습니다', 'error')
    }
  }

  const toggleHistoryPin = async (historyId: string, isPinned: boolean) => {
    if (!selectedCustomer) return
    
    try {
      await api.patch(`/customers/${selectedCustomer.id}/history/${historyId}/pin`, { isPinned })
      // 히스토리 목록을 다시 정렬하여 업데이트
      setHistory(prev => {
        const updatedHistory = prev.map(item => 
          item.id === historyId ? { ...item, isPinned } : item
        )
        // 고정된 항목을 상단으로 정렬
        return updatedHistory.sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1
          if (!a.isPinned && b.isPinned) return 1
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        })
      })
    } catch (error) {
      console.error('Failed to toggle history pin:', error)
      showToast('히스토리 고정 상태 변경에 실패했습니다', 'error')
    }
  }

  const handleAddHistory = async () => {
    if (!selectedCustomer) return
    
    // 부재중과 통화성공 처리
    if (historyType === 'call_attempt' || historyType === 'call_success') {
      let content = ''
      
      if (!historyContent) {
        // 내용이 없으면 버튼 이름을 내용으로 사용
        content = historyType === 'call_attempt' ? '不在' : '通話成功'
      } else {
        // 내용이 있으면 버튼 이름 + 내용
        const buttonName = historyType === 'call_attempt' ? '不在' : '通話成功'
        content = `${buttonName}\n${historyContent}`
      }
      
      try {
        await api.post(`/customers/${selectedCustomer.id}/history`, {
          type: historyType,
          content: content
        })
        setHistoryContent('')
        fetchHistory(selectedCustomer.id)
      } catch (error: any) {
        if (error.response?.status === 403) {
          showToast('본인만 내용을 수정 가능합니다', 'error')
        } else {
          showToast(error.response?.data?.message || t('record') + ' 추가 실패', 'error')
        }
      }
      return
    }
    
    // 메모와 카톡은 내용이 필요
    if (!historyContent) return
    
    try {
      await api.post(`/customers/${selectedCustomer.id}/history`, {
        type: historyType,
        content: historyContent
      })
      setHistoryContent('')
      fetchHistory(selectedCustomer.id)
    } catch (error: any) {
      if (error.response?.status === 403) {
        showToast('본인만 내용을 수정 가능합니다', 'error')
      } else {
        showToast(error.response?.data?.message || t('record') + ' 추가 실패', 'error')
      }
    }
  }
  
  const calculateDaysUntilExpiration = (date: string) => {
    if (!date) return 0
    try {
      // 날짜 문자열을 YYYY-MM-DD 형식으로 정규화
      const dateStr = date.split('T')[0]
      const [year, month, day] = dateStr.split('-').map(Number)
      
      const expirationDate = new Date(year, month - 1, day)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      const diffTime = expirationDate.getTime() - today.getTime()
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
      return diffDays
    } catch (error) {
      return 0
    }
  }
  
  const getExpirationStatus = (days: number) => {
    if (days < 0) return 'bg-red-100 text-red-800'
    if (days <= 7) return 'bg-red-100 text-red-800'
    if (days <= 30) return 'bg-yellow-100 text-yellow-800'
    return 'bg-green-100 text-green-800'
  }
  
  const normalizeStatus = (s?: string) => {
    const v = (s || '').trim()
    if (v === '契約中' || v === '購入') return '契約中'
    if (v === '解約' || v === '契約解除') return '契約解除'
    return v
  }

  const filteredCustomers = customers.filter(c => {
    const statusMatch = statusFilter === 'all' || normalizeStatus(c.status) === statusFilter
    const managerMatch = managerFilter === 'all' || c.manager === managerFilter
    
    // 검색어가 있으면 검색 필터링
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      
      // 전화번호 뒷자리 검색을 위한 함수
      const phoneMatches = (phone: string | undefined) => {
        if (!phone) return false
        
        // 검색어에서 숫자만 추출
        const cleanQuery = query.replace(/[^0-9]/g, '')
        if (!cleanQuery) return false
        
        // 전화번호에서 숫자만 추출
        const cleanPhone = phone.replace(/[^0-9]/g, '')
        if (!cleanPhone) return false
        
        // 뒷자리 검색 우선 (예: "9836" 입력 시 "090-1776-9836"의 뒷자리와 매치)
        if (cleanPhone.endsWith(cleanQuery)) return true
        
        // 전체 번호에서 포함 검색 (예: "1776" 입력 시 "090-1776-9836"에서 중간 부분 매치)
        if (cleanPhone.includes(cleanQuery)) return true
        
        return false
      }
      
      const matches = 
        c.companyName?.toLowerCase().includes(query) ||
        c.customerName?.toLowerCase().includes(query) ||
        phoneMatches(c.phone1) ||
        phoneMatches(c.phone2) ||
        phoneMatches(c.phone3) ||
        c.industry?.toLowerCase().includes(query)
      
      return statusMatch && managerMatch && matches
    }
    
    return statusMatch && managerMatch
  }).sort((a, b) => {
    // 정렬: 만료됨 > 계약만료일이 얼마 안남은 순서
    const daysA = calculateDaysUntilExpiration(a.contractExpirationDate)
    const daysB = calculateDaysUntilExpiration(b.contractExpirationDate)
    
    // 만료된 항목 (days < 0)을 가장 위로
    if (daysA < 0 && daysB >= 0) return -1
    if (daysA >= 0 && daysB < 0) return 1
    
    // 같은 범주 내에서 날짜 순 (만료일이 가까운 순)
    return daysA - daysB
  })
  
  // Get unique managers for filter dropdown
  const managers = [...new Set(customers.map(c => c.manager).filter(Boolean))]

  
  const getHistoryIcon = (type: string) => {
    switch (type) {
      case 'call_attempt': return <Phone className="h-4 w-4 text-gray-500" />
      case 'call_success': return <Phone className="h-4 w-4 text-green-600" />
      case 'kakao':
      case 'line': return <MessageSquare className="h-4 w-4 text-blue-600" />
      case 'contract_extended': return <Calendar className="h-4 w-4 text-green-600" />
      default: return <FileText className="h-4 w-4 text-gray-500" />
    }
  }
  
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return `${date.toLocaleDateString('ja-JP')} ${date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}`
  }

  return (
    <div className="h-screen flex">
      {/* Left: Customer List (30%) */}
      <div className="w-1/3 border-r p-4 space-y-4 h-screen flex flex-col">
      <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">{t('customerList')}</h2>
            <Button size="sm" onClick={() => setShowAddForm(!showAddForm)}>+ {t('add')}</Button>
      </div>

          {/* Search */}
          <div className="mb-4">
            <label className="text-sm text-gray-600">{t('search')}</label>
            <Input
              placeholder={`${t('companyName')}, ${t('customerName')}, ${t('phone')}, ${t('industry')} ${t('search')}`}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          
          {/* Manager Filter */}
          <div className="mb-4">
            <label className="text-sm text-gray-600">{t('manager')}</label>
            <select
              className="w-full border rounded px-3 py-2 text-sm"
              value={managerFilter}
              onChange={e => setManagerFilter(e.target.value)}
            >
              <option value="all">{t('all')}</option>
              {managers.map(manager => (
                <option key={manager} value={manager}>{manager}</option>
              ))}
            </select>
          </div>
          
          {/* Status Filter */}
          <div className="flex gap-2 mb-4">
            <Button
              size="sm"
              variant={statusFilter === 'all' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('all')}
            >
              {t('all')}
            </Button>
            <Button
              size="sm"
              variant={statusFilter === '契約中' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('契約中')}
            >
              {t('contractInProgress')}
            </Button>
            <Button
              size="sm"
              variant={statusFilter === '契約解除' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('契約解除')}
            >
              {t('contractTerminated')}
            </Button>
            <span className="ml-auto text-sm font-semibold text-gray-700">
              총 {filteredCustomers.length}건
            </span>
          </div>
        </div>
        
        {/* Add Customer Form */}
        {showAddForm && (
          <Card className="mb-4">
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3">{t('addCustomer')}</h3>
              <div className="space-y-3">
                <Input placeholder={`${t('companyName')} *`} id="new-companyName" />
                <Input placeholder={`${t('industry')} *`} id="new-industry" />
                <Input placeholder={`${t('customerName')} *`} id="new-customerName" />
                <Input placeholder={`${t('phone')} *`} id="new-phone1" />
                <Input type="text" placeholder="1,000,000" id="new-monthlyBudget" />
                <Input placeholder={t('region')} id="new-region" />
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">{t('inflowPath')}</label>
                  <select
                    className="w-full border rounded px-3 py-2 text-sm"
                    id="new-inflowPath"
                  >
                    <option value="">{t('inflowPath')} {t('selectOption')}</option>
                    <option value="아웃바운드(전화)">아웃바운드(전화)</option>
                    <option value="아웃바운드(라인)">아웃바운드(라인)</option>
                    <option value="아웃바운드(DM)">아웃바운드(DM)</option>
                    <option value="아웃바운드(기타)">아웃바운드(기타)</option>
                    <option value="인바운드(홈페이지)">인바운드(홈페이지)</option>
                    <option value="인바운드(상위노출)">인바운드(상위노출)</option>
                    <option value="인바운드(기타)">인바운드(기타)</option>
                    <option value="무료체험">무료체험</option>
                    <option value="소개">소개</option>
                    <option value="기타">기타</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">{t('manager')}</label>
                  <Input value={user?.name || t('manager')} disabled className="bg-gray-100" />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleAddCustomer} className="flex-1">{t('save')}</Button>
                  <Button variant="ghost" onClick={() => setShowAddForm(false)}>{t('cancel')}</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Customer List */}
        <div className="space-y-2 flex-1 overflow-y-auto">
          {filteredCustomers.map(customer => {
            const days = calculateDaysUntilExpiration(customer.contractExpirationDate)
            return (
              <div
                key={customer.id}
                onClick={() => setSelectedCustomer(customer)}
                className={`p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                  selectedCustomer?.id === customer.id ? 'bg-blue-50 border-blue-300' : ''
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{customer.companyName}</div>
                    <div className="text-xs text-blue-600 mt-0.5">{t('manager')}: {customer.manager || t('notAssigned')}</div>
                    <div className="text-xs text-gray-500">{t('amount')}: {formatNumber(customer.monthlyBudget)}{t('yen')}</div>
                  </div>
                  <div className={`text-xs whitespace-nowrap px-2 py-1 rounded ${
                    getExpirationStatus(days)
                  }`}>
                    {days < 0 ? t('expired') : days === 0 ? 'D-day' : `D-${days}`}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
      
      {/* Center: Customer Detail (40%) */}
      <div className="w-2/5 overflow-y-auto p-4">
        {selectedCustomer ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">{t('customerDetails')}</h2>
              <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
                {t('save')}
              </Button>
            </div>
            
            {/* Basic Info */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">{t('basicInfo')}</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-600">{t('companyName')} *</label>
                    <Input
                      value={selectedCustomer.companyName}
                      onChange={e => setSelectedCustomer({...selectedCustomer, companyName: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">{t('industry')} *</label>
                    <Input
                      value={selectedCustomer.industry}
                      onChange={e => setSelectedCustomer({...selectedCustomer, industry: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">{t('customerName')} *</label>
                    <Input
                      value={selectedCustomer.customerName}
                      onChange={e => setSelectedCustomer({...selectedCustomer, customerName: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">{t('phone')} *</label>
                    {phoneNumbers.map((phone, index) => (
                      <div key={index} className="flex gap-2 mb-2 items-center">
                        <Input
                          value={phone}
                          onChange={e => updatePhoneNumber(index, e.target.value)}
                          placeholder={`${t('phone')} ${index + 1}`}
                        />
                        { index >= initialPhoneCount && ((phone || '').trim() ? (
                          <button
                            type="button"
                            onClick={handleSavePhones}
                            disabled={savingPhones}
                            className={`px-3 py-2 rounded text-white ${savingPhones ? 'bg-green-300' : 'bg-green-500 hover:bg-green-600'}`}
                            title={t('save')}
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        ) : (
                          phoneNumbers.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removePhoneNumber(index)}
                              className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                              title="remove"
                            >
                              -
                            </button>
                          )
                        ))}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addPhoneNumber}
                      className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                    >
                      + {t('addPhone')}
                    </button>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">{t('region')}</label>
                    <Input
                      value={selectedCustomer.region || ''}
                      onChange={e => setSelectedCustomer({...selectedCustomer, region: e.target.value})}
                      placeholder={t('regionPlaceholder')}
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">{t('inflowPath')}</label>
                    <select
                      className="w-full border rounded px-3 py-2"
                      value={selectedCustomer.inflowPath || ''}
                      onChange={e => setSelectedCustomer({...selectedCustomer, inflowPath: e.target.value})}
                    >
                      <option value="">{t('inflowPath')} {t('selectOption')}</option>
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
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Contract Info */}
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3">{t('contractInfo')}</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-gray-600">{t('status')}</label>
                    <select
                      className="w-full border rounded px-3 py-2"
                      value={selectedCustomer.status}
                      onChange={e => setSelectedCustomer({...selectedCustomer, status: e.target.value as '契約中' | '契約解除'})}
                    >
                      <option value="契約中">{t('contractInProgress')}</option>
                      <option value="契約解除">{t('contractTerminated')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">{t('contractAmount')} ({t('yen')})</label>
                    <Input
                      type="text"
                      placeholder="1,000,000"
                      value={formatNumber(selectedCustomer.monthlyBudget || 0)}
                      onChange={e => {
                        const parsed = parseFormattedNumber(e.target.value)
                        setSelectedCustomer({...selectedCustomer, monthlyBudget: parsed})
                      }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-600">{t('contractStartDate')}</label>
                      <input
                        type="date"
                        className="w-full border rounded px-3 py-2"
                        value={(() => {
                          const date = selectedCustomer.contractStartDate;
                          if (!date) return '';
                          if (typeof date === 'string') return date.split('T')[0];
                          return date;
                        })()}
                        onChange={e => setSelectedCustomer({...selectedCustomer, contractStartDate: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">{t('contractExpirationDate')}</label>
                      <input
                        type="date"
                        className="w-full border rounded px-3 py-2"
                        value={(() => {
                          const date = selectedCustomer.contractExpirationDate;
                          if (!date) return '';
                          if (typeof date === 'string') return date.split('T')[0];
                          return date;
                        })()}
                        onChange={e => setSelectedCustomer({...selectedCustomer, contractExpirationDate: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button onClick={handleExtend} className="bg-green-600 hover:bg-green-700">
                      +1{t('month')} {t('extendContract')}
                    </Button>
                    <span className="text-sm text-gray-600">
                      {t('remainingDays')}: D-{calculateDaysUntilExpiration(selectedCustomer.contractExpirationDate)}
                      </span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Marketing Info */}
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3">{t('marketingInfo')}</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-gray-600">{t('homepage')}</label>
                    <div className="flex gap-2">
                      <Input
                        value={selectedCustomer.homepage || ''}
                        onChange={e => setSelectedCustomer({...selectedCustomer, homepage: e.target.value})}
                      />
                      <Button 
                        size="sm"
                        onClick={() => {
                          if (selectedCustomer.homepage) {
                            const url = selectedCustomer.homepage.startsWith('http') 
                              ? selectedCustomer.homepage 
                              : `https://${selectedCustomer.homepage}`
                            window.open(url, '_blank')
                          }
                        }}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">{t('instagram')}</label>
                    {instagramAccounts.map((instagram, index) => (
                      <div key={index} className="flex gap-2 mb-2">
                        <Input
                          value={instagram}
                          onChange={e => updateInstagramAccount(index, e.target.value)}
                          placeholder={`${t('instagram')} ${index + 1}`}
                        />
                        {instagramAccounts.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeInstagramAccount(index)}
                            className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                          >
                            -
                          </button>
                        )}
                        <Button 
                          size="sm"
                          onClick={() => {
                            if (instagram) {
                              const instagramId = instagram.replace('@', '').trim()
                              const url = `https://instagram.com/${instagramId}`
                              window.open(url, '_blank')
                            }
                          }}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm"
                          onClick={() => {
                            if (instagram) {
                              navigator.clipboard.writeText(instagram)
                              // 토스트 메시지 표시
                              const toast = document.createElement('div')
                              toast.textContent = '복사되었습니다'
                              toast.className = 'fixed top-4 right-4 bg-gray-800 text-white px-4 py-2 rounded-lg text-sm z-50 opacity-90'
                              document.body.appendChild(toast)
                              setTimeout(() => {
                                document.body.removeChild(toast)
                              }, 2000)
                            }
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addInstagramAccount}
                      className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                    >
                      + {t('addInstagram')}
                    </button>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">{t('mainKeywords')}</label>
                    <Input
                      value={selectedCustomer.mainKeywords?.join(', ') || ''}
                      onChange={e => setSelectedCustomer({...selectedCustomer, mainKeywords: e.target.value.split(', ').filter(k => k)})}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Memo */}
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3">{t('memo')}</h3>
                <textarea
                  className="w-full border rounded p-2 min-h-[100px]"
                  value={selectedCustomer.memo || ''}
                  onChange={e => setSelectedCustomer({...selectedCustomer, memo: e.target.value})}
                />
              </CardContent>
            </Card>
            
            <div className="flex gap-2">
              <Button onClick={handleSave} className="flex-1">{t('save')}</Button>
              {isAdmin && (
                <Button 
                  onClick={() => handleDeleteCustomer(selectedCustomer.id)} 
                  variant="destructive"
                >
                  {t('delete')}
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-500 mt-20">
            {t('selectCustomer')}
          </div>
        )}
      </div>
      
      {/* Right: History (30%) */}
      <div className="w-1/3 border-l overflow-y-auto p-4 space-y-4">
        <h2 className="text-xl font-bold">{t('customerHistory')}</h2>
        
        {/* Quick Input */}
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-2 mb-4">
              <Button
                size="sm"
                variant={historyType === 'call_attempt' ? 'default' : 'outline'}
                onClick={() => setHistoryType('call_attempt')}
              >
                <PhoneOff className="h-4 w-4 mr-1" />{t('missedCall')}
              </Button>
              <Button
                size="sm"
                variant={historyType === 'call_success' ? 'default' : 'outline'}
                onClick={() => setHistoryType('call_success')}
              >
                <Phone className="h-4 w-4 mr-1" />{t('callSuccess')}
              </Button>
              <Button
                size="sm"
                variant={historyType === 'line' ? 'default' : 'outline'}
                onClick={() => setHistoryType('line')}
              >
                <MessageSquare className="h-4 w-4 mr-1" />{t('kakaoTalk')}
              </Button>
              <Button
                size="sm"
                variant={historyType === 'memo' ? 'default' : 'outline'}
                onClick={() => setHistoryType('memo')}
              >
                <FileText className="h-4 w-4 mr-1" />{t('memo')}
              </Button>
            </div>
            {/* Add History */}
            <div className="mb-4">
              <textarea
                className="w-full border rounded p-2 mb-2"
                placeholder={t('enterContent')}
                value={historyContent}
                onChange={e => setHistoryContent(e.target.value)}
              />
              <Button onClick={handleAddHistory} className="w-full">{t('add')}</Button>
            </div>
        </CardContent>
      </Card>
        
        {/* History Timeline */}
        <div className="space-y-2">
          {history.map(item => (
            <div key={item.id} className={`border-l-2 pl-3 py-2 ${item.isPinned ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200'}`}>
              <div className="flex items-center gap-2 mb-1">
                {getHistoryIcon(item.type)}
                <span className="text-sm font-semibold">{item.userName}</span>
                {item.isPinned && (
                  <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded">
                    {t('pinned')}
                  </span>
                )}
                <span className="text-xs text-gray-500">{formatDateTime(item.createdAt)}</span>
                {isAdmin && (
                  <button
                    onClick={() => handleDeleteHistory(item.id)}
                    className="ml-auto p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-600"
                    title="삭제"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => toggleHistoryPin(item.id, !item.isPinned)}
                  className="p-1 rounded hover:bg-gray-100 text-gray-400"
                  title={item.isPinned ? t('unpin') : t('pin')}
                >
                  {item.isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                </button>
              </div>
              <div className="text-sm text-gray-700 whitespace-pre-line">{item.content}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
