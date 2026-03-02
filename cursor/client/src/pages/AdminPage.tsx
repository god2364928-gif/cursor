import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminAuthStore } from '../store/adminAuthStore'
import api, { adminApi, invoiceAPI } from '../lib/api'
import { formatDateTime } from '../lib/utils'
import { useI18nStore } from '../i18n'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Edit2, Trash2, X, RefreshCw, LogOut, Users, BarChart2, UserCheck, FileKey, Calculator, GraduationCap, FileText } from 'lucide-react'
import ExamViewModal from '../components/ExamViewModal'
import DashboardTab from './Accounting/DashboardTab'
import TransactionsTab from './Accounting/TransactionsTab'
import EmployeesTab from './Accounting/EmployeesTab'
import PayrollTab from './Accounting/PayrollTab'
import RecurringTab from './Accounting/RecurringTab'
import CapitalTab from './Accounting/CapitalTab'
import PayPayTab from './Accounting/PayPayTab'
import TotalSalesTab from './Accounting/TotalSalesTab'

interface User {
  id: string
  name: string
  email: string
  role: string
  created_at: string
  last_login_at?: string | null
}

interface UsageRow {
  user_id: string
  user_name: string
  feature_name: string
  total_count: string
  today_count: string
  month_count: string
  last_used_at: string | null
}

const FEATURE_LABELS: Record<string, string> = {
  '계정최적화조회': '계정최적화조회',
  '계정최적화조회2.0': '계정최적화조회 2.0',
  '해시태그분석': '해시태그분석',
  '해시태그일괄조회': '해시태그일괄조회',
  '키워드트렌드분석': '키워드트렌드분석',
}

const TABS = [
  { id: 'accounting', label: '회계', icon: Calculator },
  { id: 'usage', label: '기능 사용 현황', icon: BarChart2 },
  { id: 'exam', label: '시험 관리', icon: GraduationCap },
  { id: 'users', label: '회원관리', icon: Users },
  { id: 'manager', label: '담당자 일괄변경', icon: UserCheck },
  { id: 'freee', label: 'freee 재인증', icon: FileKey },
] as const

type TabId = typeof TABS[number]['id']

type AccountingSubTab = 'dashboard' | 'transactions' | 'paypay' | 'totalsales' | 'employees' | 'payroll' | 'recurring' | 'capital'

const ACCOUNTING_SUBTABS: { key: AccountingSubTab; labelKo: string; labelJa: string }[] = [
  { key: 'dashboard', labelKo: '대시보드', labelJa: 'ダッシュボード' },
  { key: 'transactions', labelKo: '거래내역', labelJa: '取引履歴' },
  { key: 'totalsales', labelKo: '전체매출', labelJa: '全体売上' },
  { key: 'paypay', labelKo: 'PayPay', labelJa: 'PayPay' },
  { key: 'employees', labelKo: '직원', labelJa: '従業員' },
  { key: 'payroll', labelKo: '급여', labelJa: '給与' },
  { key: 'recurring', labelKo: '정기지출', labelJa: '定期支出' },
  { key: 'capital', labelKo: '자본금', labelJa: '資本金' },
]

export default function AdminPage() {
  const navigate = useNavigate()
  const logout = useAdminAuthStore((s) => s.logout)
  const { language } = useI18nStore()

  const [activeTab, setActiveTab] = useState<TabId>('accounting')
  const [accountingSubTab, setAccountingSubTab] = useState<AccountingSubTab>('dashboard')

  // ─── 회원관리 상태 ───────────────────────────────────────
  const [users, setUsers] = useState<User[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'user' })
  const [savingUser, setSavingUser] = useState(false)

  // ─── 담당자 일괄변경 상태 ─────────────────────────────────
  const [managerChangeData, setManagerChangeData] = useState({ oldManager: '', newManager: '' })
  const [changingManager, setChangingManager] = useState(false)

  // ─── freee 재인증 상태 ────────────────────────────────────
  const [resettingAuth, setResettingAuth] = useState(false)

  // ─── 시험 관리 상태 ──────────────────────────────────────
  const [examViewUserId, setExamViewUserId] = useState<string | null>(null)
  const [examViewUserName, setExamViewUserName] = useState<string>('')
  const [examViewInitialRound, setExamViewInitialRound] = useState<number>(1)
  const [showExamViewModal, setShowExamViewModal] = useState(false)

  interface ExamStatus {
    userId: string
    userName: string
    userEmail: string
    userRole: string
    exams: { round: number; isSubmitted: boolean; submittedAt: string | null }[]
  }
  const [examStatuses, setExamStatuses] = useState<ExamStatus[]>([])
  const [examStatusLoading, setExamStatusLoading] = useState(false)
  // openings: { [userId]: [1, 2, ...] }
  const [examOpenings, setExamOpenings] = useState<Record<string, number[]>>({})
  const [togglingExam, setTogglingExam] = useState<string | null>(null) // "userId-round"

  // ─── 기능 사용 현황 상태 ──────────────────────────────────
  const [usageRows, setUsageRows] = useState<UsageRow[]>([])
  const [usageLoading, setUsageLoading] = useState(false)
  const [filterUser, setFilterUser] = useState('')
  const [filterFeature, setFilterFeature] = useState('')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')

  useEffect(() => {
    fetchUsers()
  }, [])

  useEffect(() => {
    if (activeTab === 'usage') fetchUsage()
    if (activeTab === 'exam') fetchExamStatuses()
  }, [activeTab])

  const fetchUsers = async () => {
    try {
      const res = await adminApi.get('/auth/users')
      setUsers(res.data)
    } catch {
      /* silent */
    }
  }

  const fetchUsage = useCallback(async () => {
    setUsageLoading(true)
    try {
      const params: Record<string, string> = {}
      if (filterUser) params.user_id = filterUser
      if (filterFeature) params.feature = filterFeature
      if (filterFrom) params.from_date = filterFrom
      if (filterTo) params.to_date = filterTo
      const res = await adminApi.get('/admin/feature-usage', { params })
      setUsageRows(res.data)
    } catch {
      /* silent */
    } finally {
      setUsageLoading(false)
    }
  }, [filterUser, filterFeature, filterFrom, filterTo])

  // ─── 시험 현황 조회 ───────────────────────────────────────
  const fetchExamStatuses = async () => {
    setExamStatusLoading(true)
    try {
      const [statusRes, openingRes] = await Promise.all([
        api.get('/exam/all-submission-status'),
        api.get('/exam/openings'),
      ])
      setExamStatuses(statusRes.data)
      setExamOpenings(openingRes.data)
    } catch {
      /* silent */
    } finally {
      setExamStatusLoading(false)
    }
  }

  const toggleExamOpen = async (userId: string, round: number, isCurrentlyOpen: boolean) => {
    const key = `${userId}-${round}`
    setTogglingExam(key)
    try {
      if (isCurrentlyOpen) {
        await api.delete('/exam/openings', { data: { userId, examRound: round } })
      } else {
        await api.post('/exam/openings', { userId, examRound: round })
      }
      const res = await api.get('/exam/openings')
      setExamOpenings(res.data)
    } catch {
      alert('처리에 실패했습니다.')
    } finally {
      setTogglingExam(null)
    }
  }

  const openExamModal = (userId: string, userName: string, round: number) => {
    setExamViewUserId(userId)
    setExamViewUserName(userName)
    setExamViewInitialRound(round)
    setShowExamViewModal(true)
  }

  // ─── 회원관리 핸들러 ──────────────────────────────────────
  const startEdit = (u: User) => {
    setEditingId(u.id)
    setFormData({ name: u.name, email: u.email, password: '', role: u.role })
    setShowAddForm(false)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setFormData({ name: '', email: '', password: '', role: 'user' })
  }

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingUser(true)
    try {
      if (editingId) {
        await adminApi.put(`/auth/users/${editingId}`, formData)
      } else {
        await adminApi.post('/auth/users', formData)
      }
      cancelEdit()
      setShowAddForm(false)
      fetchUsers()
    } catch (error: any) {
      alert(error.response?.data?.message || '저장에 실패했습니다.')
    } finally {
      setSavingUser(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return
    try {
      await adminApi.delete(`/auth/users/${id}`)
      fetchUsers()
    } catch (error: any) {
      alert(error.response?.data?.message || '삭제에 실패했습니다.')
    }
  }

  // ─── 담당자 일괄변경 핸들러 ───────────────────────────────
  const handleManagerChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!managerChangeData.oldManager || !managerChangeData.newManager) {
      alert('이전 담당자와 새 담당자를 모두 입력해주세요.')
      return
    }
    if (!confirm(`"${managerChangeData.oldManager}" → "${managerChangeData.newManager}"\n\n모든 고객, 리타게팅, 영업이력 데이터의 담당자가 변경됩니다.\n계속하시겠습니까?`)) return

    setChangingManager(true)
    try {
      const res = await adminApi.post('/auth/bulk-change-manager', {
        oldManager: managerChangeData.oldManager,
        newManager: managerChangeData.newManager,
      })
      const changes = res.data.changes
      alert(`담당자 일괄 변경 완료!\n\n고객관리: ${changes.customers}건\n리타게팅: ${changes.retargeting}건\n영업이력: ${changes.salesTracking}건`)
      setManagerChangeData({ oldManager: '', newManager: '' })
    } catch (error: any) {
      alert('담당자 변경 실패: ' + (error.response?.data?.message || error.message))
    } finally {
      setChangingManager(false)
    }
  }

  // ─── freee 재인증 핸들러 ──────────────────────────────────
  const handleResetFreeeAuth = async () => {
    if (!confirm('freee 인증을 초기화하시겠습니까? 다시 인증해야 합니다.')) return
    setResettingAuth(true)
    try {
      await invoiceAPI.resetAuth()
      alert('freee 인증이 초기화되었습니다. 청구서 발행 페이지로 이동합니다.')
      navigate('/invoices/create')
    } catch (error: any) {
      alert('인증 초기화 실패: ' + (error.response?.data?.error || error.message))
    } finally {
      setResettingAuth(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/admin/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 최상단 헤더 */}
      <div className="bg-white border-b shadow-sm h-14 flex items-center px-6 gap-4">
        {/* 현재 페이지명 */}
        <div className="w-44 flex-shrink-0">
          <span className="text-sm font-bold text-gray-800">
            {TABS.find((t) => t.id === activeTab)?.label || '어드민'}
          </span>
        </div>

        {/* 회계 서브탭 (회계 탭일 때만 표시) */}
        {activeTab === 'accounting' && (
          <nav className="flex items-center gap-1 flex-1 overflow-x-auto">
            {ACCOUNTING_SUBTABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setAccountingSubTab(tab.key)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                  accountingSubTab === tab.key
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {language === 'ja' ? tab.labelJa : tab.labelKo}
              </button>
            ))}
          </nav>
        )}

        {/* 로그아웃 */}
        <Button variant="outline" size="sm" onClick={handleLogout} className="ml-auto flex items-center gap-1.5 flex-shrink-0">
          <LogOut className="w-3.5 h-3.5" />
          로그아웃
        </Button>
      </div>

      <div className="flex">
        {/* 사이드바 - 네이비 */}
        <aside className="w-44 min-h-screen bg-slate-800 pt-2 flex-shrink-0">
          {TABS.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {tab.label}
              </button>
            )
          })}
        </aside>

        {/* 컨텐츠 */}
        <main className="flex-1 p-6 space-y-6 min-w-0">

          {/* ── 기능 사용 현황 탭 ── */}
          {activeTab === 'usage' && (
            <Card className="rounded-xl shadow-sm border border-gray-100">
              <CardHeader>
                <CardTitle>기능 사용 현황</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 필터 */}
                <div className="flex flex-wrap gap-3 items-end">
                  <div>
                    <Label className="text-xs">직원</Label>
                    <select
                      value={filterUser}
                      onChange={(e) => setFilterUser(e.target.value)}
                      className="block mt-1 px-3 py-2 border rounded-md text-sm w-36"
                    >
                      <option value="">전체</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs">기능</Label>
                    <select
                      value={filterFeature}
                      onChange={(e) => setFilterFeature(e.target.value)}
                      className="block mt-1 px-3 py-2 border rounded-md text-sm w-44"
                    >
                      <option value="">전체</option>
                      {Object.entries(FEATURE_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs">시작일</Label>
                    <Input
                      type="date"
                      value={filterFrom}
                      onChange={(e) => setFilterFrom(e.target.value)}
                      className="mt-1 w-36 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">종료일</Label>
                    <Input
                      type="date"
                      value={filterTo}
                      onChange={(e) => setFilterTo(e.target.value)}
                      className="mt-1 w-36 text-sm"
                    />
                  </div>
                  <Button onClick={fetchUsage} disabled={usageLoading} size="sm">
                    {usageLoading ? '조회 중...' : '조회'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFilterUser('')
                      setFilterFeature('')
                      setFilterFrom('')
                      setFilterTo('')
                    }}
                  >
                    초기화
                  </Button>
                </div>

                {/* 테이블 */}
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">직원</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">기능</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">오늘</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">이번달</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">전체</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">마지막 조회</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {usageRows.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                            {usageLoading ? '불러오는 중...' : '조회된 데이터가 없습니다.'}
                          </td>
                        </tr>
                      ) : (
                        usageRows.map((row, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium">{row.user_name}</td>
                            <td className="px-4 py-3">{FEATURE_LABELS[row.feature_name] || row.feature_name}</td>
                            <td className="px-4 py-3 text-center">{row.today_count}</td>
                            <td className="px-4 py-3 text-center">{row.month_count}</td>
                            <td className="px-4 py-3 text-center font-semibold">{row.total_count}</td>
                            <td className="px-4 py-3 text-gray-500">
                              {row.last_used_at ? formatDateTime(row.last_used_at) : '-'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── 시험 관리 탭 ── */}
          {activeTab === 'exam' && (
            <Card className="rounded-xl shadow-sm border border-gray-100">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>직원 역량평가 관리</CardTitle>
                  <Button variant="outline" size="sm" onClick={fetchExamStatuses} disabled={examStatusLoading}>
                    {examStatusLoading ? '불러오는 중...' : '새로고침'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">이름</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">이메일</th>
                        {[1, 2, 3].map((r) => (
                          <th key={r} className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                            {r}차 시험
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {examStatusLoading ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-gray-400">불러오는 중...</td>
                        </tr>
                      ) : examStatuses.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-gray-400">데이터가 없습니다.</td>
                        </tr>
                      ) : (
                        examStatuses.map((s) => {
                          const openedRounds = examOpenings[s.userId] || []
                          const isSubmitted = (round: number) =>
                            s.exams.some((e) => e.round === round && e.isSubmitted)
                          const isOpen = (round: number) => openedRounds.includes(round)

                          return (
                            <tr key={s.userId} className="hover:bg-gray-50">
                              <td className="px-4 py-3 font-medium">{s.userName}</td>
                              <td className="px-4 py-3 text-gray-500 text-xs">{s.userEmail}</td>
                              {[1, 2, 3].map((round) => {
                                const submitted = isSubmitted(round)
                                const open = isOpen(round)
                                const toggling = togglingExam === `${s.userId}-${round}`
                                return (
                                  <td key={round} className="px-3 py-3 text-center">
                                    <div className="flex flex-col items-center gap-1">
                                      {/* 완료 상태 */}
                                      {submitted ? (
                                        <>
                                          <span className="text-xs text-green-600 font-semibold">✓ 완료</span>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="text-xs h-6 px-2 text-blue-600 hover:bg-blue-50"
                                            onClick={() => openExamModal(s.userId, s.userName, round)}
                                          >
                                            답변 보기
                                          </Button>
                                        </>
                                      ) : open ? (
                                        <>
                                          <span className="text-xs text-orange-500 font-medium">응시 가능</span>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="text-xs h-6 px-2 text-red-500 border-red-200 hover:bg-red-50"
                                            disabled={toggling}
                                            onClick={() => toggleExamOpen(s.userId, round, true)}
                                          >
                                            {toggling ? '...' : '닫기'}
                                          </Button>
                                        </>
                                      ) : (
                                        <>
                                          <span className="text-xs text-gray-300">미응시</span>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="text-xs h-6 px-2 text-blue-600 border-blue-200 hover:bg-blue-50"
                                            disabled={toggling}
                                            onClick={() => toggleExamOpen(s.userId, round, false)}
                                          >
                                            {toggling ? '...' : '오픈'}
                                          </Button>
                                        </>
                                      )}
                                    </div>
                                  </td>
                                )
                              })}
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-gray-400 mt-3">
                  * 오픈: 해당 직원에게 시험 응시 버튼 활성화 / 닫기: 비활성화 / 직원이 제출하면 자동으로 닫힘
                </p>
              </CardContent>
            </Card>
          )}

          {/* ── 회원관리 탭 ── */}
          {activeTab === 'users' && (
            <Card className="rounded-xl shadow-sm border border-gray-100">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>회원관리</CardTitle>
                  <Button onClick={() => { setShowAddForm(!showAddForm); cancelEdit() }} disabled={editingId !== null}>
                    회원 추가
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {(showAddForm || editingId) && (
                  <form onSubmit={handleUserSubmit} className="mb-6 space-y-4 p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">{editingId ? '회원 수정' : '회원 추가'}</h3>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={editingId ? cancelEdit : () => setShowAddForm(false)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div>
                      <Label>이름 *</Label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label>이메일 *</Label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label>비밀번호 {editingId && '(변경하지 않으려면 비워두세요)'}</Label>
                      <Input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        required={!editingId}
                      />
                    </div>
                    <div>
                      <Label>역할</Label>
                      <select
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        className="w-full px-3 py-2 border rounded-md"
                      >
                        <option value="user">user</option>
                        <option value="manager">manager</option>
                        <option value="marketer">marketer</option>
                        <option value="admin">admin</option>
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" disabled={savingUser}>
                        {savingUser ? '저장 중...' : '저장'}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={editingId ? cancelEdit : () => setShowAddForm(false)}
                      >
                        취소
                      </Button>
                    </div>
                  </form>
                )}

                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">이름</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">이메일</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">역할</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">마지막 로그인</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">작업</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {users.map((u) => (
                        <tr key={u.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium">{u.name}</td>
                          <td className="px-4 py-3">{u.email}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-xs ${
                              u.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-500">
                            {formatDateTime(u.last_login_at) || '-'}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => startEdit(u)}
                                disabled={editingId !== null && editingId !== u.id}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(u.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── 회계 탭 ── */}
          {activeTab === 'accounting' && (
            <div className="bg-white rounded-xl shadow-sm">
              {accountingSubTab === 'dashboard' && <DashboardTab language={language} isAdmin={true} />}
              {accountingSubTab === 'transactions' && <TransactionsTab language={language} isAdmin={true} onTransactionChange={() => {}} />}
              {accountingSubTab === 'employees' && <EmployeesTab isAdmin={true} />}
              {accountingSubTab === 'payroll' && <PayrollTab language={language} isAdmin={true} />}
              {accountingSubTab === 'recurring' && <RecurringTab language={language} isAdmin={true} />}
              {accountingSubTab === 'capital' && <CapitalTab language={language} isAdmin={true} />}
              {accountingSubTab === 'paypay' && <PayPayTab language={language} isAdmin={true} />}
              {accountingSubTab === 'totalsales' && <TotalSalesTab language={language} isAdmin={true} />}
            </div>
          )}

          {/* ── 담당자 일괄변경 탭 ── */}
          {activeTab === 'manager' && (
            <Card className="rounded-xl shadow-sm border border-gray-100">
              <CardHeader>
                <CardTitle>담당자 일괄 변경</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  직원이 퇴사하거나 이름을 변경했을 때, 모든 데이터의 담당자를 일괄 변경합니다.
                  <br />
                  <span className="text-red-600 font-medium">⚠️ 고객관리, 리타게팅, 영업이력의 모든 데이터가 변경됩니다.</span>
                </p>
                <form onSubmit={handleManagerChange} className="space-y-4 max-w-sm">
                  <div>
                    <Label>이전 담당자 이름 *</Label>
                    <Input
                      value={managerChangeData.oldManager}
                      onChange={(e) => setManagerChangeData({ ...managerChangeData, oldManager: e.target.value })}
                      placeholder=""
                      required
                    />
                    <p className="text-xs text-muted-foreground mt-1">띄어쓰기와 대소문자를 정확히 입력해주세요.</p>
                  </div>
                  <div>
                    <Label>새 담당자 이름 *</Label>
                    <Input
                      value={managerChangeData.newManager}
                      onChange={(e) => setManagerChangeData({ ...managerChangeData, newManager: e.target.value })}
                      placeholder=""
                      required
                    />
                  </div>
                  <Button type="submit" disabled={changingManager} className="bg-orange-600 hover:bg-orange-700">
                    {changingManager ? '변경 중...' : '일괄 변경 실행'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* ── freee 재인증 탭 ── */}
          {activeTab === 'freee' && (
            <Card className="rounded-xl shadow-sm border border-gray-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="w-5 h-5" />
                  freee 재인증
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-w-sm">
                  <p className="text-sm text-muted-foreground">
                    freee請求書 API 권한을 추가한 경우, 기존 인증을 초기화하고 다시 인증해야 합니다.
                  </p>
                  <Button
                    onClick={handleResetFreeeAuth}
                    variant="outline"
                    disabled={resettingAuth}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className={`w-4 h-4 ${resettingAuth ? 'animate-spin' : ''}`} />
                    {resettingAuth ? '초기화 중...' : 'freee 인증 초기화'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

        </main>
      </div>

      <ExamViewModal
        open={showExamViewModal}
        onOpenChange={(open) => {
          setShowExamViewModal(open)
          if (!open) {
            setExamViewUserId(null)
            setExamViewUserName('')
          }
        }}
        userId={examViewUserId}
        userName={examViewUserName}
        initialRound={examViewInitialRound}
      />
    </div>
  )
}
