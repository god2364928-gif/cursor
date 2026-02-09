import { useState, useEffect, useCallback } from 'react'
import api from '../lib/api'
import { useAuthStore } from '../store/authStore'
import { useI18nStore } from '../i18n'
import { useToast } from '../components/ui/toast'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent } from '../components/ui/card'
import { getLocalToday } from '../utils/dateUtils'
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
  sentDate: string | null
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

const getStatusOptions = (t: (key: string) => string) => [
  { value: 'PENDING', label: t('statusPending'), color: 'bg-gray-100 text-gray-700' },
  { value: 'IN_PROGRESS', label: t('statusInProgress'), color: 'bg-blue-100 text-blue-700' },
  { value: 'COMPLETED', label: t('statusCompleted'), color: 'bg-green-100 text-green-700' },
  { value: 'NO_SITE', label: t('statusNoSite'), color: 'bg-orange-100 text-orange-700' },
  { value: 'NO_FORM', label: t('statusNoForm'), color: 'bg-yellow-100 text-yellow-700' },
  { value: 'ETC', label: t('statusEtc'), color: 'bg-purple-100 text-purple-700' }
]

export default function InquiryLeadsPage() {
  const user = useAuthStore((state) => state.user)
  const { t } = useI18nStore()
  const { showToast } = useToast()
  
  const STATUS_OPTIONS = getStatusOptions(t)

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
      showToast(t('dataLoadFailed'), 'error')
    } finally {
      setLoading(false)
    }
  }, [assigneeFilter, statusFilter, prefectureFilter, searchQuery, showToast])

  // Fetch assignees (마케터만)
  const fetchAssignees = useCallback(async () => {
    try {
      const response = await api.get('/inquiry-leads/assignees?marketersOnly=true')
      setAssignees(response.data)
      
      // 매니저 또는 마케터인 경우 담당자 필터를 본인으로 기본 설정
      if ((user?.role === 'manager' || user?.role === 'marketer') && user?.id) {
        setAssigneeFilter(user.id)
      }
    } catch (error) {
      console.error('Failed to fetch assignees:', error)
    }
  }, [user])

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
      const completedStatuses = ['COMPLETED', 'NO_SITE', 'NO_FORM', 'ETC']
      const newSentDate = completedStatuses.includes(status) ? getLocalToday() : null
      setLeads(prev => prev.map(lead => 
        lead.id === id ? { ...lead, status, sentDate: completedStatuses.includes(status) ? newSentDate : lead.sentDate } : lead
      ))
      fetchStats()
      showToast(t('statusUpdated'), 'success')
    } catch (error) {
      console.error('Failed to update status:', error)
      showToast(t('statusUpdateFailed'), 'error')
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
      showToast(t('memoUpdateFailed'), 'error')
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
      showToast(`${response.data.inserted}${t('csvUploadSuccess').replace('{skipped}', response.data.skipped)}`, 'success')
      fetchStats()
      fetchLeads()
      fetchPrefectures()
    } catch (error) {
      console.error('Failed to upload CSV:', error)
      showToast(t('csvUploadFailed'), 'error')
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
    showToast(t('assignCompleted'), 'success')
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
          <h1 className="text-2xl font-bold text-gray-900">{t('inquiryLeadsTitle')}</h1>
          <p className="text-gray-500 mt-1">{t('inquiryLeadsSubtitle')}</p>
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
                {uploading ? t('uploadingCsv') : t('csvUpload')}
              </span>
            </Button>
          </label>
          <Button onClick={() => setShowBulkAssignModal(true)}>
            <Users className="w-4 h-4 mr-2" />
            {t('bulkAssign')}
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">{t('totalData')}</p>
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
                <p className="text-sm text-gray-500 mb-1">{t('unassigned')}</p>
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
                <p className="text-sm text-gray-500 mb-1">{t('completedThisWeek')}</p>
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
                <p className="text-sm text-gray-500 mb-1">{t('progressRate')}</p>
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
            <h3 className="font-semibold text-gray-900 mb-4">{t('assigneeWeeklyProgress')}</h3>
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
                placeholder={t('searchStoreName')}
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
              <option value="">{t('allAssignees')}</option>
              <option value="unassigned">{t('unassignedFilter')}</option>
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
              <option value="">{t('allStatuses')}</option>
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
              <option value="">{t('allRegions')}</option>
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
                  <th className="p-4 text-left text-sm font-medium text-gray-600">{t('storeNameGenre')}</th>
                  <th className="p-4 text-left text-sm font-medium text-gray-600">{t('regionColumn')}</th>
                  <th className="p-4 text-center text-sm font-medium text-gray-600">{t('homepageColumn')}</th>
                  <th className="p-4 text-left text-sm font-medium text-gray-600">{t('assigneeColumn')}</th>
                  <th className="p-4 text-left text-sm font-medium text-gray-600">{t('statusColumn')}</th>
                  <th className="p-4 text-center text-sm font-medium text-gray-600">{t('sentDateColumn')}</th>
                  <th className="p-4 text-left text-sm font-medium text-gray-600">{t('noteColumn')}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-gray-500">
                      {t('loadingData')}
                    </td>
                  </tr>
                ) : leads.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-gray-500">
                      {t('noDataFound')}
                    </td>
                  </tr>
                ) : (
                  leads.map(lead => (
                    <tr 
                      key={lead.id} 
                      className="border-b hover:bg-gray-50"
                    >
                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(lead.id)}
                          onChange={() => toggleSelect(lead.id)}
                          className="rounded border-gray-300"
                        />
                      </td>
                      <td className="p-4" style={{ maxWidth: '280px' }}>
                        <div>
                          <p className="font-medium text-gray-900 break-words">{lead.storeName}</p>
                          <p className="text-sm text-gray-500">{lead.genre}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <div>
                          <p className="text-gray-900">{lead.prefecture}</p>
                          <p className="text-sm text-gray-500">{lead.region}</p>
                        </div>
                      </td>
                      <td className="p-4 text-center">
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
                          {lead.assigneeName || t('unassigned')}
                        </span>
                      </td>
                      <td className="p-4">
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
                      <td className="p-4 text-center text-sm text-gray-600">
                        {lead.sentDate ? new Date(lead.sentDate).toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit' }) : '-'}
                      </td>
                      <td className="p-4">
                        <Input
                          value={lead.memo || ''}
                          onChange={(e) => {
                            const newMemo = e.target.value
                            setLeads(prev => prev.map(l => 
                              l.id === lead.id ? { ...l, memo: newMemo } : l
                            ))
                          }}
                          onBlur={(e) => updateLeadMemo(lead.id, e.target.value)}
                          placeholder={t('enterMemo')}
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
                {t('displayingOf')
                  .replace('{total}', pagination.total.toLocaleString())
                  .replace('{start}', String(((pagination.page - 1) * pagination.limit) + 1))
                  .replace('{end}', String(Math.min(pagination.page * pagination.limit, pagination.total)))}
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
          onClose={() => setShowBulkAssignModal(false)}
          onSuccess={handleBulkAssignSuccess}
        />
      )}
    </div>
  )
}

