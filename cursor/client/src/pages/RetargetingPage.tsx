import { useState, useEffect, useRef } from 'react'
import api from '../lib/api'
import { RetargetingCustomer, RetargetingHistory } from '../types'
import { useAuthStore } from '../store/authStore'
import { useI18nStore } from '../i18n'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent } from '../components/ui/card'
import { useToast } from '../components/ui/toast'
import { Phone, PhoneOff, MessageSquare, FileText, Target, ExternalLink, Copy, Pin, PinOff, Trash2 } from 'lucide-react'
import { formatNumber, parseFormattedNumber } from '../lib/utils'

const RETARGETING_TARGET = 200

export default function RetargetingPage() {
  const { t } = useI18nStore()
  const user = useAuthStore(state => state.user)
  const { showToast } = useToast()
  const isAdmin = user?.role === 'admin'
  const [customers, setCustomers] = useState<RetargetingCustomer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<RetargetingCustomer | null>(null)
  const [history, setHistory] = useState<RetargetingHistory[]>([])
  const [managerFilter, setManagerFilter] = useState<string>(user?.name || 'all')
  const [mainFilter, setMainFilter] = useState<string>('inProgress')
  const [subFilter, setSubFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [showConvertModal, setShowConvertModal] = useState(false)
  const [historyType, setHistoryType] = useState<'missed_call' | 'call_success' | 'line' | 'memo'>('memo')
  const [historyContent, setHistoryContent] = useState('')
  const [convertData, setConvertData] = useState({ monthlyBudget: '', contractStartDate: '', contractExpirationDate: '' })
  
  const [phoneNumbers, setPhoneNumbers] = useState<string[]>([''])
  const [instagramAccounts, setInstagramAccounts] = useState<string[]>([''])
  const lastFetchedId = useRef<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    fetchCustomers()
  }, [])
  
  useEffect(() => {
    if (selectedCustomer?.id && selectedCustomer.id !== lastFetchedId.current) {
      lastFetchedId.current = selectedCustomer.id
      
      // 즉시 리스트 데이터로 초기화 (빠른 반응)
      setPhoneNumbers(selectedCustomer.phone ? [selectedCustomer.phone] : [''])
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
    const response = await api.get('/retargeting')
    setCustomers(response.data)
    // 첫 번째 고객을 자동으로 선택
    if (response.data.length > 0 && !selectedCustomer) {
      setSelectedCustomer(response.data[0])
    }
    } catch (error) {
      console.error('Failed to fetch retargeting customers:', error)
    }
  }
  
  const fetchCustomerDetail = async (id: string, signal?: AbortSignal) => {
    try {
      const response = await api.get(`/retargeting/${id}`, { signal })
      const customer = response.data
      // 날짜 필드 정규화
      if (customer.registeredAt && customer.registeredAt.includes('T')) {
        customer.registeredAt = customer.registeredAt.split('T')[0]
      }
      if (customer.lastContactDate && customer.lastContactDate.includes('T')) {
        customer.lastContactDate = customer.lastContactDate.split('T')[0]
      }
      // 전화번호와 인스타그램 배열 초기화
      setPhoneNumbers(customer.phone ? [customer.phone] : [''])
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
      const response = await api.get(`/retargeting/${id}/history`, { signal })
      setHistory(response.data)
    } catch (error: any) {
      // AbortError는 무시 (요청이 취소된 경우)
      if (error.name !== 'CanceledError' && error.name !== 'AbortError') {
        console.error('Failed to fetch history:', error)
      }
    }
  }
  
  const addPhoneNumber = () => {
    setPhoneNumbers([...phoneNumbers, ''])
  }

  const removePhoneNumber = (index: number) => {
    if (phoneNumbers.length > 1) {
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

  const handleSave = async () => {
    if (!selectedCustomer) return
    
    try {
      await api.put(`/retargeting/${selectedCustomer.id}`, selectedCustomer)
      showToast('저장되었습니다', 'success')
      fetchCustomers()
    } catch (error: any) {
      if (error.response?.status === 403) {
        showToast('본인만 내용을 수정 가능합니다', 'error')
      } else {
        showToast(error.response?.data?.message || '저장 실패', 'error')
      }
    }
  }
  
  const handleDeleteHistory = async (historyId: string) => {
    if (!selectedCustomer) return
    if (!confirm('정말로 이 히스토리를 삭제하시겠습니까?')) return
    
    try {
      await api.delete(`/retargeting/${selectedCustomer.id}/history/${historyId}`)
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
      await api.patch(`/retargeting/${selectedCustomer.id}/history/${historyId}/pin`, { isPinned })
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
    if (!selectedCustomer) {
      console.log('handleAddHistory: No selected customer')
      return
    }
    
    console.log('handleAddHistory called:', { historyType, historyContent, selectedCustomerId: selectedCustomer.id })
    
    // 부재중과 통화성공 처리
    if (historyType === 'missed_call' || historyType === 'call_success') {
      let content = ''
      
      if (!historyContent) {
        // 내용이 없으면 버튼 이름을 내용으로 사용
        content = historyType === 'missed_call' ? '不在' : '通話成功'
      } else {
        // 내용이 있으면 버튼 이름 + 내용
        const buttonName = historyType === 'missed_call' ? '不在' : '通話成功'
        content = `${buttonName}\n${historyContent}`
      }
      
      try {
        await api.post(`/retargeting/${selectedCustomer.id}/history`, {
          type: historyType,
          content: content
        })
        
        // 마지막 연락일 업데이트 (통화성공일 때만)
        if (historyType === 'call_success') {
          const now = new Date()
          const koreaTime = new Date(now.getTime() + (9 * 60 * 60 * 1000))
          const today = koreaTime.toISOString().split('T')[0]
          const updatedCustomer = {...selectedCustomer, lastContactDate: today}
          await api.put(`/retargeting/${selectedCustomer.id}`, updatedCustomer)
          setSelectedCustomer(updatedCustomer)
        }
        
        setHistoryContent('')
        fetchHistory(selectedCustomer.id)
        fetchCustomers()
      } catch (error: any) {
        if (error.response?.status === 403) {
          showToast('본인만 내용을 수정 가능합니다', 'error')
        } else {
          showToast(error.response?.data?.message || t('history') + ' 추가 실패', 'error')
        }
      }
      return
    }
    
    // 카톡과 메모는 내용이 필요
    if (!historyContent) return
    
    try {
      await api.post(`/retargeting/${selectedCustomer.id}/history`, {
        type: historyType,
        content: historyContent
      })
      
      // 마지막 연락일 업데이트 (라인일 때만)
      if (historyType === 'line') {
        const now = new Date()
        const koreaTime = new Date(now.getTime() + (9 * 60 * 60 * 1000))
        const today = koreaTime.toISOString().split('T')[0]
        const updatedCustomer = {...selectedCustomer, lastContactDate: today}
        await api.put(`/retargeting/${selectedCustomer.id}`, updatedCustomer)
        setSelectedCustomer(updatedCustomer)
      }
      
      setHistoryContent('')
      fetchHistory(selectedCustomer.id)
      fetchCustomers()
    } catch (error: any) {
      if (error.response?.status === 403) {
        showToast('본인만 내용을 수정 가능합니다', 'error')
      } else {
        showToast(error.response?.data?.message || t('history') + ' 추가 실패', 'error')
      }
    }
  }
  
  const handleConvert = async () => {
    if (!selectedCustomer || !convertData.monthlyBudget || !convertData.contractStartDate || !convertData.contractExpirationDate) {
      showToast('모든 필드를 입력해주세요', 'error')
      return
    }
    
    try {
      await api.post(`/retargeting/${selectedCustomer.id}/convert`, convertData)
      showToast('계약완료되었습니다', 'success')
      setShowConvertModal(false)
      setSelectedCustomer(null)
      fetchCustomers()
    } catch (error: any) {
      if (error.response?.status === 403) {
        showToast('본인만 내용을 수정 가능합니다', 'error')
      } else {
        showToast(error.response?.data?.message || '계약완료 실패', 'error')
      }
    }
  }
  
  const handleAddCustomer = async () => {
    const companyName = (document.getElementById('new-companyName') as HTMLInputElement)?.value
    const industry = (document.getElementById('new-industry') as HTMLInputElement)?.value
    const customerName = (document.getElementById('new-customerName') as HTMLInputElement)?.value
    const phone = (document.getElementById('new-phone') as HTMLInputElement)?.value
    const region = (document.getElementById('new-region') as HTMLInputElement)?.value
    const inflowPath = (document.getElementById('new-inflowPath') as HTMLSelectElement)?.value
    
    if (!companyName || !industry || !customerName || !phone) {
      showToast('필수 필드를 입력해주세요', 'error')
      return
    }
    
    try {
      // 한국 시간 기준으로 오늘 날짜 생성
      const now = new Date()
      const koreaTime = new Date(now.getTime() + (9 * 60 * 60 * 1000)) // UTC+9
      const today = koreaTime.toISOString().split('T')[0]
      await api.post('/retargeting', {
        companyName,
        industry,
        customerName,
        phone,
        region: region || null,
        inflowPath: inflowPath || null,
        manager: user?.name,
        managerTeam: user?.team,
        status: '開始',
        registeredAt: today
      })
      
      // 폼 초기화
      ;(document.getElementById('new-companyName') as HTMLInputElement).value = ''
      ;(document.getElementById('new-industry') as HTMLInputElement).value = ''
      ;(document.getElementById('new-customerName') as HTMLInputElement).value = ''
      ;(document.getElementById('new-phone') as HTMLInputElement).value = ''
      ;(document.getElementById('new-region') as HTMLInputElement).value = ''
      ;(document.getElementById('new-inflowPath') as HTMLSelectElement).value = ''
      
      showToast('고객이 추가되었습니다', 'success')
      setShowAddForm(false)
      fetchCustomers()
    } catch (error) {
      showToast(t('add') + ' 실패', 'error')
    }
  }
  
  const getDaysSinceLastContact = (lastContactDate?: string) => {
    if (!lastContactDate) return null
    const diff = Date.now() - new Date(lastContactDate).getTime()
    return Math.floor(diff / (1000 * 60 * 60 * 24))
  }
  
  const getContactStatusColor = (days: number | null) => {
    if (days === null) return ''
    if (days >= 30) return 'bg-red-100 border-red-300'
    if (days >= 14) return 'bg-yellow-100 border-yellow-300'
    return ''
  }

  const normalizeName = (name?: string) => (name || '').replace('﨑', '崎').trim()
  const statCustomers = managerFilter === 'all'
    ? customers
    : customers.filter(c => normalizeName(c.manager) === normalizeName(managerFilter))
  const distinctManagers = Array.from(new Set(customers.map(c => normalizeName(c.manager)).filter(Boolean)))
  const target = (managerFilter === 'all' ? distinctManagers.length * RETARGETING_TARGET : RETARGETING_TARGET)
  
  // 필터 값을 데이터베이스 상태 값으로 매핑하는 함수
  const mapFilterToStatus = (filterValue: string) => {
    const mapping: { [key: string]: string } = {
      'start': '開始',
      'awareness': '認知', 
      'interest': '興味',
      'desire': '欲求',
      'trash': 'ゴミ箱'
    }
    return mapping[filterValue] || filterValue
  }

  const normalizeStatus = (s?: string) => {
    if (!s) return s
    if (s === '시작') return '開始'
    if (s === '인지') return '認知'
    if (s === '흥미') return '興味'
    if (s === '욕망') return '欲求'
    if (s === '휴지통') return 'ゴミ箱'
    return s
  }

  const getStatusBadgeClass = (status?: string) => {
    const norm = normalizeStatus(status)
    if (norm === '開始') return 'bg-blue-100 text-blue-800'
    if (norm === '認知') return 'bg-yellow-100 text-yellow-800'
    if (norm === '興味') return 'bg-purple-100 text-purple-800'
    if (norm === '欲求') return 'bg-pink-100 text-pink-800'
    return 'bg-gray-100 text-gray-800'
  }

  const filteredCustomers = customers.filter(c => {
    const managerMatch = managerFilter === 'all' || c.manager === managerFilter
    
    // Main filter: inProgress or trash
    let mainStatusMatch = false
    if (mainFilter === 'inProgress') {
      const norm = normalizeStatus(c.status)
      mainStatusMatch = norm !== 'ゴミ箱' && norm !== 'trash'
    } else if (mainFilter === 'trash') {
      const norm = normalizeStatus(c.status)
      mainStatusMatch = norm === 'ゴミ箱' || norm === 'trash'
    }
    
    // Sub filter: when mainFilter is 'inProgress'
    let subStatusMatch = true
    if (mainFilter === 'inProgress' && subFilter !== 'all') {
      const mappedStatus = mapFilterToStatus(subFilter)
      subStatusMatch = normalizeStatus(c.status) === mappedStatus
    }
    
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
        
        // 뒷자리 검색 우선 (예: "8100" 입력 시 "080-6545-8100"의 뒷자리와 매치)
        if (cleanPhone.endsWith(cleanQuery)) return true
        
        // 전체 번호에서 포함 검색 (예: "6545" 입력 시 "080-6545-8100"에서 중간 부분 매치)
        if (cleanPhone.includes(cleanQuery)) return true
        
        return false
      }
      
      const searchMatch = 
        c.companyName?.toLowerCase().includes(query) ||
        c.customerName?.toLowerCase().includes(query) ||
        phoneMatches(c.phone) ||
        c.industry?.toLowerCase().includes(query)
      
      return managerMatch && mainStatusMatch && subStatusMatch && searchMatch
    }
    
    return managerMatch && mainStatusMatch && subStatusMatch
  }).sort((a, b) => {
    // 정렬: 날짜 없음 > 마지막 연락일이 오래된 순서
    const daysA = getDaysSinceLastContact(a.lastContactDate)
    const daysB = getDaysSinceLastContact(b.lastContactDate)
    
    // 날짜 없는 항목을 가장 위로 (null 값 처리)
    if (daysA === null && daysB !== null) return -1
    if (daysA !== null && daysB === null) return 1
    
    // 같은 범주 내에서 오래된 순 (days 큰 순)
    return (daysB || 0) - (daysA || 0)
  })
  
  const managers = [...new Set(customers.map(c => c.manager).filter(Boolean))]
  
  const getHistoryIcon = (type: string) => {
    switch (type) {
      case 'missed_call': return <PhoneOff className="h-4 w-4 text-gray-500" />
      case 'call_success': return <Phone className="h-4 w-4 text-green-600" />
      case 'kakao':
      case 'line': return <MessageSquare className="h-4 w-4 text-yellow-600" />
      case 'memo': return <FileText className="h-4 w-4 text-blue-600" />
      case 'status_change': return <Target className="h-4 w-4 text-purple-600" />
      default: return <FileText className="h-4 w-4" />
    }
  }
  
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return `${date.toLocaleDateString('ja-JP')} ${date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}`
  }

  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      backgroundColor: '#f3f4f6'
    }}>
      {/* Left Panel: Customer List + Filters + Stats (33%) */}
      <div style={{ 
        width: '33.333%', 
        borderRight: '1px solid #e5e7eb', 
        backgroundColor: 'white',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh'
      }}>
        {/* Fixed header with stats and filters */}
        <div style={{ flexShrink: 0, padding: '16px', backgroundColor: 'white', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, zIndex: 10 }}>
          {/* Personal Stats */}
          <Card className="mb-4">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
              <Target className="h-5 w-5" />
                <h3 className="font-semibold">{t('myGoal')} ({statCustomers.length}/{target})</h3>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4 mb-3">
                <div
                  className="bg-blue-600 h-4 rounded-full transition-all"
                  style={{ width: `${(target > 0 ? (statCustomers.length / target) * 100 : 0)}%` }}
                />
              </div>
              
                <div className="grid grid-cols-4 gap-2 text-xs">
                <div className="text-center">
                  <div className="font-bold">{statCustomers.filter(c => normalizeStatus(c.status) === '開始').length}</div>
                  <div className="text-gray-500">{t('start')}</div>
                </div>
                <div className="text-center">
                  <div className="font-bold">{statCustomers.filter(c => normalizeStatus(c.status) === '認知').length}</div>
                  <div className="text-gray-500">{t('awareness')}</div>
              </div>
                <div className="text-center">
                  <div className="font-bold">{statCustomers.filter(c => normalizeStatus(c.status) === '興味').length}</div>
                  <div className="text-gray-500">{t('interest')}</div>
            </div>
              <div className="text-center">
                  <div className="font-bold">{statCustomers.filter(c => normalizeStatus(c.status) === '欲求').length}</div>
                  <div className="text-gray-500">{t('desire')}</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-bold">{t('retargeting')}</h2>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => setShowAddForm(!showAddForm)}>+ {t('add')}</Button>
              </div>
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
            <div className="space-y-2">
              {/* Main Filter */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={mainFilter === 'inProgress' ? 'default' : 'outline'}
                  onClick={() => {
                    setMainFilter('inProgress')
                    setSubFilter('all')
                  }}
                >
                  {t('activeSales')}
                </Button>
                <Button
                  size="sm"
                  variant={mainFilter === 'trash' ? 'default' : 'outline'}
                  onClick={() => {
                    setMainFilter('trash')
                    setSubFilter('all')
                  }}
                >
                  {t('trash')}
                </Button>
              </div>
              
              {/* Sub Filter (only when inProgress is selected) */}
              {mainFilter === 'inProgress' && (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant={subFilter === 'all' ? 'default' : 'outline'} onClick={() => setSubFilter('all')}>
                    {t('all')}
                  </Button>
                  <Button size="sm" variant={subFilter === 'start' ? 'default' : 'outline'} onClick={() => setSubFilter('start')}>
                    {t('start')}
                  </Button>
                  <Button size="sm" variant={subFilter === 'awareness' ? 'default' : 'outline'} onClick={() => setSubFilter('awareness')}>
                    {t('awareness')}
                  </Button>
                  <Button size="sm" variant={subFilter === 'interest' ? 'default' : 'outline'} onClick={() => setSubFilter('interest')}>
                    {t('interest')}
                  </Button>
                  <Button size="sm" variant={subFilter === 'desire' ? 'default' : 'outline'} onClick={() => setSubFilter('desire')}>
                    {t('desire')}
                  </Button>
                  <span className="ml-auto text-sm font-semibold text-gray-700">
                    총 {filteredCustomers.length}건
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', paddingTop: 0 }}>
          {/* Add Customer Form */}
          {showAddForm && (
            <Card className="mb-4">
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3">{t('addRetargeting')}</h3>
                <div className="space-y-3">
                  <Input placeholder={`${t('companyName')} *`} id="new-companyName" />
                  <Input placeholder={`${t('industry')} *`} id="new-industry" />
                  <Input placeholder={`${t('customerName')} *`} id="new-customerName" />
                  <Input placeholder={`${t('phone')} *`} id="new-phone" />
                  <Input placeholder={t('region')} id="new-region" />
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
                  <div className="flex gap-2">
                    <Button onClick={handleAddCustomer} className="flex-1">{t('save')}</Button>
                    <Button variant="ghost" onClick={() => setShowAddForm(false)}>{t('cancel')}</Button>
                  </div>
              </div>
            </CardContent>
          </Card>
          )}
          
          {/* Customer List */}
          <div className="space-y-2">
          {filteredCustomers.map(customer => {
            const days = getDaysSinceLastContact(customer.lastContactDate)
            return (
              <div
                key={customer.id}
                onClick={() => setSelectedCustomer(customer)}
                className={`p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${getContactStatusColor(days)} ${
                  selectedCustomer?.id === customer.id ? 'bg-blue-50 border-blue-300' : ''
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{customer.companyName}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{t('manager')}: {customer.manager}</div>
                  </div>
                  {days !== null && (
                    <div className={`text-xs whitespace-nowrap px-2 py-1 rounded ${
                      days >= 30 ? 'bg-red-100 text-red-800' : 
                      days >= 14 ? 'bg-yellow-100 text-yellow-800' : 
                      'bg-green-100 text-green-800'
                    }`}>
                      {days}{t('daysAgo')}
                    </div>
                  )}
                  <div className={`text-xs px-2 py-1 rounded whitespace-nowrap ${getStatusBadgeClass(customer.status)}`}>
                    {normalizeStatus(customer.status)}
                  </div>
                </div>
              </div>
            )
          })}
          </div>
        </div>
      </div>
      
      {/* Center Panel: Customer Detail (33%) */}
      <div style={{ 
        width: '33.333%', 
        borderRight: '1px solid #e5e7eb', 
        backgroundColor: 'white',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh'
      }}>
        {selectedCustomer ? (
          <>
            {/* Fixed header */}
            <div style={{ flexShrink: 0, padding: '16px', backgroundColor: 'white', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, zIndex: 10 }}>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">{t('customerDetails')}</h2>
                <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
                  {t('save')}
                </Button>
              </div>
            </div>
            
            {/* Scrollable content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', paddingTop: 0 }}>
              <div className="space-y-4">
                {/* Basic Info */}
        <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3">{t('basicInfo')}</h3>
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
                      <div key={index} className="flex gap-2 mb-2">
                        <Input
                          value={phone}
                          onChange={e => updatePhoneNumber(index, e.target.value)}
                          placeholder={`${t('phone')} ${index + 1}`}
                        />
                        {phoneNumbers.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removePhoneNumber(index)}
                            className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                          >
                            -
                          </button>
                        )}
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
                    <input
                      type="text"
                      className="w-full border rounded px-3 py-2"
                      value={selectedCustomer.region || ''}
                      onChange={e => setSelectedCustomer({...selectedCustomer, region: e.target.value})}
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
                  <div>
                    <label className="text-sm text-gray-600">{t('contractHistory')}</label>
                    <select
                      className="w-full border rounded px-3 py-2"
                      value={selectedCustomer.contractHistoryCategory || ''}
                      onChange={e => setSelectedCustomer({...selectedCustomer, contractHistoryCategory: e.target.value})}
                    >
                      <option value="過去に契約">{t('contractHistoryContract')}</option>
                      <option value="過去に返信あり">{t('contractHistoryReply')}</option>
                      <option value="無料体験済み">{t('contractHistoryTrial')}</option>
                      <option value="休眠顧客">{t('contractHistorySleeping')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">{t('category')}</label>
                    <select
                      className="w-full border rounded px-3 py-2"
                      value={selectedCustomer.status}
                      onChange={e => setSelectedCustomer({...selectedCustomer, status: e.target.value as any})}
                    >
                      <option value="시작">{t('start')}</option>
                      <option value="인지">{t('awareness')}</option>
                      <option value="흥미">{t('interest')}</option>
                      <option value="욕망">{t('desire')}</option>
                      
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">{t('registrationDate')}</label>
                    <input
                      type="date"
                      className="w-full border rounded px-3 py-2"
                      value={(() => {
                        const date = selectedCustomer.registeredAt;
                        if (!date) return '';
                        if (typeof date === 'string') return date.split('T')[0];
                        return date;
                      })()}
                      onChange={e => setSelectedCustomer({...selectedCustomer, registeredAt: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">{t('lastContactDate')}</label>
                    <input
                      type="date"
                      className="w-full border rounded px-3 py-2"
                      value={(() => {
                        const date = selectedCustomer.lastContactDate;
                        if (!date) return '';
                        if (typeof date === 'string') return date.split('T')[0];
                        return date;
                      })()}
                      onChange={e => setSelectedCustomer({...selectedCustomer, lastContactDate: e.target.value})}
                    />
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
            
            {/* Actions */}
            <div className="flex gap-2">
              <Button onClick={handleSave} className="flex-1 bg-blue-600 hover:bg-blue-700">
                {t('save')}
              </Button>
              
              {/* trash 상태에 따른 버튼 표시 */}
              {(selectedCustomer.status === 'trash' || selectedCustomer.status === 'ゴミ箱') ? (
                <Button 
                  onClick={async () => {
                    if (!confirm('정말로 영업중으로 되돌리시겠습니까?')) return
                    
                    const updated = {...selectedCustomer, status: '開始' as const}
                    try {
                      await api.put(`/retargeting/${selectedCustomer.id}`, updated)
                      setSelectedCustomer(updated)
                      showToast('영업중으로 이동되었습니다', 'success')
                      fetchCustomers()
                    } catch (error: any) {
                      if (error.response?.status === 403) {
                        showToast('본인만 내용을 수정 가능합니다', 'error')
                      } else {
                        showToast(error.response?.data?.message || '이동 실패', 'error')
                      }
                    }
                  }}
                  className="bg-blue-600"
                >
                  {t('moveToActive')}
                </Button>
              ) : (
                <Button 
                  onClick={async () => {
                    if (!confirm(t('confirmMoveToTrash'))) return
                    
                    const updated = {...selectedCustomer, status: 'ゴミ箱' as const}
                    try {
                      await api.put(`/retargeting/${selectedCustomer.id}`, updated)
                      setSelectedCustomer(updated)
                      showToast('trash으로 이동되었습니다', 'success')
                      fetchCustomers()
                    } catch (error: any) {
                      if (error.response?.status === 403) {
                        showToast('본인만 내용을 수정 가능합니다', 'error')
                      } else {
                        showToast(error.response?.data?.message || '이동 실패', 'error')
                      }
                    }
                  }}
                  variant="destructive"
                >
                  {t('moveToTrash')}
                </Button>
              )}
                
                {normalizeStatus(selectedCustomer.status) !== 'ゴミ箱' && (
                  <Button onClick={() => setShowConvertModal(true)} className="bg-green-600">{t('convertToCustomer')}</Button>
                )}
              </div>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center text-gray-500 mt-20">
            {t('selectCustomer')}
          </div>
        )}
      </div>

      {/* Right Panel: Files + History (33%) */}
      <div style={{ 
        width: '33.333%', 
        backgroundColor: 'white',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh'
      }}>
        {selectedCustomer ? (
          <>
            {/* Fixed header */}
            <div style={{ flexShrink: 0, padding: '16px', backgroundColor: 'white', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, zIndex: 10 }}>
              <h2 className="text-xl font-bold">{t('history')}</h2>
            </div>
            
            {/* Scrollable content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', paddingTop: 0 }}>
              <div className="space-y-4">
                {/* History */}
        <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3">{t('history')}</h3>
                
                {/* History Tabs */}
                <div className="flex gap-2 mb-4">
                  <Button
                    size="sm"
                    variant={historyType === 'missed_call' ? 'default' : 'outline'}
                    onClick={() => setHistoryType('missed_call')}
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
            </CardContent>
          </Card>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center text-gray-500 mt-20">
            {t('selectCustomer')}
          </div>
        )}
      </div>

      {/* Convert Modal */}
      {showConvertModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="font-semibold text-lg mb-4">{t('contractInfoInput')}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-600">{t('contractAmount')}</label>
                <Input
                  type="text"
                  placeholder="1,000,000"
                  value={formatNumber(parseFormattedNumber(convertData.monthlyBudget || '0'))}
                  onChange={e => {
                    const parsed = parseFormattedNumber(e.target.value)
                    setConvertData({...convertData, monthlyBudget: parsed.toString()})
                  }}
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">{t('startDate')}</label>
                <input
                  type="date"
                  className="w-full border rounded px-3 py-2"
                  value={convertData.contractStartDate}
                  onChange={e => {
                    const startDate = e.target.value
                    // 시작일이 변경되면 자동으로 1개월 뒤를 만료일로 설정
                    let expirationDate = ''
                    if (startDate) {
                      const date = new Date(startDate)
                      date.setMonth(date.getMonth() + 1)
                      expirationDate = date.toISOString().split('T')[0]
                    }
                    setConvertData({...convertData, contractStartDate: startDate, contractExpirationDate: expirationDate})
                  }}
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">{t('endDate')}</label>
                <input
                  type="date"
                  className="w-full border rounded px-3 py-2"
                  value={convertData.contractExpirationDate}
                  onChange={e => setConvertData({...convertData, contractExpirationDate: e.target.value})}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleConvert} className="flex-1">{t('convertToCustomer')}</Button>
                <Button variant="ghost" onClick={() => setShowConvertModal(false)}>{t('cancel')}</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}