// Last Contact Date Filter: filters by last_contact_at field
// Pagination: Standard page-based navigation with totalCount from server
import { useState, useEffect, useRef, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { useAuthStore } from '../store/authStore'
import { useI18nStore } from '../i18n'
import { useToast } from '../components/ui/toast'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Plus, Edit, Trash2, X, BarChart3, Search, ArrowRight, UtensilsCrossed, MoreVertical, RefreshCw, Copy } from 'lucide-react'
import GlobalSearch from '../components/GlobalSearch'
import { getLocalToday, formatLocalDate } from '../utils/dateUtils'
import RestaurantDrawer from '../components/RestaurantDrawer'
import SalesTrackingDrawer from '../components/SalesTrackingDrawer'
import BulkHistoryModal from '../components/BulkHistoryModal'
import { getMarketerNames } from '../utils/userUtils'
import { DatePickerInput } from '../components/ui/date-picker-input'
import { MessageSquare } from 'lucide-react'

interface SalesTrackingRecord {
  id: string
  date: string
  occurred_at?: string
  manager_name: string
  company_name?: string
  account_id?: string
  industry?: string
  contact_method?: string
  status: string
  contact_person?: string
  phone?: string
  memo?: string
  memo_note?: string
  user_id: string
  created_at: string
  updated_at: string
  moved_to_retargeting?: boolean
  restaurant_id?: number // Reference to restaurants table for records from Recruit search
  last_contact_at?: string // Last contact timestamp
  latest_round?: number // 최신 연락 차수
}

const PAGE_SIZE = 100

interface MonthlyStats {
  manager: string
  phoneCount: number
  sendCount: number
  totalCount: number
  replyCount: number
  replyRate: string
  retargetingCount: number
  negotiationCount: number
  contractCount: number
}

export default function SalesTrackingPage() {
  const { t, language } = useI18nStore()
  const user = useAuthStore((state) => state.user)
  const { showToast } = useToast()
  const location = useLocation()
  const navigate = useNavigate()
  
  const [records, setRecords] = useState<SalesTrackingRecord[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showStatsModal, setShowStatsModal] = useState(false)
  const [showDailyStatsModal, setShowDailyStatsModal] = useState(false)
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([])
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [managerFilter, setManagerFilter] = useState<string>('all')
  const [managerOptions, setManagerOptions] = useState<string[]>([])
  const [, setUsers] = useState<any[]>([])
  // 새로운 필터 상태
  const [movedToRetargetingFilter, setMovedToRetargetingFilter] = useState<'all' | 'moved' | 'notMoved'>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [contactMethodFilter, setContactMethodFilter] = useState<string>('all')
  const [roundFilter, setRoundFilter] = useState<string>('all') // 차수 필터
  // Daily stats state
  const [dailyStart, setDailyStart] = useState<string>('')
  const [dailyEnd, setDailyEnd] = useState<string>('')
  const [dailyScope, setDailyScope] = useState<'overall' | 'by_manager'>('overall')
  const [dailyManager, setDailyManager] = useState<string>('all')
  const [dailyStats, setDailyStats] = useState<any[]>([])
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  const [highlightRecordId, setHighlightRecordId] = useState<string | null>(null)
  
  // 이전 검색 요청 취소용
  const abortControllerRef = useRef<AbortController | null>(null)
  const recordsRef = useRef<SalesTrackingRecord[]>([])
  const offsetRef = useRef<number>(0)
  const hasMoreRef = useRef<boolean>(false)
  
  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 100

  // 체크박스 및 일괄 메모 수정
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showBulkMemoForm, setShowBulkMemoForm] = useState(false)
  const [bulkMemo, setBulkMemo] = useState('')
  const [updatingBulkMemo, setUpdatingBulkMemo] = useState(false)
  
  // 리쿠르트 음식점 상세 보기
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<number | null>(null)

  // 영업 이력 상세 Drawer
  const [selectedRecord, setSelectedRecord] = useState<SalesTrackingRecord | null>(null)

  // 일괄 연락 기록 모달
  const [showBulkHistoryModal, setShowBulkHistoryModal] = useState(false)

  // 날짜 필터 상태 (날짜/시간 컬럼 필터)
  const [dateStartFilter, setDateStartFilter] = useState<string>('')
  const [dateEndFilter, setDateEndFilter] = useState<string>('')
  
  // 마지막 연락일 필터 상태
  const [filterStartDate, setFilterStartDate] = useState<string>('')
  const [filterEndDate, setFilterEndDate] = useState<string>('')

  // 액션 메뉴 상태
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null)
  const [actionMenuPosition, setActionMenuPosition] = useState<'top' | 'bottom'>('bottom')
  const [actionMenuCoords, setActionMenuCoords] = useState<{ top: number; left: number } | null>(null)

  // 마지막 연락 갱신 중인 레코드 ID
  const [updatingContactId, setUpdatingContactId] = useState<string | null>(null)
  
  // 갱신 확인 팝오버 상태
  const [confirmUpdateId, setConfirmUpdateId] = useState<string | null>(null)
  const [confirmPopoverPosition, setConfirmPopoverPosition] = useState<'top' | 'bottom'>('bottom')
  const [confirmPopoverCoords, setConfirmPopoverCoords] = useState<{ top: number; left: number } | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    date: getLocalToday(),
    managerName: user?.name || '',
    companyName: '',
    accountId: '',
    industry: '',
    contactMethod: '',
    status: '未返信',
    contactPerson: '',
    phone: '',
    memo: '',
    memoNote: ''
  })

  // 모든 직원 목록을 읽어 드롭다운에 표시 (마케터만)
  useEffect(() => {
    ;(async () => {
      try {
        const res = await api.get('/auth/users')
        const allUsers = res.data || []
        setUsers(allUsers)
        
        // 공통 유틸리티 함수 사용
        const marketerNames = getMarketerNames(allUsers)
        setManagerOptions(marketerNames)
        
        // 디폴트: 마케터는 본인, 그 외는 'all'
        if (user?.role === 'marketer' && user?.name) {
          setManagerFilter(user.name)
        } else {
          setManagerFilter('all')
        }
      } catch (e) {
        console.error('Failed to load users for manager filter', e)
      }
    })()
  }, [user])

  // 최신 상태를 ref로 유지 (비동기 로직에서 사용)
  useEffect(() => {
    recordsRef.current = records
  }, [records])

  useEffect(() => {
    offsetRef.current = offset
  }, [offset])

  useEffect(() => {
    hasMoreRef.current = hasMore
  }, [hasMore])

  const fetchRecords = useCallback(async (pageNumber: number, signal?: AbortSignal) => {
    setLoading(true)

    try {
      const pageOffset = (pageNumber - 1) * PAGE_SIZE
      const params: any = { 
        limit: PAGE_SIZE,
        offset: pageOffset
      }
      if (searchQuery.trim()) {
        params.search = searchQuery.trim()
      }
      // 날짜/시간(date) 필터
      if (dateStartFilter) {
        params.startDate = dateStartFilter
      }
      if (dateEndFilter) {
        params.endDate = dateEndFilter
      }
      // 마지막 연락일 기준 필터
      if (filterStartDate) {
        params.lastContactStartDate = filterStartDate
      }
      if (filterEndDate) {
        params.lastContactEndDate = filterEndDate
      }
      // 서버 사이드 필터 파라미터 추가
      if (managerFilter && managerFilter !== 'all') {
        params.manager = managerFilter
      }
      if (statusFilter && statusFilter !== 'all') {
        params.status = statusFilter
      }
      if (contactMethodFilter && contactMethodFilter !== 'all') {
        params.contactMethod = contactMethodFilter
      }
      if (movedToRetargetingFilter && movedToRetargetingFilter !== 'all') {
        params.movedToRetargeting = movedToRetargetingFilter
      }
      if (roundFilter && roundFilter !== 'all') {
        params.round = roundFilter
      }
      const config: any = { params }
      if (signal) {
        config.signal = signal
      }
      const response = await api.get('/sales-tracking', config)
      const rows = response.data?.rows ?? response.data ?? []
      const hasMoreData = response.data?.hasMore ?? (rows.length === PAGE_SIZE)
      const serverTotalCount = response.data?.totalCount ?? 0
      
      // 페이지별 데이터 교체 (누적하지 않음)
      recordsRef.current = rows
      setRecords(rows)

      offsetRef.current = pageOffset + rows.length
      setOffset(pageOffset + rows.length)

      hasMoreRef.current = hasMoreData
      setHasMore(hasMoreData)
      setTotalCount(serverTotalCount)
      setCurrentPage(pageNumber)
      
      // 페이지 이동 시 상단으로 스크롤
      window.scrollTo(0, 0)
    } catch (error: any) {
      if (error?.name === 'AbortError' || error?.code === 'ERR_CANCELED') {
        console.log('Previous fetch request cancelled')
        return
      }
      console.error('Failed to fetch records:', error)
      const errorMessage = error?.response?.data?.message || error?.message || t('error')
      showToast(errorMessage, 'error')
      setRecords([])
    } finally {
      setLoading(false)
    }
  }, [searchQuery, dateStartFilter, dateEndFilter, filterStartDate, filterEndDate, managerFilter, statusFilter, contactMethodFilter, movedToRetargetingFilter, roundFilter, showToast, t])

  useEffect(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    const controller = new AbortController()
    abortControllerRef.current = controller
    fetchRecords(1, controller.signal)
    return () => {
      controller.abort()
    }
  }, [fetchRecords])

  // 통합검색에서 선택한 레코드 처리:
  // - 목록에 아직 없는 경우 자동으로 추가 로딩을 진행해 찾는다
  // - 필터로 인해 안 보이는 문제를 줄이기 위해 기본 필터는 전체로 되돌린다
  useEffect(() => {
    const state = location.state as { selectedId?: string; searchQuery?: string } | null
    if (!state?.selectedId) return

    let cancelled = false

    ;(async () => {
      try {
        // 통합검색에서 넘어온 검색어가 있으면 먼저 반영
        if (state.searchQuery) {
          setSearchQuery(state.searchQuery)
        }

        // 다른 담당자/상태/방법 필터 때문에 안 보이는 문제를 방지
        setManagerFilter('all')
        setMovedToRetargetingFilter('all')
        setStatusFilter('all')
        setContactMethodFilter('all')

        const targetId = state.selectedId

        // 검색 후 레코드를 찾아서 하이라이트
        // 잠시 대기하여 데이터 로드가 완료되도록 함
        await new Promise(resolve => setTimeout(resolve, 500))
        if (cancelled) return

        const found = recordsRef.current.find(r => r.id === targetId)
        if (found) {
          setHighlightRecordId(found.id)

          // 레코드로 스크롤
          setTimeout(() => {
            const element = document.getElementById(`sales-tracking-record-${found.id}`)
            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }
          }, 300)
        }

        // state 초기화 (뒤로가기 시 다시 선택되지 않도록)
        navigate(location.pathname, { replace: true, state: {} })
      } catch (e) {
        console.error('Failed to handle global search selection', e)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [location.state, navigate, location.pathname, itemsPerPage, fetchRecords])

  const goToPage = useCallback(
    (page: number) => {
      const nextPage = Math.max(1, page)
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      const controller = new AbortController()
      abortControllerRef.current = controller
      fetchRecords(nextPage, controller.signal)
    },
    [fetchRecords]
  )

  // Daily stats
  const openDailyStats = () => {
    // default: last 2 weeks (14 days inclusive)
    const end = new Date()
    const start = new Date(end)
    start.setDate(end.getDate() - 13)
    const startStr = formatLocalDate(start)
    const endStr = formatLocalDate(end)
    setDailyStart(startStr)
    setDailyEnd(endStr)
    const userName = user?.name || ''
    const marketerNames = new Set(managerOptions)
    const defaultManager = (user?.role === 'marketer' && userName && marketerNames.has(userName)) ? userName : 'all'
    setDailyManager(defaultManager)
    const initialScope: 'overall'|'by_manager' = defaultManager === 'all' ? 'overall' : 'by_manager'
    setDailyScope(initialScope)
    setShowDailyStatsModal(true)
    fetchDailyStats(startStr, endStr, initialScope, defaultManager)
  }

  const fetchDailyStats = async (startDate: string, endDate: string, scope: 'overall'|'by_manager', manager: string) => {
    try {
      const params: any = { startDate, endDate, scope }
      if (scope === 'by_manager' && manager && manager !== 'all') params.manager = manager
      const response = await api.get('/sales-tracking/stats/daily', { params })
      const rows = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.rows)
          ? response.data.rows
          : []
      setDailyStats(rows)
    } catch (e) {
      console.error('Failed to fetch daily stats', e)
      setDailyStats([])
    }
  }

  // Keep scope in sync with manager selection
  useEffect(() => {
    setDailyScope(dailyManager === 'all' ? 'overall' : 'by_manager')
  }, [dailyManager])

  // Fetch when params change while modal open
  useEffect(() => {
    if (!showDailyStatsModal) return
    const scope = dailyManager === 'all' ? 'overall' : 'by_manager'
    fetchDailyStats(dailyStart, dailyEnd, scope, dailyManager)
  }, [showDailyStatsModal, dailyStart, dailyEnd, dailyManager])

  const handleAdd = async () => {
    try {
      await api.post('/sales-tracking', formData)
      showToast(t('saved'), 'success')
      setShowAddForm(false)
      resetForm()
      fetchRecords(currentPage)
    } catch (error: any) {
      console.error('Failed to add record:', error)
      showToast(error.response?.data?.message || t('addFailed'), 'error')
    }
  }

  const handleUpdate = async (id: string) => {
    try {
      await api.put(`/sales-tracking/${id}`, formData)
      showToast(t('updated'), 'success')
      setEditingId(null)
      resetForm()
      fetchRecords(currentPage)
    } catch (error: any) {
      console.error('Failed to update record:', error)
      showToast(error.response?.data?.message || t('updateFailed'), 'error')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t('confirmDelete'))) return

    try {
      await api.delete(`/sales-tracking/${id}`)
      showToast(t('deleted'), 'success')
      fetchRecords(currentPage)
    } catch (error: any) {
      console.error('Failed to delete record:', error)
      showToast(error.response?.data?.message || t('deleteFailed'), 'error')
    }
  }

  const handleMoveToRetargeting = async (record: SalesTrackingRecord) => {
    if (!confirm(t('moveToRetargeting') + '?')) return

    try {
      await api.post(`/sales-tracking/${record.id}/move-to-retargeting`)
      showToast(t('movedToRetargeting'), 'success')
      fetchRecords(currentPage)
    } catch (error: any) {
      if (error.response?.status === 403) {
        showToast(t('onlyOwnerCanModify'), 'error')
      } else {
        showToast(error.response?.data?.message || t('moveToRetargetingFailed'), 'error')
      }
    }
  }

  // 마지막 연락 시간 갱신
  const handleUpdateContact = async (recordId: string) => {
    setUpdatingContactId(recordId)
    try {
      const response = await api.patch(`/sales-tracking/${recordId}/contact`)
      if (response.data.success) {
        // 로컬 상태 업데이트
        setRecords(prev => prev.map(r => 
          r.id === recordId 
            ? { ...r, last_contact_at: response.data.last_contact_at }
            : r
        ))
        recordsRef.current = recordsRef.current.map(r => 
          r.id === recordId 
            ? { ...r, last_contact_at: response.data.last_contact_at }
            : r
        )
        setHighlightRecordId(recordId)
        showToast(t('contactUpdated'), 'success')
      }
    } catch (error: any) {
      console.error('Failed to update last contact:', error)
      showToast(error.response?.data?.message || t('contactUpdateFailed'), 'error')
    } finally {
      setUpdatingContactId(null)
    }
  }

  // 마지막 연락 시간 초기화
  const handleResetLastContact = async (recordId: string) => {
    try {
      await api.delete(`/sales-tracking/${recordId}/contact`)
      // 로컬 상태 업데이트
      setRecords(prev => prev.map(r => 
        r.id === recordId 
          ? { ...r, last_contact_at: undefined }
          : r
      ))
      recordsRef.current = recordsRef.current.map(r => 
        r.id === recordId 
          ? { ...r, last_contact_at: undefined }
          : r
      )
      showToast(t('lastContactReset'), 'success')
    } catch (error: any) {
      console.error('Failed to reset last contact:', error)
      showToast(error.response?.data?.message || t('lastContactResetFailed'), 'error')
    }
  }

  // 마지막 연락 날짜 포맷 (항상 날짜만 표시)
  const formatLastContact = (lastContactAt?: string) => {
    if (!lastContactAt) return '-'
    const contactDate = new Date(lastContactAt)
    return contactDate.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' })
  }

  // 체크박스 토글
  const toggleSelectRecord = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // 전체 선택/해제 (현재 페이지의 본인 담당 항목만)
  const toggleSelectAll = () => {
    const myRecords = paginatedRecords.filter(r => r.user_id === user?.id)
    const myIds = myRecords.map(r => r.id)
    const allSelected = myIds.every(id => selectedIds.has(id))
    
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (allSelected) {
        myIds.forEach(id => next.delete(id))
      } else {
        myIds.forEach(id => next.add(id))
      }
      return next
    })
  }

  // 일괄 메모 수정
  const handleBulkMemoUpdate = async () => {
    if (selectedIds.size === 0) return
    if (!bulkMemo.trim()) {
      alert(t('enterMemo'))
      return
    }

    setUpdatingBulkMemo(true)
    try {
      await api.put('/sales-tracking/bulk-memo', {
        ids: Array.from(selectedIds),
        memo: bulkMemo.trim()
      })
      
      showToast(`${selectedIds.size}${t('bulkMemoUpdated')}`, 'success')
      setSelectedIds(new Set())
      setBulkMemo('')
      setShowBulkMemoForm(false)
      fetchRecords(currentPage)
    } catch (error: any) {
      showToast(error.response?.data?.message || t('bulkMemoUpdateFailed'), 'error')
    } finally {
      setUpdatingBulkMemo(false)
    }
  }

  // 일괄 리타겟팅 이동
  const handleBulkMoveToRetargeting = async () => {
    if (selectedIds.size === 0) return
    
    if (!confirm(`${t('selected')} ${selectedIds.size}${t('confirmBulkMoveToRetargeting')}`)) {
      return
    }

    try {
      await api.post('/sales-tracking/bulk-move-to-retargeting', {
        ids: Array.from(selectedIds)
      })
      
      showToast(`${selectedIds.size}${t('bulkMovedToRetargeting')}`, 'success')
      setSelectedIds(new Set())
      fetchRecords(currentPage)
    } catch (error: any) {
      showToast(error.response?.data?.message || t('bulkMoveToRetargetingFailed'), 'error')
    }
  }

  const resetForm = () => {
    setFormData({
      date: getLocalToday(),
      managerName: user?.name || '',
      companyName: '',
      accountId: '',
      industry: '',
      contactMethod: '',
      status: '未返信',
      contactPerson: '',
      phone: '',
      memo: '',
      memoNote: '' // DB에는 저장되지만 UI에서는 제거
    })
  }

  const startEdit = (record: SalesTrackingRecord) => {
    // Check if user can edit (moved_to_retargeting인 경우에도 status는 수정 가능)
    if (user?.role !== 'admin' && record.user_id !== user?.id) {
      showToast(t('onlyOwnerCanModify'), 'error')
      return
    }
    
    setEditingId(record.id)
    setFormData({
      date: record.date,
      managerName: record.manager_name,
      companyName: record.company_name || '',
      accountId: record.account_id || '',
      industry: record.industry || '',
      contactMethod: record.contact_method || '',
      status: record.status,
      contactPerson: record.contact_person || '',
      phone: record.phone || '',
      memo: record.memo || '',
      memoNote: record.memo_note || ''
    })
    setShowAddForm(true)
    
    // 수정 폼으로 자동 스크롤
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 100)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setShowAddForm(false)
    resetForm()
  }

  // 전월/당월/내월 핸들러
  const handlePreviousMonth = () => {
    // const now = new Date()
    // const currentYear = now.getFullYear()
    // const currentMonth = now.getMonth() // 0-11
    
    // 현재 선택된 월에서 한 달 빼기
    let newYear = selectedYear
    let newMonth = selectedMonth - 1
    
    if (newMonth < 1) {
      newMonth = 12
      newYear = selectedYear - 1
    }
    
    setSelectedYear(newYear)
    setSelectedMonth(newMonth)
    fetchMonthlyStats(newYear, newMonth)
  }

  const handleCurrentMonth = () => {
    const now = new Date()
    const newYear = now.getFullYear()
    const newMonth = now.getMonth() + 1
    
    setSelectedYear(newYear)
    setSelectedMonth(newMonth)
    fetchMonthlyStats(newYear, newMonth)
  }

  const handleNextMonth = () => {
    // 현재 선택된 월에서 한 달 더하기
    let newYear = selectedYear
    let newMonth = selectedMonth + 1
    
    if (newMonth > 12) {
      newMonth = 1
      newYear = selectedYear + 1
    }
    
    setSelectedYear(newYear)
    setSelectedMonth(newMonth)
    fetchMonthlyStats(newYear, newMonth)
  }

  const fetchMonthlyStats = async (year?: number, month?: number) => {
    try {
      // 현재 상태에서 년도/월 가져오기
      const now = new Date()
      const currentYear = now.getFullYear()
      const currentMonth = now.getMonth() + 1
      
      // 파라미터가 제공되면 사용, 없으면 현재 상태 사용, 그것도 없으면 현재 날짜 사용
      let finalYear: number
      let finalMonth: number
      
      if (year !== undefined && year !== null && !isNaN(year)) {
        finalYear = Number(year)
      } else if (selectedYear !== undefined && selectedYear !== null && !isNaN(selectedYear)) {
        finalYear = Number(selectedYear)
      } else {
        finalYear = currentYear
      }
      
      if (month !== undefined && month !== null && !isNaN(month)) {
        finalMonth = Number(month)
      } else if (selectedMonth !== undefined && selectedMonth !== null && !isNaN(selectedMonth)) {
        finalMonth = Number(selectedMonth)
      } else {
        finalMonth = currentMonth
      }
      
      // 유효성 검사
      if (isNaN(finalYear) || isNaN(finalMonth) || finalYear < 2000 || finalYear > 3000 || finalMonth < 1 || finalMonth > 12) {
        console.error('Invalid year or month:', { finalYear, finalMonth, selectedYear, selectedMonth, year, month })
        showToast(t('error'), 'error')
        return
      }
      
      // 상태 업데이트 (제공된 값이 있는 경우)
      if (year !== undefined && !isNaN(year)) setSelectedYear(Number(year))
      if (month !== undefined && !isNaN(month)) setSelectedMonth(Number(month))
      
      const response = await api.get('/sales-tracking/stats/monthly', {
        params: { year: finalYear, month: finalMonth }
      })

      // 응답 구조: { stats: [...] } 또는 배열 직접
      const statsData = response.data?.stats || (Array.isArray(response.data) ? response.data : [])
      setMonthlyStats(Array.isArray(statsData) ? statsData : [])
      setShowStatsModal(true)
    } catch (error: any) {
      console.error('Failed to fetch stats:', error)
      const errorMessage = error.response?.data?.message || error.message || t('error')
      showToast(errorMessage, 'error')
    }
  }

  const canEdit = (record: SalesTrackingRecord) => {
    return user?.role === 'admin' || record.user_id === user?.id
  }

  // 날짜 포맷 함수 (YYYY-MM-DD)
  const trimDateTime = (value: string) => {
    const normalized = value.replace('T', ' ').replace('Z', '').trim()
    if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
      return `${normalized} 00:00`
    }
    // 초 단위 제거: HH:MM:SS -> HH:MM
    return normalized.length >= 16 ? normalized.slice(0, 16) : normalized
  }

  const formatDateTime = (dateValue?: string, occurredValue?: string) => {
    const normalizedOccurred = occurredValue
      ? occurredValue.replace('T', ' ').replace('Z', '').trim()
      : ''
    const normalizedDate = dateValue
      ? dateValue.replace('T', ' ').replace('Z', '').trim()
      : ''

    const occurredDatePart = normalizedOccurred ? normalizedOccurred.slice(0, 10) : ''
    const datePart = normalizedDate ? normalizedDate.slice(0, 10) : ''

    if (normalizedOccurred && datePart && occurredDatePart === datePart) {
      return trimDateTime(normalizedOccurred)
    }

    if (normalizedDate) {
      return trimDateTime(normalizedDate)
    }

    if (normalizedOccurred) {
      return trimDateTime(normalizedOccurred)
    }

    return '-'
  }

  // Translate option labels for table display while keeping DB values as-is
  const translateIndustryLabel = (value?: string) => {
    if (!value) return '-'
    switch (value) {
      case '飲食店': return t('industryRestaurant')
      case '娯楽/観光/レジャー': return t('industryEntertainment')
      case '美容サロン': return t('industryBeautySalon')
      case '有形商材': return t('industryTangible')
      case '個人利用': return t('industryPersonal')
      case '無形商材': return t('industryIntangible')
      case '代理店': return t('industryAgency')
      case '教育': return t('industryEducation')
      case 'その他': return t('industryOther')
      case 'アートメイク': return t('industryArtMake')
      default: return value
    }
  }

  const translateContactMethodLabel = (value?: string) => {
    if (!value) return '-'
    switch (value) {
      case '電話': return t('contactPhone')
      case 'LINE': return t('contactLINE')
      case 'DM': return t('contactDM')
      case 'メール': return t('contactMail')
      case 'フォーム': return t('contactForm')
      default: return value
    }
  }

  const translateStatusLabel = (value?: string) => {
    if (!value) return '-'
    switch (value) {
      case '未返信': return t('statusNoReply')
      case '返信済み': return t('statusReplied')
      case '商談中': return t('statusNegotiating')
      case '契約': return t('statusContract')
      default: return value
    }
  }

  // 서버에서 필터링된 데이터를 그대로 사용 (클라이언트 필터링 불필요)
  const filteredRecords = records
  
  // 페이지네이션 계산 - 서버의 totalCount 기반
  const uiTotalPages = Math.ceil(totalCount / itemsPerPage) || 1
  const totalCountLabel = `${totalCount}`
  // 표시 범위 계산
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = Math.min(currentPage * itemsPerPage, totalCount)
  // 현재 페이지 데이터에 클라이언트 필터 적용 (이미 서버에서 페이지별로 받아옴)
  const paginatedRecords = filteredRecords

  // 필터 변경 시 1페이지로 이동 (클라이언트 사이드 필터는 현재 페이지 데이터에만 적용됨)
  // 참고: managerFilter 등은 클라이언트 필터이므로 totalCount에 반영되지 않음

  useEffect(() => {
    if (!highlightRecordId) return
    const timeoutId = setTimeout(() => setHighlightRecordId(null), 2000)
    return () => clearTimeout(timeoutId)
  }, [highlightRecordId])

  // ESC 키로 모달 닫기
  useEffect(() => {
    if (!showAddForm) return
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cancelEdit()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [showAddForm])

  // 팝오버 외부 클릭 또는 ESC로 닫기
  useEffect(() => {
    if (!confirmUpdateId) return
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-popover-container]')) {
        setConfirmUpdateId(null)
      }
    }
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setConfirmUpdateId(null)
    }
    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('keydown', handleEsc)
    }
  }, [confirmUpdateId])

  return (
    <div className="min-h-screen bg-gray-100 p-6 pt-8 space-y-6">
      {/* Global Search - 통합 검색 */}
      <Card className="bg-white -mt-2">
        <CardContent className="p-4">
          <h2 className="text-lg font-semibold mb-2">{t('globalSearch')}</h2>
          <GlobalSearch />
        </CardContent>
      </Card>

      <Card className="bg-white">
        <CardContent className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-lg font-semibold">{t('salesTracking')}</h1>
        <div className="flex gap-2">
          <Button 
            onClick={openDailyStats}
            variant="outline"
            className="bg-green-50 hover:bg-green-100 text-green-700 border-green-300 font-medium"
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            {t('dailyStats')}
          </Button>
          <Button 
            onClick={() => fetchMonthlyStats()} 
            variant="outline"
            className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-300 font-medium"
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            {t('monthlyStats')}
          </Button>
          <Button 
            onClick={() => {
              setEditingId(null)
              setShowAddForm(true)
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('add')}
          </Button>
        </div>
      </div>

      {/* 필터 섹션 - 가로 배치 */}
      <div className="mb-4 flex flex-wrap items-end gap-4">
        {/* 담당자 필터 */}
        <div>
          <label className="text-sm text-gray-600 mb-2 block">{t('manager')}</label>
          <select
            className="border rounded px-3 py-2 min-w-[150px]"
            value={managerFilter}
            onChange={e => {
              setManagerFilter(e.target.value)
              setCurrentPage(1)
            }}
          >
            <option value="all">{t('all')}</option>
            {managerOptions.map(manager => (
              <option key={manager} value={manager}>{manager}</option>
            ))}
          </select>
        </div>

        {/* 리타겟팅 이동 여부 필터 */}
        <div>
          <label className="text-sm text-gray-600 mb-2 block">{t('moveToRetargeting')}</label>
          <select
            className="border rounded px-3 py-2 min-w-[120px]"
            value={movedToRetargetingFilter}
            onChange={e => {
              setMovedToRetargetingFilter(e.target.value as 'all' | 'moved' | 'notMoved')
              setCurrentPage(1)
            }}
          >
            <option value="all">{t('all')}</option>
            <option value="moved">{t('retargetingMoved')}</option>
            <option value="notMoved">{t('retargetingNotMoved')}</option>
          </select>
        </div>

        {/* 영업방법 필터 */}
        <div>
          <label className="text-sm text-gray-600 mb-2 block">{t('contactMethod')}</label>
          <select
            className="border rounded px-3 py-2 min-w-[100px]"
            value={contactMethodFilter}
            onChange={e => {
              setContactMethodFilter(e.target.value)
              setCurrentPage(1)
            }}
          >
            <option value="all">{t('all')}</option>
            <option value="電話">{t('contactPhone')}</option>
            <option value="LINE">{t('contactLINE')}</option>
            <option value="DM">{t('contactDM')}</option>
            <option value="メール">{t('contactMail')}</option>
            <option value="フォーム">{t('contactForm')}</option>
            <option value="none">{t('contactNone')}</option>
          </select>
        </div>

        {/* 진행현황 필터 */}
        <div>
          <label className="text-sm text-gray-600 mb-2 block">{t('status')}</label>
          <select
            className="border rounded px-3 py-2 min-w-[120px]"
            value={statusFilter}
            onChange={e => {
              setStatusFilter(e.target.value)
              setCurrentPage(1)
            }}
          >
            <option value="all">{t('all')}</option>
            <option value="未返信">{t('statusNoReply')}</option>
            <option value="返信済み">{t('statusReplied')}</option>
            <option value="商談中">{t('statusNegotiating')}</option>
            <option value="契約">{t('statusContract')}</option>
          </select>
        </div>

        {/* 차수 필터 */}
        <div>
          <label className="text-sm text-gray-600 mb-2 block">{language === 'ja' ? '連絡回数' : '차수'}</label>
          <select
            className="border rounded px-3 py-2 min-w-[80px]"
            value={roundFilter}
            onChange={e => {
              setRoundFilter(e.target.value)
              setCurrentPage(1)
            }}
          >
            <option value="all">{t('all')}</option>
            <option value="0">{language === 'ja' ? '未連絡' : '미연락'}</option>
            <option value="1">1{language === 'ja' ? '次' : '차'}</option>
            <option value="2">2{language === 'ja' ? '次' : '차'}</option>
            <option value="3">3{language === 'ja' ? '次' : '차'}</option>
            <option value="4">4{language === 'ja' ? '次' : '차'}</option>
            <option value="5">5{language === 'ja' ? '次以上' : '차 이상'}</option>
          </select>
        </div>

        {/* 날짜/시간 필터 */}
        <div className="flex items-end gap-2">
          <div>
            <label className="text-sm text-gray-600 mb-2 block">{language === 'ja' ? '日付/時間' : '날짜/시간'}</label>
            <div className="flex items-center gap-2">
              <DatePickerInput
                value={dateStartFilter}
                onChange={(value) => {
                  setDateStartFilter(value)
                  setCurrentPage(1)
                }}
                className="w-[120px]"
                popperPlacement="top-start"
              />
              <span className="text-gray-400">~</span>
              <DatePickerInput
                value={dateEndFilter}
                onChange={(value) => {
                  setDateEndFilter(value)
                  setCurrentPage(1)
                }}
                className="w-[120px]"
                popperPlacement="top-start"
              />
            </div>
          </div>
          {(dateStartFilter || dateEndFilter) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDateStartFilter('')
                setDateEndFilter('')
                setCurrentPage(1)
              }}
              className="h-8 px-2 text-gray-500 hover:text-gray-700"
              title={t('clearFilter')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* 마지막 연락일 필터 */}
        <div className="flex items-end gap-2">
          <div>
            <label className="text-sm text-gray-600 mb-2 block">{t('lastContactFilter')}</label>
            <div className="flex items-center gap-2">
              <DatePickerInput
                value={filterStartDate}
                onChange={(value) => {
                  setFilterStartDate(value)
                  setCurrentPage(1)
                }}
                className="w-[120px]"
                popperPlacement="top-start"
              />
              <span className="text-gray-400">~</span>
              <DatePickerInput
                value={filterEndDate}
                onChange={(value) => {
                  setFilterEndDate(value)
                  setCurrentPage(1)
                }}
                className="w-[120px]"
                popperPlacement="top-start"
              />
            </div>
          </div>
          {(filterStartDate || filterEndDate) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilterStartDate('')
                setFilterEndDate('')
                setCurrentPage(1)
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              {t('clearDateFilter')}
            </Button>
          )}
        </div>
      </div>

      {/* 검색 및 페이지네이션 */}
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder={t('search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        {filteredRecords.length > 0 && uiTotalPages > 1 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void goToPage(currentPage - 1)
              }}
              disabled={currentPage === 1}
            >
              {t('previous')}
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, uiTotalPages) }, (_, i) => {
                let pageNum
                if (uiTotalPages <= 5) {
                  pageNum = i + 1
                } else if (currentPage <= 3) {
                  pageNum = i + 1
                } else if (currentPage >= uiTotalPages - 2) {
                  pageNum = uiTotalPages - 4 + i
                } else {
                  pageNum = currentPage - 2 + i
                }
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      void goToPage(pageNum)
                    }}
                  >
                    {pageNum}
                  </Button>
                )
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void goToPage(currentPage + 1)
              }}
              disabled={currentPage >= uiTotalPages}
            >
              {t('next')}
            </Button>
          </div>
        )}
      </div>

      {/* 일괄 작업 */}
      {selectedIds.size > 0 && (
        <Card className="mb-4 border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-blue-900">
                  {selectedIds.size}{t('cases')} {t('selected')}
                </span>
                {!showBulkMemoForm && (
                  <>
                    <Button 
                      size="sm" 
                      variant="default"
                      className="bg-blue-600 hover:bg-blue-700 flex items-center gap-1"
                      onClick={() => setShowBulkHistoryModal(true)}
                    >
                      <MessageSquare className="h-3 w-3" />
                      {language === 'ja' ? '一括連絡記録' : '일괄 연락 기록'}
                    </Button>
                    <Button size="sm" onClick={() => setShowBulkMemoForm(true)}>
                      {t('bulkMemoChange')}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="default"
                      className="bg-orange-500 hover:bg-orange-600"
                      onClick={handleBulkMoveToRetargeting}
                    >
                      {t('moveToRetargeting')}
                    </Button>
                  </>
                )}
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => setSelectedIds(new Set())}
                >
                  {t('deselectAll')}
                </Button>
              </div>
              {showBulkMemoForm && (
                <div className="flex items-center gap-2 flex-1 max-w-xl">
                  <Input
                    value={bulkMemo}
                    onChange={(e) => setBulkMemo(e.target.value)}
                    placeholder={t('enterNewMemo')}
                    disabled={updatingBulkMemo}
                  />
                  <Button
                    size="sm"
                    onClick={handleBulkMemoUpdate}
                    disabled={updatingBulkMemo || !bulkMemo.trim()}
                  >
                    {updatingBulkMemo ? t('saving') : t('save')}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setShowBulkMemoForm(false)
                      setBulkMemo('')
                    }}
                    disabled={updatingBulkMemo}
                  >
                    {t('cancel')}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Dimmed Background */}
          <div 
            className="absolute inset-0 bg-black bg-opacity-50" 
            onClick={cancelEdit}
          />
          
          {/* Modal Content */}
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingId ? t('edit') : t('addSalesHistory')}
              </h2>
              <button
                onClick={cancelEdit}
                className="p-1 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            
            {/* Body */}
            <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-140px)]">
            {/* 리타겟팅으로 이동된 항목인지 확인 */}
            {editingId && records.find(r => r.id === editingId)?.moved_to_retargeting && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-300 rounded-lg">
                <p className="text-sm text-yellow-800">
                  {t('movedToRetargeting')} - {t('movedToRetargetingEditOnlyStatus')}
                </p>
              </div>
            )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 날짜 */}
              <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    {t('date')}
                  </label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  disabled={!!(editingId && records.find(r => r.id === editingId)?.moved_to_retargeting)}
                    className="w-full"
                />
              </div>
                
                {/* 담당자명 */}
              <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    {t('managerName')}
                  </label>
                <select
                  value={formData.managerName}
                  onChange={(e) => setFormData({ ...formData, managerName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={!!(editingId && records.find(r => r.id === editingId)?.moved_to_retargeting)}
                >
                  <option value="">{t('selectManager')}</option>
                  {managerOptions.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
                
                {/* 상호 */}
              <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    {t('companyName')} <span className="text-red-500">*</span>
                  </label>
                <Input
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  disabled={!!(editingId && records.find(r => r.id === editingId)?.moved_to_retargeting)}
                    className="w-full"
                    placeholder={t('companyName')}
                />
              </div>
                
                {/* 계정 ID */}
              <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    {t('accountId')}
                  </label>
                <Input
                  value={formData.accountId}
                  onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                  disabled={!!(editingId && records.find(r => r.id === editingId)?.moved_to_retargeting)}
                    className="w-full"
                    placeholder={t('accountId')}
                />
              </div>
                
                {/* 업종 */}
              <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    {t('industry')}
                  </label>
                <select
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={!!(editingId && records.find(r => r.id === editingId)?.moved_to_retargeting)}
                >
                  <option value="">-</option>
                  <option value="飲食店">{t('industryRestaurant')}</option>
                  <option value="娯楽/観光/レジャー">{t('industryEntertainment')}</option>
                  <option value="美容サロン">{t('industryBeautySalon')}</option>
                  <option value="有形商材">{t('industryTangible')}</option>
                  <option value="個人利用">{t('industryPersonal')}</option>
                  <option value="無形商材">{t('industryIntangible')}</option>
                  <option value="代理店">{t('industryAgency')}</option>
                  <option value="教育">{t('industryEducation')}</option>
                  <option value="その他">{t('industryOther')}</option>
                  <option value="アートメイク">{t('industryArtMake')}</option>
                </select>
              </div>
                
                {/* 영업 방법 */}
              <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    {t('contactMethod')} <span className="text-red-500">*</span>
                  </label>
                <select
                  value={formData.contactMethod}
                  onChange={(e) => setFormData({ ...formData, contactMethod: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={!!(editingId && records.find(r => r.id === editingId)?.moved_to_retargeting)}
                >
                  <option value="">-</option>
                  <option value="電話">{t('contactPhone')}</option>
                  <option value="LINE">{t('contactLINE')}</option>
                  <option value="DM">{t('contactDM')}</option>
                  <option value="メール">{t('contactMail')}</option>
                  <option value="フォーム">{t('contactForm')}</option>
                </select>
              </div>
                
                {/* 진행 현황 */}
              <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    {t('status')}
                  </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="未返信">{t('statusNoReply')}</option>
                  <option value="返信済み">{t('statusReplied')}</option>
                  <option value="商談中">{t('statusNegotiating')}</option>
                  <option value="契約">{t('statusContract')}</option>
                </select>
              </div>
                
                {/* 전화번호 */}
              <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    {t('phone')}
                  </label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  disabled={!!(editingId && records.find(r => r.id === editingId)?.moved_to_retargeting)}
                    className="w-full"
                    placeholder={t('phone')}
                />
              </div>
                
                {/* 메모 - 전체 너비 */}
              <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    {t('memo')}
                  </label>
                  <textarea
                  value={formData.memo}
                  onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
                  disabled={!!(editingId && records.find(r => r.id === editingId)?.moved_to_retargeting)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={3}
                    placeholder={t('memo')}
                />
              </div>
            </div>
            </div>
            
            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50">
              <Button 
                variant="outline" 
                onClick={cancelEdit}
                className="px-4"
              >
                {t('cancel')}
              </Button>
              <Button 
                onClick={editingId ? () => handleUpdate(editingId) : handleAdd}
                className="px-4 bg-blue-600 hover:bg-blue-700"
              >
                {t('save')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Records Table - CSV Style */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm table-fixed">
              <thead className="bg-gray-50 border-b sticky top-0 z-10">
                <tr>
                  <th className="px-2 py-3 text-center font-medium border-r w-10">
                    <input
                      type="checkbox"
                      onChange={toggleSelectAll}
                      checked={
                        paginatedRecords.filter(r => r.user_id === user?.id).length > 0 &&
                        paginatedRecords.filter(r => r.user_id === user?.id).every(r => selectedIds.has(r.id))
                      }
                      className="cursor-pointer"
                    />
                  </th>
                  <th className="px-2 py-3 text-left font-medium border-r w-28">{t('dateTime')}</th>
                  <th className="px-2 py-3 text-left font-medium border-r w-24">{t('managerName')}</th>
                  <th className="px-2 py-3 text-left font-medium border-r w-32">{t('companyName')}</th>
                  <th className="px-2 py-3 text-left font-medium border-r w-20">{t('industryMethod')}</th>
                  <th className="px-2 py-3 text-left font-medium border-r w-32">{t('phone')}</th>
                  <th className="px-2 py-3 text-left font-medium border-r w-28">{t('accountId')}</th>
                  <th className="px-2 py-3 text-left font-medium border-r w-20">{t('status')}</th>
                  <th className="px-2 py-3 text-left font-medium border-r w-24">{t('lastContactTime')}</th>
                  <th className="px-2 py-3 text-center font-medium border-r w-14">{language === 'ja' ? '回数' : '차수'}</th>
                  <th className="px-2 py-3 text-left font-medium border-r w-[160px] max-w-[160px]">{t('memo')}</th>
                  <th className="px-2 py-3 text-center font-medium w-10">{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={12} className="px-4 py-8 text-center text-gray-500">
                      {t('loading')}
                    </td>
                  </tr>
                ) : filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-4 py-8 text-center text-gray-500">
                      {t('noData')}
                    </td>
                  </tr>
                ) : (
                  paginatedRecords.map((record) => (
                    <tr 
                      key={record.id} 
                      id={`sales-tracking-record-${record.id}`} 
                      className={`border-b border-gray-100 relative group transition-colors ${
                        highlightRecordId === record.id
                          ? 'bg-yellow-100 animate-pulse'
                          : record.moved_to_retargeting 
                            ? 'bg-gray-200 text-gray-500' 
                            : 'hover:bg-gray-50'
                      }`}
                    >
                      <td className="px-2 py-2 border-r text-center relative overflow-hidden">
                        {record.moved_to_retargeting && (
                          <div className="fixed left-1/2 -translate-x-1/2 mt-8 px-3 py-2 bg-gray-900 text-white text-xs rounded whitespace-nowrap group-hover:opacity-100 opacity-0 transition-opacity duration-75 pointer-events-none z-50 shadow-lg">
                            {t('movedToRetargeting') || '리타겟팅으로 이동했습니다'}
                          </div>
                        )}
                        {record.user_id === user?.id && !record.moved_to_retargeting && (
                          <input
                            type="checkbox"
                            checked={selectedIds.has(record.id)}
                            onChange={() => toggleSelectRecord(record.id)}
                            className="cursor-pointer"
                          />
                        )}
                      </td>
                      <td className="px-2 py-2 border-r whitespace-nowrap overflow-hidden text-xs">{formatDateTime(record.date, record.occurred_at)}</td>
                      <td className="px-2 py-2 border-r truncate overflow-hidden text-xs">{record.manager_name}</td>
                      <td className="px-2 py-2 border-r overflow-hidden" title={!record.moved_to_retargeting ? (record.company_name || '-') : undefined}>
                        <button
                          onClick={() => setSelectedRecord(record)}
                          className="line-clamp-2 text-xs text-left text-blue-600 font-semibold hover:underline cursor-pointer w-full transition-colors"
                        >
                          {record.company_name || '-'}
                        </button>
                      </td>
                      {/* 업종 + 영업방법 합친 컬럼 */}
                      <td className="px-2 py-2 border-r overflow-hidden">
                        <div className="text-xs truncate">{translateIndustryLabel(record.industry as any)}</div>
                        <div className="text-[10px] text-gray-400 truncate">{translateContactMethodLabel(record.contact_method as any)}</div>
                      </td>
                      <td className="px-2 py-2 border-r truncate overflow-hidden text-xs">{record.phone || '-'}</td>
                      {/* 인스타그램 ID - 클릭 시 프로필 이동, 호버 시 복사 버튼 */}
                      <td className="px-2 py-2 border-r overflow-hidden text-xs" title={record.account_id || '-'}>
                        {record.account_id ? (
                          <div className="flex items-center gap-1 group/insta">
                            <a
                              href={`https://www.instagram.com/${record.account_id.replace('@', '')}/`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline truncate flex-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {record.account_id}
                            </a>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                navigator.clipboard.writeText(record.account_id!)
                                showToast(t('copiedToClipboard'), 'success')
                              }}
                              className="opacity-0 group-hover/insta:opacity-100 p-1 hover:bg-gray-200 rounded transition-opacity flex-shrink-0"
                              title={t('copy')}
                            >
                              <Copy className="h-3 w-3 text-gray-400" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      {/* 진행현황 - 컬러 뱃지 */}
                      <td className="px-2 py-2 border-r overflow-hidden">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${
                          record.status === '未返信' ? 'bg-gray-200 text-gray-700' :
                          record.status === '返信済み' || record.status === '返信あり' ? 'bg-blue-100 text-blue-700' :
                          record.status === '商談中' ? 'bg-orange-100 text-orange-700' :
                          record.status === '契約' ? 'bg-green-100 text-green-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {translateStatusLabel(record.status as any)}
                        </span>
                      </td>
                      {/* 마지막 연락 시간 (히스토리에서 자동 갱신됨) */}
                      <td className="px-2 py-2 border-r">
                        <span className="text-xs text-gray-600">{formatLastContact(record.last_contact_at)}</span>
                      </td>
                      {/* 차수 컬럼 */}
                      <td className="px-2 py-2 border-r text-center">
                        {record.latest_round && record.latest_round > 0 ? (
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                            record.latest_round === 1 ? 'bg-blue-100 text-blue-700' :
                            record.latest_round === 2 ? 'bg-emerald-100 text-emerald-700' :
                            record.latest_round === 3 ? 'bg-amber-100 text-amber-700' :
                            record.latest_round === 4 ? 'bg-purple-100 text-purple-700' :
                            'bg-rose-100 text-rose-700'
                          }`}>
                            {record.latest_round}
                          </span>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                      <td className="px-2 py-2 border-r" title={!record.moved_to_retargeting ? (record.memo || '') : undefined}>
                        <div className="flex items-center gap-1 max-w-[160px]">
                          <div className="text-xs truncate flex-1">{record.memo || '-'}</div>
                          {record.restaurant_id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedRestaurantId(record.restaurant_id!)}
                            title={t('storeDetail')}
                              className="h-5 w-5 p-0 text-orange-600 hover:text-orange-700 hover:bg-orange-50 flex-shrink-0"
                          >
                            <UtensilsCrossed className="h-3 w-3" />
                          </Button>
                        )}
                        </div>
                      </td>
                      {/* 작업 - 더보기 메뉴 */}
                      <td className="px-2 py-2 text-center relative">
                        {canEdit(record) && (
                          <div className="relative">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                if (openActionMenuId === record.id) {
                                  setOpenActionMenuId(null)
                                  setActionMenuCoords(null)
                                } else {
                                  // 버튼 위치 기준으로 메뉴 방향 및 좌표 결정
                                  const buttonRect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                                  const spaceBelow = window.innerHeight - buttonRect.bottom
                                  const isTop = spaceBelow < 200
                                  setActionMenuPosition(isTop ? 'top' : 'bottom')
                                  setActionMenuCoords({
                                    top: isTop ? buttonRect.top - 4 : buttonRect.bottom + 4,
                                    left: buttonRect.right
                                  })
                                  setOpenActionMenuId(record.id)
                                }
                              }}
                              className="h-6 w-6 p-0"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                            {openActionMenuId === record.id && actionMenuCoords && (
                              <>
                                <div 
                                  className="fixed inset-0 z-[9998]" 
                                  onClick={() => {
                                    setOpenActionMenuId(null)
                                    setActionMenuCoords(null)
                                  }}
                                />
                                <div 
                                  className="fixed bg-white border rounded-lg shadow-lg z-[9999] py-1 min-w-[140px]"
                                  style={{
                                    top: actionMenuPosition === 'top' ? 'auto' : actionMenuCoords.top,
                                    bottom: actionMenuPosition === 'top' ? window.innerHeight - actionMenuCoords.top : 'auto',
                                    left: actionMenuCoords.left,
                                    transform: 'translateX(-100%)'
                                  }}
                                >
                                  <button
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                                    onClick={() => {
                                      startEdit(record)
                                      setOpenActionMenuId(null)
                                      setActionMenuCoords(null)
                                    }}
                                  >
                                    <Edit className="h-3 w-3" />
                                    {t('edit')}
                                  </button>
                            {!record.moved_to_retargeting && (
                              <>
                                      <button
                                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-blue-600"
                                        onClick={() => {
                                          handleMoveToRetargeting(record)
                                          setOpenActionMenuId(null)
                                          setActionMenuCoords(null)
                                        }}
                                >
                                  <ArrowRight className="h-3 w-3" />
                                        {t('moveToRetargeting')}
                                      </button>
                                      <button
                                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-red-600"
                                        onClick={() => {
                                          handleDelete(record.id)
                                          setOpenActionMenuId(null)
                                          setActionMenuCoords(null)
                                        }}
                                      >
                                        <Trash2 className="h-3 w-3" />
                                        {t('delete')}
                                      </button>
                                    </>
                                  )}
                                  {record.last_contact_at && (
                                    <button
                                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-600 border-t"
                                      onClick={() => {
                                        handleResetLastContact(record.id)
                                        setOpenActionMenuId(null)
                                        setActionMenuCoords(null)
                                      }}
                                    >
                                      <RefreshCw className="h-3 w-3" />
                                      {t('resetLastContact')}
                                    </button>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filteredRecords.length > 0 && uiTotalPages > 1 && (
            <div className="px-4 py-3 border-t flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {t('showing')} {startIndex + 1} - {endIndex} {t('of')} {totalCountLabel}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    void goToPage(currentPage - 1)
                  }}
                  disabled={currentPage === 1}
                >
                  {t('previous')}
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, uiTotalPages) }, (_, i) => {
                    let pageNum
                    if (uiTotalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= uiTotalPages - 2) {
                      pageNum = uiTotalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          void goToPage(pageNum)
                        }}
                      >
                        {pageNum}
                      </Button>
                    )
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    void goToPage(currentPage + 1)
                  }}
                  disabled={currentPage >= uiTotalPages}
                >
                  {t('next')}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Monthly Stats Modal */}
      {showStatsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-5xl max-h-[90vh] flex flex-col bg-white shadow-2xl">
            <CardHeader className="flex-shrink-0">
              <CardTitle className="flex items-center justify-between flex-wrap gap-2">
                <span>{t('monthlyStats')} - {selectedYear}/{String(selectedMonth).padStart(2, '0')}</span>
                <div className="flex gap-2 flex-wrap">
                  <select
                    value={selectedYear}
                    onChange={(e) => {
                      const newYear = Number(e.target.value)
                      setSelectedYear(newYear)
                      // 자동으로 통계 조회
                      fetchMonthlyStats(newYear, selectedMonth)
                    }}
                    className="px-3 py-2 border rounded text-sm"
                  >
                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                      <option key={year} value={year}>{year} {t('year')}</option>
                    ))}
                  </select>
                  <select
                    value={selectedMonth}
                    onChange={(e) => {
                      const newMonth = Number(e.target.value)
                      setSelectedMonth(newMonth)
                      // 자동으로 통계 조회
                      fetchMonthlyStats(selectedYear, newMonth)
                    }}
                    className="px-3 py-2 border rounded text-sm"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                      <option key={month} value={month}>{month} {t('monthLabel')}</option>
                    ))}
                  </select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePreviousMonth}
                  >
                    {t('previousMonth')}
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleCurrentMonth}
                  >
                    {t('currentMonth')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextMonth}
                  >
                    {t('nextMonth')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowStatsModal(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto">
              {monthlyStats.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {t('noData')}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium border-r w-32">{t('managerName')}</th>
                        <th className="px-3 py-2 text-right font-medium border-r w-20">{t('phoneCount')}</th>
                        <th className="px-3 py-2 text-right font-medium border-r w-20">{t('sendCount')}</th>
                        <th className="px-3 py-2 text-right font-medium border-r w-20">{t('totalCount')}</th>
                        <th className="px-3 py-2 text-right font-medium border-r w-20">{t('replyCount')}</th>
                        <th className="px-3 py-2 text-right font-medium border-r w-20">{t('replyRate')}</th>
                        <th className="px-3 py-2 text-right font-medium border-r w-24">{t('retargetingCount')}</th>
                        <th className="px-3 py-2 text-right font-medium border-r w-20">{t('negotiationCount')}</th>
                        <th className="px-3 py-2 text-right font-medium w-20">{t('contractCount')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyStats.map((stat) => (
                        <tr key={stat.manager} className="border-b hover:bg-gray-50">
                          <td className="px-3 py-2 border-r font-medium">{stat.manager}</td>
                          <td className="px-3 py-2 border-r text-right">{stat.phoneCount}</td>
                          <td className="px-3 py-2 border-r text-right">{stat.sendCount}</td>
                          <td className="px-3 py-2 border-r text-right font-medium">{stat.totalCount}</td>
                          <td className="px-3 py-2 border-r text-right">{stat.replyCount}</td>
                          <td className="px-3 py-2 border-r text-right">{stat.replyRate}</td>
                          <td className="px-3 py-2 border-r text-right">{stat.retargetingCount}</td>
                          <td className="px-3 py-2 border-r text-right">{stat.negotiationCount}</td>
                          <td className="px-3 py-2 text-right">{stat.contractCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Daily Stats Modal */}
      {showDailyStatsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-5xl max-h-[90vh] flex flex-col bg-white shadow-2xl">
            <CardHeader className="flex-shrink-0">
              <CardTitle className="flex items-center justify-between flex-wrap gap-2">
                <span className="flex items-center gap-2">
                  {t('dailyStats')}
                  <span className="text-xs px-2 py-1 rounded-full bg-gray-100 border text-gray-700">
                {t('total')}: {Array.isArray(dailyStats) ? dailyStats.reduce((s, r) => s + (r.totalCount || 0), 0) : 0}
                  </span>
                </span>
                <div className="flex gap-2 flex-wrap items-center">
                  <span className="text-sm text-gray-600">{t('startDate')}</span>
                  <input
                    type="date"
                    className="px-3 py-2 border rounded text-sm"
                    value={dailyStart}
                    onChange={e => {
                      const v = e.target.value
                      setDailyStart(v)
                      fetchDailyStats(v, dailyEnd, dailyScope, dailyManager)
                    }}
                  />
                  <span>~</span>
                  <span className="text-sm text-gray-600">{t('endDate')}</span>
                  <input
                    type="date"
                    className="px-3 py-2 border rounded text-sm"
                    value={dailyEnd}
                    onChange={e => {
                      const v = e.target.value
                      setDailyEnd(v)
                      fetchDailyStats(dailyStart, v, dailyScope, dailyManager)
                    }}
                  />
                  <span className="text-sm text-gray-600">{t('managerName')}</span>
                  <select
                    value={dailyManager}
                    onChange={e => {
                      const v = e.target.value
                      setDailyManager(v)
                    }}
                    className="px-3 py-2 border rounded text-sm"
                  >
                    <option value="all">{t('all')}</option>
                    {managerOptions.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDailyStatsModal(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto">
            {!Array.isArray(dailyStats) || dailyStats.length === 0 ? (
                <div className="text-center py-8 text-gray-500">{t('noData')}</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium border-r w-28">{t('date')}</th>
                        {dailyScope === 'by_manager' && (
                          <th className="px-3 py-2 text-left font-medium border-r w-32">{t('managerName')}</th>
                        )}
                        <th className="px-3 py-2 text-right font-medium border-r w-20">{t('phoneCount')}</th>
                        <th className="px-3 py-2 text-right font-medium border-r w-20">{t('sendCount')}</th>
                        <th className="px-3 py-2 text-right font-medium border-r w-20">{t('totalCount')}</th>
                        <th className="px-3 py-2 text-right font-medium border-r w-20">{t('replyCount')}</th>
                        <th className="px-3 py-2 text-right font-medium border-r w-20">{t('replyRate')}</th>
                        <th className="px-3 py-2 text-right font-medium border-r w-24">{t('retargetingCount')}</th>
                        <th className="px-3 py-2 text-right font-medium border-r w-20">{t('negotiationCount')}</th>
                        <th className="px-3 py-2 text-right font-medium w-20">{t('contractCount')}</th>
                      </tr>
                    </thead>
                    <tbody>
                {Array.isArray(dailyStats) && dailyStats.map((row, idx) => (
                        <tr key={idx} className="border-b hover:bg-gray-50">
                          <td className="px-3 py-2 border-r">{row.date}</td>
                          {dailyScope === 'by_manager' && (
                            <td className="px-3 py-2 border-r">{row.manager}</td>
                          )}
                          <td className="px-3 py-2 border-r text-right">{row.phoneCount}</td>
                          <td className="px-3 py-2 border-r text-right">{row.sendCount}</td>
                          <td className="px-3 py-2 border-r text-right font-medium">{row.totalCount}</td>
                          <td className="px-3 py-2 border-r text-right">{row.replyCount}</td>
                          <td className="px-3 py-2 border-r text-right">{row.replyRate}</td>
                          <td className="px-3 py-2 border-r text-right">{row.retargetingCount}</td>
                          <td className="px-3 py-2 border-r text-right">{row.negotiationCount}</td>
                          <td className="px-3 py-2 text-right">{row.contractCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
        </CardContent>
      </Card>

      {/* Restaurant Drawer - for records from Recruit search */}
      {selectedRestaurantId && (
        <RestaurantDrawer
          restaurantId={selectedRestaurantId}
          onClose={() => setSelectedRestaurantId(null)}
          onUpdate={() => fetchRecords(currentPage)}
        />
      )}

      {/* Sales Tracking Drawer - for viewing contact history */}
      {selectedRecord && (
        <SalesTrackingDrawer
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
          onUpdate={() => {
            fetchRecords(currentPage)
            // 선택한 레코드의 last_contact_at 업데이트
            setRecords(prev => prev.map(r => 
              r.id === selectedRecord.id 
                ? { ...r, last_contact_at: new Date().toISOString() }
                : r
            ))
          }}
        />
      )}

      {/* Bulk History Modal - for adding contact history to multiple records */}
      {showBulkHistoryModal && (
        <BulkHistoryModal
          selectedIds={Array.from(selectedIds)}
          onClose={() => setShowBulkHistoryModal(false)}
          onSuccess={() => {
            setSelectedIds(new Set())
            fetchRecords(currentPage)
          }}
        />
      )}
    </div>
  )
}
