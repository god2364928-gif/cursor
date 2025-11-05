import { useState, useEffect } from 'react'
import api from '../lib/api'
import { useAuthStore } from '../store/authStore'
import { useI18nStore } from '../i18n'
import { useToast } from '../components/ui/toast'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Plus, Edit, Trash2, X, BarChart3 } from 'lucide-react'

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
      setRecords(response.data)
    } catch (error) {
      console.error('Failed to fetch records:', error)
      showToast(t('loading') + ' ' + t('error'), 'error')
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
      memoNote: ''
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

  const fetchMonthlyStats = async () => {
    try {
      const response = await api.get('/sales-tracking/stats/monthly', {
        params: { year: selectedYear, month: selectedMonth }
      })
      setMonthlyStats(response.data)
      setShowStatsModal(true)
    } catch (error) {
      console.error('Failed to fetch stats:', error)
      showToast(t('error'), 'error')
    }
  }

  const canEdit = (record: SalesTrackingRecord) => {
    return user?.role === 'admin' || record.user_id === user?.id
  }

  return (
    <div className="p-6 pt-24">
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

      {/* Search */}
      <div className="mb-4">
        <Input
          type="text"
          placeholder={t('search')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />
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
                  onChange={(e) => setFormData({ ...formData, managerName: e.target.value })}
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
                <Input
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                />
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
              <div className="md:col-span-2">
                <label className="text-sm font-medium">{t('memoNote')}</label>
                <Input
                  value={formData.memoNote}
                  onChange={(e) => setFormData({ ...formData, memoNote: e.target.value })}
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
                  <th className="px-2 py-2 text-left font-medium border-r">{t('date')}</th>
                  <th className="px-2 py-2 text-left font-medium border-r">{t('managerName')}</th>
                  <th className="px-2 py-2 text-left font-medium border-r">{t('accountId')}</th>
                  <th className="px-2 py-2 text-left font-medium border-r">{t('customerName')}</th>
                  <th className="px-2 py-2 text-left font-medium border-r">{t('industry')}</th>
                  <th className="px-2 py-2 text-left font-medium border-r">{t('contactMethod')}</th>
                  <th className="px-2 py-2 text-left font-medium border-r">{t('status')}</th>
                  <th className="px-2 py-2 text-left font-medium border-r">{t('contactPerson')}</th>
                  <th className="px-2 py-2 text-left font-medium border-r">{t('phone')}</th>
                  <th className="px-2 py-2 text-left font-medium border-r">{t('memo')}</th>
                  <th className="px-2 py-2 text-left font-medium border-r">{t('memoNote')}</th>
                  <th className="px-2 py-2 text-center font-medium">{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={12} className="px-4 py-8 text-center text-gray-500">
                      {t('loading')}
                    </td>
                  </tr>
                ) : records.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-4 py-8 text-center text-gray-500">
                      {t('noData')}
                    </td>
                  </tr>
                ) : (
                  records.map((record) => (
                    <tr key={record.id} className="border-b hover:bg-gray-50">
                      <td className="px-2 py-1 border-r">{record.date}</td>
                      <td className="px-2 py-1 border-r">{record.manager_name}</td>
                      <td className="px-2 py-1 border-r">{record.account_id || '-'}</td>
                      <td className="px-2 py-1 border-r">{record.customer_name || '-'}</td>
                      <td className="px-2 py-1 border-r">{record.industry || '-'}</td>
                      <td className="px-2 py-1 border-r">{record.contact_method || '-'}</td>
                      <td className="px-2 py-1 border-r">{record.status}</td>
                      <td className="px-2 py-1 border-r">{record.contact_person || '-'}</td>
                      <td className="px-2 py-1 border-r">{record.phone || '-'}</td>
                      <td className="px-2 py-1 border-r max-w-xs truncate" title={record.memo || ''}>
                        {record.memo || '-'}
                      </td>
                      <td className="px-2 py-1 border-r max-w-xs truncate" title={record.memo_note || ''}>
                        {record.memo_note || '-'}
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
        </CardContent>
      </Card>

      {/* Monthly Stats Modal */}
      {showStatsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-4xl max-h-[80vh] overflow-auto">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {t('monthlyStats')} - {selectedYear}/{selectedMonth}
                <div className="flex gap-2">
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="px-2 py-1 border rounded"
                  >
                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="px-2 py-1 border rounded"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                      <option key={month} value={month}>{month}</option>
                    ))}
                  </select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedYear(new Date().getFullYear())
                      setSelectedMonth(new Date().getMonth() + 1)
                    }}
                  >
                    {t('currentMonth')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      fetchMonthlyStats()
                    }}
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
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium border-r">{t('managerName')}</th>
                      <th className="px-3 py-2 text-right font-medium border-r">{t('phoneCount')}</th>
                      <th className="px-3 py-2 text-right font-medium border-r">{t('sendCount')}</th>
                      <th className="px-3 py-2 text-right font-medium border-r">{t('totalCount')}</th>
                      <th className="px-3 py-2 text-right font-medium border-r">{t('replyCount')}</th>
                      <th className="px-3 py-2 text-right font-medium border-r">{t('replyRate')}</th>
                      <th className="px-3 py-2 text-right font-medium border-r">{t('retargetingCount')}</th>
                      <th className="px-3 py-2 text-right font-medium border-r">{t('negotiationCount')}</th>
                      <th className="px-3 py-2 text-right font-medium border-r">{t('contractCount')}</th>
                      <th className="px-3 py-2 text-right font-medium">{t('ngCount')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyStats.map((stat) => (
                      <tr key={stat.manager} className="border-b">
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
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
