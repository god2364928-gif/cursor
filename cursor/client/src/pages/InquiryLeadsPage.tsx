import { useState, useEffect, useCallback } from 'react'
import api from '../lib/api'
import { useAuthStore } from '../store/authStore'
import { useToast } from '../components/ui/toast'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent } from '../components/ui/card'
import { 
  Users, 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  ExternalLink, 
  Search,
  ChevronLeft,
  ChevronRight,
  Upload
} from 'lucide-react'
import BulkAssignModal from '../components/BulkAssignModal'

interface InquiryLead {
  id: string
  storeName: string
  url: string
  prefecture: string
  region: string
  genre: string
  assigneeId: string | null
  assigneeName: string | null
  status: string
  memo: string | null
  assignedAt: string | null
  createdAt: string
  updatedAt: string
}

interface Stats {
  total: number
  unassigned: number
  completedThisWeek: number
  progressRate: number
  assigneeStats: {
    id: string
    name: string
    totalAssigned: number
    completed: number
    assignedThisWeek: number
    completedThisWeek: number
    weeklyProgress: number
  }[]
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

const STATUS_OPTIONS = [
  { value: 'PENDING', label: '대기중', color: 'bg-gray-100 text-gray-700' },
  { value: 'IN_PROGRESS', label: '진행중', color: 'bg-blue-100 text-blue-700' },
  { value: 'COMPLETED', label: '완료', color: 'bg-green-100 text-green-700' },
  { value: 'NO_SITE', label: '홈페이지 없음', color: 'bg-orange-100 text-orange-700' },
  { value: 'NO_FORM', label: '문의하기 없음', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'ETC', label: '기타', color: 'bg-purple-100 text-purple-700' }
]

export default function InquiryLeadsPage() {
  const user = useAuthStore((state) => state.user)
  const { showToast } = useToast()

  // Data states
  const [leads, setLeads] = useState<InquiryLead[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 50, total: 0, totalPages: 0 })
  const [assignees, setAssignees] = useState<{ id: string; name: string; team: string | null }[]>([])
  const [prefectures, setPrefectures] = useState<string[]>([])

  // Filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [assigneeFilter, setAssigneeFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [prefectureFilter, setPrefectureFilter] = useState<string>('')

  // UI states
  const [loading, setLoading] = useState(true)
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [uploading, setUploading] = useState(false)

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const response = await api.get('/inquiry-leads/stats')
      setStats(response.data)
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }, [])

  // Fetch leads
  const fetchLeads = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', '50')
      if (assigneeFilter) params.set('assigneeId', assigneeFilter)
      if (statusFilter) params.set('status', statusFilter)
      if (prefectureFilter) params.set('prefecture', prefectureFilter)
      if (searchQuery) params.set('search', searchQuery)

      const response = await api.get(`/inquiry-leads?${params.toString()}`)
      setLeads(response.data.data)
      setPagination(response.data.pagination)
    } catch (error) {
      console.error('Failed to fetch leads:', error)
      showToast('데이터를 불러오는데 실패했습니다', 'error')
    } finally {
      setLoading(false)
    }
  }, [assigneeFilter, statusFilter, prefectureFilter, searchQuery, showToast])

  // Fetch assignees
  const fetchAssignees = useCallback(async () => {
    try {
      const response = await api.get('/inquiry-leads/assignees')
      setAssignees(response.data)
    } catch (error) {
      console.error('Failed to fetch assignees:', error)
    }
  }, [])

  // Fetch prefectures
  const fetchPrefectures = useCallback(async () => {
    try {
      const response = await api.get('/inquiry-leads/prefectures')
      setPrefectures(response.data)
    } catch (error) {
      console.error('Failed to fetch prefectures:', error)
    }
  }, [])

  // Initial load
  useEffect(() => {
    fetchStats()
    fetchLeads()
    fetchAssignees()
    fetchPrefectures()
  }, [])

  // Re-fetch when filters change
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLeads(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [assigneeFilter, statusFilter, prefectureFilter, searchQuery])

  // Update lead status
  const updateLeadStatus = async (id: string, status: string) => {
    try {
      await api.put(`/inquiry-leads/${id}`, { status })
      setLeads(prev => prev.map(lead => 
        lead.id === id ? { ...lead, status } : lead
      ))
      fetchStats()
      showToast('상태가 업데이트되었습니다', 'success')
    } catch (error) {
      console.error('Failed to update status:', error)
      showToast('상태 업데이트에 실패했습니다', 'error')
    }
  }

  // Update lead memo
  const updateLeadMemo = async (id: string, memo: string) => {
    try {
      await api.put(`/inquiry-leads/${id}`, { memo })
      setLeads(prev => prev.map(lead => 
        lead.id === id ? { ...lead, memo } : lead
      ))
    } catch (error) {
      console.error('Failed to update memo:', error)
      showToast('메모 업데이트에 실패했습니다', 'error')
    }
  }

  // Handle CSV upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await api.post('/inquiry-leads/import', formData)
      showToast(`${response.data.inserted}개 데이터 등록 완료 (${response.data.skipped}개 스킵)`, 'success')
      fetchStats()
      fetchLeads()
      fetchPrefectures()
    } catch (error) {
      console.error('Failed to upload CSV:', error)
      showToast('CSV 업로드에 실패했습니다', 'error')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  // Handle bulk assign success
  const handleBulkAssignSuccess = () => {
    setShowBulkAssignModal(false)
    fetchStats()
    fetchLeads()
    showToast('배정이 완료되었습니다', 'success')
  }

  // Toggle select all
  const toggleSelectAll = () => {
    if (selectedIds.size === leads.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(leads.map(l => l.id)))
    }
  }

  // Toggle single select
  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedIds(newSet)
  }

  // Open URL in new tab
  const openUrl = (url: string) => {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }

  // Get status badge
  const getStatusBadge = (status: string) => {
    const option = STATUS_OPTIONS.find(s => s.value === status)
    return option || { value: status, label: status, color: 'bg-gray-100 text-gray-700' }
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">문의 배정</h1>
          <p className="text-gray-500 mt-1">홈페이지 문의가 있는 가게 데이터를 담당자별로 배정하고 관리합니다</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
              disabled={uploading}
            />
            <Button variant="outline" disabled={uploading} asChild>
              <span>
                <Upload className="w-4 h-4 mr-2" />
                {uploading ? '업로드 중...' : 'CSV 업로드'}
              </span>
            </Button>
          </label>
          <Button onClick={() => setShowBulkAssignModal(true)}>
            <Users className="w-4 h-4 mr-2" />
            일괄 배정
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">전체 데이터</p>
                <p className="text-3xl font-bold text-gray-900">{stats?.total.toLocaleString() || 0}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">미배정</p>
                <p className="text-3xl font-bold text-orange-600">{stats?.unassigned.toLocaleString() || 0}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">금주 완료</p>
                <p className="text-3xl font-bold text-green-600">{stats?.completedThisWeek.toLocaleString() || 0}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">진행률</p>
                <p className="text-3xl font-bold text-indigo-600">{stats?.progressRate || 0}%</p>
              </div>
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assignee Progress */}
      {stats?.assigneeStats && stats.assigneeStats.length > 0 && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">담당자별 금주 진행 현황</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stats.assigneeStats.map(assignee => (
                <div key={assignee.id} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">{assignee.name}</span>
                    <span className="text-sm text-gray-500">
                      {assignee.completedThisWeek} / {assignee.assignedThisWeek}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-indigo-600 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(assignee.weeklyProgress, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1 text-right">{assignee.weeklyProgress}%</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="가게명 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Assignee Filter */}
            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">모든 담당자</option>
              <option value="unassigned">미배정</option>
              {assignees.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">모든 상태</option>
              {STATUS_OPTIONS.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>

            {/* Prefecture Filter */}
            <select
              value={prefectureFilter}
              onChange={(e) => setPrefectureFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">모든 지역</option>
              {prefectures.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="p-4 text-left">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === leads.length && leads.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="p-4 text-left text-sm font-medium text-gray-600">가게명 / 장르</th>
                  <th className="p-4 text-left text-sm font-medium text-gray-600">지역</th>
                  <th className="p-4 text-center text-sm font-medium text-gray-600">홈페이지</th>
                  <th className="p-4 text-left text-sm font-medium text-gray-600">담당자</th>
                  <th className="p-4 text-left text-sm font-medium text-gray-600">상태</th>
                  <th className="p-4 text-left text-sm font-medium text-gray-600">비고</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-500">
                      로딩 중...
                    </td>
                  </tr>
                ) : leads.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-500">
                      데이터가 없습니다
                    </td>
                  </tr>
                ) : (
                  leads.map(lead => (
                    <tr 
                      key={lead.id} 
                      className="border-b hover:bg-gray-50 cursor-pointer"
                      onClick={() => lead.url && openUrl(lead.url)}
                    >
                      <td className="p-4" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(lead.id)}
                          onChange={() => toggleSelect(lead.id)}
                          className="rounded border-gray-300"
                        />
                      </td>
                      <td className="p-4">
                        <div>
                          <p className="font-medium text-gray-900">{lead.storeName}</p>
                          <p className="text-sm text-gray-500">{lead.genre}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <div>
                          <p className="text-gray-900">{lead.prefecture}</p>
                          <p className="text-sm text-gray-500">{lead.region}</p>
                        </div>
                      </td>
                      <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                        {lead.url ? (
                          <button
                            onClick={() => openUrl(lead.url)}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title={lead.url}
                          >
                            <ExternalLink className="w-5 h-5" />
                          </button>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-sm ${lead.assigneeName ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                          {lead.assigneeName || '미배정'}
                        </span>
                      </td>
                      <td className="p-4" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={lead.status}
                          onChange={(e) => updateLeadStatus(lead.id, e.target.value)}
                          className={`px-3 py-1 rounded text-sm font-medium border-0 cursor-pointer ${getStatusBadge(lead.status).color}`}
                        >
                          {STATUS_OPTIONS.map(s => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-4" onClick={(e) => e.stopPropagation()}>
                        <Input
                          value={lead.memo || ''}
                          onChange={(e) => {
                            const newMemo = e.target.value
                            setLeads(prev => prev.map(l => 
                              l.id === lead.id ? { ...l, memo: newMemo } : l
                            ))
                          }}
                          onBlur={(e) => updateLeadMemo(lead.id, e.target.value)}
                          placeholder="메모 입력..."
                          className="text-sm h-8"
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <p className="text-sm text-gray-500">
                총 {pagination.total.toLocaleString()}개 중 {((pagination.page - 1) * pagination.limit) + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)}개 표시
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => fetchLeads(pagination.page - 1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm text-gray-600">
                  {pagination.page} / {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => fetchLeads(pagination.page + 1)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk Assign Modal */}
      {showBulkAssignModal && (
        <BulkAssignModal
          assignees={assignees}
          onClose={() => setShowBulkAssignModal(false)}
          onSuccess={handleBulkAssignSuccess}
        />
      )}
    </div>
  )
}

