import { useState, useEffect, useRef, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { useAuthStore } from '../store/authStore'
import { useI18nStore } from '../i18n'
import { useToast } from '../components/ui/toast'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Plus, Edit, Trash2, X, BarChart3, Search, ArrowRight } from 'lucide-react'
import GlobalSearch from '../components/GlobalSearch'

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
}

const PAGE_SIZE = 500

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
  const { t } = useI18nStore()
  const user = useAuthStore((state) => state.user)
  const { showToast } = useToast()
  const location = useLocation()
  const navigate = useNavigate()
  
  const [records, setRecords] = useState<SalesTrackingRecord[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showStatsModal, setShowStatsModal] = useState(false)
  const [showDailyStatsModal, setShowDailyStatsModal] = useState(false)
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([])
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [managerFilter, setManagerFilter] = useState<string>(user?.role === 'marketer' ? (user?.name || 'all') : 'all')
  const [managerOptions, setManagerOptions] = useState<string[]>([])
  const [, setUsers] = useState<any[]>([])
  // Daily stats state
  const [dailyStart, setDailyStart] = useState<string>('')
  const [dailyEnd, setDailyEnd] = useState<string>('')
  const [dailyScope, setDailyScope] = useState<'overall' | 'by_manager'>('overall')
  const [dailyManager, setDailyManager] = useState<string>('all')
  const [dailyStats, setDailyStats] = useState<any[]>([])
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  
  // 이전 검색 요청 취소용
  const abortControllerRef = useRef<AbortController | null>(null)
  
  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 100

  // 체크박스 및 일괄 메모 수정
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showBulkMemoForm, setShowBulkMemoForm] = useState(false)
  const [bulkMemo, setBulkMemo] = useState('')
  const [updatingBulkMemo, setUpdatingBulkMemo] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
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
        
        console.log('All users:', allUsers.map((u: any) => ({ name: u.name, role: u.role })))
        
        // 마케터 역할의 사용자만 필터링 (명시적으로 'marketer'만)
        const marketerNames = allUsers
          .filter((u: any) => {
            const isMarketer = u.role === 'marketer'
            console.log(`User ${u.name}: role=${u.role}, isMarketer=${isMarketer}`)
            return isMarketer
          })
          .map((u: any) => u.name)
          .sort()
        
        console.log('Filtered marketers:', marketerNames)
        setManagerOptions(marketerNames)
        
        // 디폴트는 본인 (마케터인 경우)
        if (user?.role === 'marketer' && user?.name) {
          setManagerFilter(user.name)
        }
      } catch (e) {
        console.error('Failed to load users for manager filter', e)
      }
    })()
  }, [user])

  const fetchRecords = useCallback(async (_append: boolean, _nextOffset: number, signal?: AbortSignal) => {
    setLoading(true)
    setLoadingMore(false)

    try {
      const params: any = { limit: 'all' }
      if (searchQuery.trim()) {
        params.search = searchQuery.trim()
      }
      const config: any = { params }
      if (signal) {
        config.signal = signal
      }
      const response = await api.get('/sales-tracking', config)
      const rows = response.data?.rows ?? response.data ?? []
      setHasMore(false)
      setOffset(0)
      setRecords(rows)
      setCurrentPage(1)
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
      setLoadingMore(false)
    }
  }, [searchQuery, showToast, t])

  useEffect(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    const controller = new AbortController()
    abortControllerRef.current = controller
    fetchRecords(false, 0, controller.signal)
    return () => {
      controller.abort()
    }
  }, [fetchRecords])

  // 통합검색에서 선택한 레코드 처리
  useEffect(() => {
    const state = location.state as { selectedId?: string; searchQuery?: string } | null
    if (state?.selectedId && records.length > 0) {
      const record = records.find(r => r.id === state.selectedId)
      if (record) {
        // 검색어가 있으면 필터 설정
        if (state.searchQuery) {
          setSearchQuery(state.searchQuery)
        }
        // 레코드가 있는 페이지로 이동 (filteredRecords를 직접 계산)
        const filtered = records.filter(r => managerFilter === 'all' || r.manager_name === managerFilter)
        const index = filtered.findIndex(r => r.id === record.id)
        if (index >= 0) {
          const page = Math.floor(index / itemsPerPage) + 1
          setCurrentPage(page)
          // 레코드로 스크롤 (약간의 딜레이를 두어 DOM이 업데이트된 후 실행)
          setTimeout(() => {
            const element = document.getElementById(`sales-tracking-record-${record.id}`)
            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'center' })
              // 하이라이트 효과
              element.classList.add('bg-yellow-100')
              setTimeout(() => {
                element.classList.remove('bg-yellow-100')
              }, 2000)
            }
          }, 300)
        }
        // state 초기화 (뒤로가기 시 다시 선택되지 않도록)
        navigate(location.pathname, { replace: true, state: {} })
      }
    }
  }, [location.state, records, managerFilter, navigate, location.pathname, itemsPerPage])

  const handleLoadMore = () => {
    if (!hasMore || loading || loadingMore) return
    fetchRecords(true, offset + PAGE_SIZE)
  }

  // Daily stats
  const openDailyStats = () => {
    // default: last 2 weeks (14 days inclusive)
    const end = new Date()
    const start = new Date(end)
    start.setDate(end.getDate() - 13)
    const startStr = start.toISOString().split('T')[0]
    const endStr = end.toISOString().split('T')[0]
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
      fetchRecords(false, 0)
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
      fetchRecords(false, 0)
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
      fetchRecords(false, 0)
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
      fetchRecords(false, 0)
    } catch (error: any) {
      if (error.response?.status === 403) {
        showToast(t('onlyOwnerCanModify'), 'error')
      } else {
        showToast(error.response?.data?.message || t('moveToRetargetingFailed'), 'error')
      }
    }
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
      alert('메모를 입력해 주세요')
      return
    }

    setUpdatingBulkMemo(true)
    try {
      await api.put('/sales-tracking/bulk-memo', {
        ids: Array.from(selectedIds),
        memo: bulkMemo.trim()
      })
      
      showToast(`${selectedIds.size}건의 메모를 수정했습니다`, 'success')
      setSelectedIds(new Set())
      setBulkMemo('')
      setShowBulkMemoForm(false)
      fetchRecords(false, 0)
    } catch (error: any) {
      showToast(error.response?.data?.message || '일괄 수정에 실패했습니다', 'error')
    } finally {
      setUpdatingBulkMemo(false)
    }
  }

  // 일괄 리타겟팅 이동
  const handleBulkMoveToRetargeting = async () => {
    if (selectedIds.size === 0) return
    
    if (!confirm(`선택한 ${selectedIds.size}건을 리타겟팅으로 이동하시겠습니까?`)) {
      return
    }

    try {
      await api.post('/sales-tracking/bulk-move-to-retargeting', {
        ids: Array.from(selectedIds)
      })
      
      showToast(`${selectedIds.size}건을 리타겟팅으로 이동했습니다`, 'success')
      setSelectedIds(new Set())
      fetchRecords(false, 0)
    } catch (error: any) {
      showToast(error.response?.data?.message || '리타겟팅 이동에 실패했습니다', 'error')
    }
  }

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
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
    // Check if user can edit
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
      
      console.log('Fetching monthly stats:', { year: finalYear, month: finalMonth })
      
      const response = await api.get('/sales-tracking/stats/monthly', {
        params: { year: finalYear, month: finalMonth }
      })
      
      // 디버깅: 응답 데이터 확인 (강화)
      console.log('========================================')
      console.log('📊 월별 통계 API 응답 전체:', response.data)
      console.log('📊 응답 타입:', typeof response.data)
      console.log('📊 응답이 배열인가?', Array.isArray(response.data))
      console.log('📊 응답 키:', Object.keys(response.data))
      console.log('📊 response.data.stats 존재?', !!response.data.stats)
      console.log('📊 response.data.debug 존재?', !!response.data.debug)
      console.log('========================================')
      
      // 응답 구조 확인 - 더 명확하게
      let statsData
      let debugData
      
      if (response.data && typeof response.data === 'object' && !Array.isArray(response.data)) {
        // 객체 형태인 경우
        statsData = response.data.stats || response.data
        debugData = response.data.debug
        console.log('✅ 응답이 객체 형태입니다.')
      } else if (Array.isArray(response.data)) {
        // 배열 형태인 경우 (구버전 호환)
        statsData = response.data
        debugData = null
        console.warn('⚠️ 응답이 배열 형태입니다. (구버전 호환)')
      } else {
        statsData = response.data
        debugData = null
        console.warn('⚠️ 응답 구조를 알 수 없습니다.')
      }
      
      console.log('📊 통계 데이터:', statsData)
      console.log('📊 디버그 데이터:', debugData)
      
      // 각 담당자별 회신수 확인
      if (Array.isArray(statsData)) {
        console.log('\n📋 담당자별 회신수 현황:')
        statsData.forEach((stat: any) => {
          console.log(`  ${stat.manager}: 총 ${stat.totalCount}건, 회신 ${stat.replyCount}건 (${stat.replyRate}), 리타획득수: ${stat.retargetingCount}`)
          // 리타획득수 확인
          if (stat.retargetingCount !== undefined && stat.retargetingCount !== 0) {
            console.warn(`  ⚠️ ${stat.manager}의 리타획득수가 0이 아닙니다: ${stat.retargetingCount}`)
            console.warn(`     totalCount: ${stat.totalCount}, retargetingCount: ${stat.retargetingCount}`)
          }
        })
      }
      
      if (debugData) {
        console.log('\n🔍 디버그 정보:', debugData)
        
        // 石黒杏奈의 返信 레코드 확인
        if (debugData.ishiguroReplyCount !== undefined) {
          console.log(`\n📊 石黒杏奈의 11월 返信 레코드: ${debugData.ishiguroReplyCount}건`)
          console.log(`📊 石黒杏奈의 11월 status = '返信あり' 정확 일치: ${debugData.ishiguroExactMatch}건`)
          
          if (debugData.ishiguroReplyRecords && debugData.ishiguroReplyRecords.length > 0) {
            console.log('\n📋 石黒杏奈의 실제 返信 레코드 목록:')
            debugData.ishiguroReplyRecords.forEach((r: any, idx: number) => {
              console.log(`  ${idx + 1}. ID: ${r.id}, Date: ${r.date}, Status: "${r.status}", Bytes: ${r.statusBytes}, Customer: ${r.customer}`)
            })
          }
        }
        
        // Status 값 목록
        if (debugData.statusValues) {
          console.log('\n📋 Status 값 목록 (DB에 저장된 모든 status):')
          debugData.statusValues.forEach((s: any) => {
            const isReply = s.status && s.status.includes('返信') && s.status !== '未返信'
            console.log(`  - "${s.status}": ${s.count}건 ${isReply ? '✅ (회신)' : ''}`)
          })
        }
        
        // Status 분포
        if (debugData.statusDistribution) {
          console.log('\n📊 담당자별 status 분포:')
          debugData.statusDistribution.forEach((d: any) => {
            console.log(`  ${d.manager} - "${d.status}": ${d.count}건 ${d.isReply ? '✅ (회신)' : ''}`)
          })
        }
        
        // 회신 테스트 결과
        if (debugData.replyTestResults) {
          console.log('\n🔍 "返信" 포함 레코드 (담당자별):')
          if (debugData.replyTestResults.length === 0) {
            console.warn('  ⚠️ 해당 월에 "返信"이 포함된 레코드가 없습니다!')
          } else {
            debugData.replyTestResults.forEach((r: any) => {
              console.log(`  ${r.manager} - "${r.status}": ${r.count}건`)
            })
          }
        }
        
        // 회신 관련 status 확인
        if (debugData.statusValues) {
          const replyStatuses = debugData.statusValues.filter((s: any) => 
            s.status && s.status.includes('返信') && s.status !== '未返信'
          )
          console.log('\n✅ "返信"이 포함된 status 값들 (未返信 제외):', replyStatuses)
          
          if (replyStatuses.length === 0) {
            console.warn('\n⚠️ 경고: 데이터베이스에 "返信"이 포함된 status 값이 없습니다!')
            console.warn('   (단, 未返信은 제외)')
          }
        }
      } else {
        console.warn('\n⚠️ 디버그 정보가 응답에 포함되어 있지 않습니다.')
        console.warn('   응답 구조:', response.data ? Object.keys(response.data) : 'null')
        console.warn('   응답 데이터:', response.data)
      }
      
      console.log('========================================\n')
      
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
      return `${normalized} 00:00:00`
    }
    return normalized.length >= 19 ? normalized.slice(0, 19) : normalized.slice(0, 16)
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

  // 담당자별 필터링
  const filteredRecords = records.filter(r => 
    managerFilter === 'all' || r.manager_name === managerFilter
  )
  
  // 페이지네이션 계산
  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedRecords = filteredRecords.slice(startIndex, endIndex)

  useEffect(() => {
    setCurrentPage(1)
  }, [managerFilter])

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

      {/* 담당자 필터 */}
      <div className="mb-4">
        <label className="text-sm text-gray-600 mb-2 block">{t('manager')}</label>
        <select
          className="w-full border rounded px-3 py-2 max-w-xs"
          value={managerFilter}
          onChange={e => {
            setManagerFilter(e.target.value)
            setCurrentPage(1) // 필터 변경 시 첫 페이지로
          }}
        >
          <option value="all">{t('all')}</option>
          {managerOptions.map(manager => (
            <option key={manager} value={manager}>{manager}</option>
          ))}
        </select>
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
        {filteredRecords.length > 0 && totalPages > 1 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              {t('previous')}
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (currentPage <= 3) {
                  pageNum = i + 1
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = currentPage - 2 + i
                }
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                )
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
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
                  {selectedIds.size}건 선택됨
                </span>
                {!showBulkMemoForm && (
                  <>
                    <Button size="sm" onClick={() => setShowBulkMemoForm(true)}>
                      선택 항목 메모 변경
                    </Button>
                    <Button 
                      size="sm" 
                      variant="default"
                      className="bg-orange-500 hover:bg-orange-600"
                      onClick={handleBulkMoveToRetargeting}
                    >
                      리타겟팅으로 이동
                    </Button>
                  </>
                )}
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => setSelectedIds(new Set())}
                >
                  선택 해제
                </Button>
              </div>
              {showBulkMemoForm && (
                <div className="flex items-center gap-2 flex-1 max-w-xl">
                  <Input
                    value={bulkMemo}
                    onChange={(e) => setBulkMemo(e.target.value)}
                    placeholder="새 메모 내용 입력"
                    disabled={updatingBulkMemo}
                  />
                  <Button
                    size="sm"
                    onClick={handleBulkMemoUpdate}
                    disabled={updatingBulkMemo || !bulkMemo.trim()}
                  >
                    {updatingBulkMemo ? '저장 중...' : '저장'}
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
                    취소
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Add Form */}
      {showAddForm && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              {editingId ? t('edit') : t('add')}
              <Button variant="ghost" size="sm" onClick={cancelEdit}>
                <X className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium">{t('date')}</label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">{t('managerName')}</label>
                <Input
                  value={formData.managerName}
                  readOnly
                  disabled
                  className="bg-gray-100 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="text-sm font-medium">{t('companyName')}</label>
                <Input
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">{t('accountId')}</label>
                <Input
                  value={formData.accountId}
                  onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">{t('industry')}</label>
                <select
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
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
              <div>
                <label className="text-sm font-medium">{t('contactMethod')}</label>
                <select
                  value={formData.contactMethod}
                  onChange={(e) => setFormData({ ...formData, contactMethod: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="">-</option>
                  <option value="電話">{t('contactPhone')}</option>
                  <option value="LINE">{t('contactLINE')}</option>
                  <option value="DM">{t('contactDM')}</option>
                  <option value="メール">{t('contactMail')}</option>
                  <option value="フォーム">{t('contactForm')}</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">{t('status')}</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="未返信">{t('statusNoReply')}</option>
                  <option value="返信済み">{t('statusReplied')}</option>
                  <option value="商談中">{t('statusNegotiating')}</option>
                  <option value="契約">{t('statusContract')}</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">{t('phone')}</label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium">{t('memo')}</label>
                <Input
                  value={formData.memo}
                  onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
                />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button onClick={editingId ? () => handleUpdate(editingId) : handleAdd}>
                {t('save')}
              </Button>
              <Button variant="outline" onClick={cancelEdit}>
                {t('cancel')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Records Table - CSV Style */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-2 py-2 text-center font-medium border-r w-10">
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
                  <th className="px-2 py-2 text-left font-medium border-r w-28">{t('dateTime')}</th>
                  <th className="px-2 py-2 text-left font-medium border-r w-28">{t('managerName')}</th>
                  <th className="px-2 py-2 text-left font-medium border-r w-32">{t('companyName')}</th>
                  <th className="px-2 py-2 text-left font-medium border-r w-24">{t('industry')}</th>
                  <th className="px-2 py-2 text-left font-medium border-r w-24">{t('phone')}</th>
                  <th className="px-2 py-2 text-left font-medium border-r w-32">{t('accountId')}</th>
                  <th className="px-2 py-2 text-left font-medium border-r w-20">{t('contactMethod')}</th>
                  <th className="px-2 py-2 text-left font-medium border-r w-20">{t('status')}</th>
                  <th className="px-2 py-2 text-left font-medium border-r w-8">{t('memo')}</th>
                  <th className="px-2 py-2 text-center font-medium w-20">{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-8 text-center text-gray-500">
                      {t('loading')}
                    </td>
                  </tr>
                ) : filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-8 text-center text-gray-500">
                      {t('noData')}
                    </td>
                  </tr>
                ) : (
                  paginatedRecords.map((record) => (
                    <tr 
                      key={record.id} 
                      id={`sales-tracking-record-${record.id}`} 
                      className={`border-b relative group ${
                        record.moved_to_retargeting 
                          ? 'bg-gray-200 text-gray-500 opacity-60' 
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <td className="px-2 py-1 border-r text-center relative">
                        {record.moved_to_retargeting && (
                          <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-100 pointer-events-none z-10">
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
                      <td className="px-2 py-1 border-r whitespace-nowrap">{formatDateTime(record.date, record.occurred_at)}</td>
                      <td className="px-2 py-1 border-r">{record.manager_name}</td>
                      <td className="px-2 py-1 border-r">{record.company_name || '-'}</td>
                      <td className="px-2 py-1 border-r">{translateIndustryLabel(record.industry as any)}</td>
                      <td className="px-2 py-1 border-r">{record.phone || '-'}</td>
                      <td className="px-2 py-1 border-r">{record.account_id || '-'}</td>
                      <td className="px-2 py-1 border-r">{translateContactMethodLabel(record.contact_method as any)}</td>
                      <td className="px-2 py-1 border-r">{translateStatusLabel(record.status as any)}</td>
                      <td className="px-2 py-1 border-r truncate w-8" title={record.memo || ''}>
                        {record.memo || '-'}
                      </td>
                      <td className="px-2 py-1 text-center">
                        {canEdit(record) && !record.moved_to_retargeting && (
                          <div className="flex gap-1 justify-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => startEdit(record)}
                              title={t('edit')}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMoveToRetargeting(record)}
                              title={t('moveToRetargeting')}
                              className="text-blue-600 hover:text-blue-700"
                            >
                              <ArrowRight className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(record.id)}
                              title={t('delete')}
                            >
                              <Trash2 className="h-3 w-3 text-red-500" />
                            </Button>
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
          {filteredRecords.length > 0 && totalPages > 1 && (
            <div className="px-4 py-3 border-t flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {t('showing')} {startIndex + 1} - {Math.min(endIndex, filteredRecords.length)} {t('of')} {filteredRecords.length}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  {t('previous')}
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    )
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  {t('next')}
                </Button>
              </div>
            </div>
          )}
          {hasMore && (
            <div className="px-4 py-3 border-t flex justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={handleLoadMore}
                disabled={loading || loadingMore}
              >
                {loadingMore ? t('loading') : t('loadMore')}
              </Button>
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
    </div>
  )
}
