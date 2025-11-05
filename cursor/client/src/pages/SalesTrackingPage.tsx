import { useState, useEffect } from 'react'
import api from '../lib/api'
import { useAuthStore } from '../store/authStore'
import { useI18nStore } from '../i18n'
import { useToast } from '../components/ui/toast'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Plus, Edit, Trash2, X, BarChart3, Search } from 'lucide-react'
import GlobalSearch from '../components/GlobalSearch'

interface SalesTrackingRecord {
  id: string
  date: string
  manager_name: string
  account_id?: string
  customer_name?: string
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
}

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
  ngCount: number
}

export default function SalesTrackingPage() {
  const { t } = useI18nStore()
  const user = useAuthStore((state) => state.user)
  const { showToast } = useToast()
  
  const [records, setRecords] = useState<SalesTrackingRecord[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showStatsModal, setShowStatsModal] = useState(false)
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([])
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  
  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 100

  // Form state
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    managerName: user?.name || '',
    accountId: '',
    customerName: '',
    industry: '',
    contactMethod: '',
    status: '未返信',
    contactPerson: '',
    phone: '',
    memo: '',
    memoNote: ''
  })

  useEffect(() => {
    fetchRecords()
  }, [searchQuery])

  const fetchRecords = async () => {
    try {
      setLoading(true)
      const params: any = {}
      if (searchQuery) {
        params.search = searchQuery
      }
      const response = await api.get('/sales-tracking', { params })
      setRecords(response.data || [])
    } catch (error: any) {
      console.error('Failed to fetch records:', error)
      const errorMessage = error.response?.data?.message || error.message || t('error')
      showToast(errorMessage, 'error')
      setRecords([]) // 에러 발생 시 빈 배열로 설정
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async () => {
    try {
      await api.post('/sales-tracking', formData)
      showToast(t('saved'), 'success')
      setShowAddForm(false)
      resetForm()
      fetchRecords()
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
      fetchRecords()
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
      fetchRecords()
    } catch (error: any) {
      console.error('Failed to delete record:', error)
      showToast(error.response?.data?.message || t('deleteFailed'), 'error')
    }
  }

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      managerName: user?.name || '',
      accountId: '',
      customerName: '',
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
      accountId: record.account_id || '',
      customerName: record.customer_name || '',
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

  const fetchMonthlyStats = async (year?: number, month?: number) => {
    try {
      const targetYear = year ?? selectedYear
      const targetMonth = month ?? selectedMonth
      
      if (!targetYear || !targetMonth) {
        showToast(t('error'), 'error')
        return
      }
      
      const response = await api.get('/sales-tracking/stats/monthly', {
        params: { year: targetYear, month: targetMonth }
      })
      setMonthlyStats(response.data || [])
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
  const formatDate = (dateString: string) => {
    if (!dateString) return '-'
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return dateString
      return date.toISOString().split('T')[0]
    } catch {
      // 이미 YYYY-MM-DD 형식인 경우
      return dateString.split('T')[0]
    }
  }

  // 페이지네이션 계산
  const totalPages = Math.ceil(records.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedRecords = records.slice(startIndex, endIndex)

  useEffect(() => {
    // 검색 시 첫 페이지로 리셋
    setCurrentPage(1)
  }, [searchQuery])

  return (
    <div className="p-6 pt-24">
      {/* Global Search - 통합 검색 */}
      <div className="mb-4">
        <GlobalSearch />
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('salesTracking')}</h1>
        <div className="flex gap-2">
          <Button onClick={fetchMonthlyStats} variant="outline">
            <BarChart3 className="h-4 w-4 mr-2" />
            {t('monthlyStats')}
          </Button>
          <Button onClick={() => {
            setEditingId(null)
            setShowAddForm(true)
          }}>
            <Plus className="h-4 w-4 mr-2" />
            {t('quickAdd')}
          </Button>
        </div>
      </div>

      {/* Local Search - 영업이력 페이지 내 검색 */}
      <div className="mb-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder={t('search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Quick Add Form */}
      {showAddForm && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              {editingId ? t('edit') : t('quickAdd')}
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
                <label className="text-sm font-medium">{t('accountId')}</label>
                <Input
                  value={formData.accountId}
                  onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">{t('customerName')}</label>
                <Input
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
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
                  <option value="飲食店">飲食店</option>
                  <option value="娯楽/観光/レジャー">娯楽/観光/レジャー</option>
                  <option value="美容サロン">美容サロン</option>
                  <option value="有形商材">有形商材</option>
                  <option value="個人利用">個人利用</option>
                  <option value="無形商材">無形商材</option>
                  <option value="代理店">代理店</option>
                  <option value="教育">教育</option>
                  <option value="その他">その他</option>
                  <option value="アートメイク">アートメイク</option>
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
                  <option value="電話">電話</option>
                  <option value="LINE">LINE</option>
                  <option value="DM">DM</option>
                  <option value="メール">メール</option>
                  <option value="フォーム">フォーム</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">{t('status')}</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="未返信">未返信</option>
                  <option value="返信済み">返信済み</option>
                  <option value="商談中">商談中</option>
                  <option value="契約">契約</option>
                  <option value="NG">NG</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">{t('contactPerson')}</label>
                <Input
                  value={formData.contactPerson}
                  onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                />
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
                  <th className="px-2 py-2 text-left font-medium border-r w-24">{t('date')}</th>
                  <th className="px-2 py-2 text-left font-medium border-r w-28">{t('managerName')}</th>
                  <th className="px-2 py-2 text-left font-medium border-r w-32">{t('accountId')}</th>
                  <th className="px-2 py-2 text-left font-medium border-r w-32">{t('customerName')}</th>
                  <th className="px-2 py-2 text-left font-medium border-r w-24">{t('industry')}</th>
                  <th className="px-2 py-2 text-left font-medium border-r w-20">{t('contactMethod')}</th>
                  <th className="px-2 py-2 text-left font-medium border-r w-20">{t('status')}</th>
                  <th className="px-2 py-2 text-left font-medium border-r w-24">{t('phone')}</th>
                  <th className="px-2 py-2 text-left font-medium border-r w-32">{t('memo')}</th>
                  <th className="px-2 py-2 text-center font-medium w-20">{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                      {t('loading')}
                    </td>
                  </tr>
                ) : records.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                      {t('noData')}
                    </td>
                  </tr>
                ) : (
                  paginatedRecords.map((record) => (
                    <tr key={record.id} className="border-b hover:bg-gray-50">
                      <td className="px-2 py-1 border-r whitespace-nowrap">{formatDate(record.date)}</td>
                      <td className="px-2 py-1 border-r">{record.manager_name}</td>
                      <td className="px-2 py-1 border-r">{record.account_id || '-'}</td>
                      <td className="px-2 py-1 border-r">{record.customer_name || '-'}</td>
                      <td className="px-2 py-1 border-r">{record.industry || '-'}</td>
                      <td className="px-2 py-1 border-r">{record.contact_method || '-'}</td>
                      <td className="px-2 py-1 border-r">{record.status}</td>
                      <td className="px-2 py-1 border-r">{record.phone || '-'}</td>
                      <td className="px-2 py-1 border-r truncate max-w-xs" title={record.memo || ''}>
                        {record.memo || '-'}
                      </td>
                      <td className="px-2 py-1 text-center">
                        {canEdit(record) && (
                          <div className="flex gap-1 justify-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => startEdit(record)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(record.id)}
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
          {records.length > 0 && totalPages > 1 && (
            <div className="px-4 py-3 border-t flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {t('showing')} {startIndex + 1} - {Math.min(endIndex, records.length)} {t('of')} {records.length}
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
                      <option key={month} value={month}>{month} {t('month')}</option>
                    ))}
                  </select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const now = new Date()
                      setSelectedYear(now.getFullYear())
                      setSelectedMonth(now.getMonth() + 1)
                      fetchMonthlyStats()
                    }}
                  >
                    {t('currentMonth')}
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={fetchMonthlyStats}
                  >
                    {t('search')}
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
                        <th className="px-3 py-2 text-right font-medium border-r w-20">{t('contractCount')}</th>
                        <th className="px-3 py-2 text-right font-medium w-16">{t('ngCount')}</th>
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
                          <td className="px-3 py-2 border-r text-right">{stat.contractCount}</td>
                          <td className="px-3 py-2 text-right">{stat.ngCount}</td>
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
    </div>
  )
}
