import { useEffect, useState, useCallback, useMemo } from 'react'
import api from '../../../lib/api'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Plus, X, Pencil, Trash2 } from 'lucide-react'
import { useLeaveLabels, formatYmd, type GrantType } from '../leaveLabels'

interface MandatoryStatus {
  applicable: boolean
  required: number
  used: number
  remaining: number
  baseDate: string | null
  deadline: string | null
  daysUntilDeadline: number | null
}

interface SummaryRow {
  id: number
  name: string
  email: string
  department: string | null
  team: string | null
  hire_date: string | null
  employment_status: string | null
  granted: number
  consumed: number
  pending: number
  expired: number
  remaining: number
  mandatory?: MandatoryStatus
}

interface Grant {
  id: number
  user_id: number
  user_name: string
  hire_date: string | null
  grant_date: string
  expires_at: string
  days: number
  grant_type: GrantType
  service_years_at_grant: number | null
  notes: string | null
  created_at: string
}

export default function LeaveGrantsPage() {
  const { t, grantTypeLabel } = useLeaveLabels()
  const [summary, setSummary] = useState<SummaryRow[]>([])
  const [search, setSearch] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState<string>('all')
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [grants, setGrants] = useState<Grant[]>([])
  const [loadingSummary, setLoadingSummary] = useState(true)
  const [loadingGrants, setLoadingGrants] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingGrant, setEditingGrant] = useState<Grant | null>(null)

  const fetchSummary = useCallback(async () => {
    setLoadingSummary(true)
    try {
      const res = await api.get('/admin/vacation/summary')
      setSummary(res.data)
    } catch (e) {
      console.error('summary fetch error:', e)
    } finally {
      setLoadingSummary(false)
    }
  }, [])

  const fetchGrants = useCallback(async (userId: number) => {
    setLoadingGrants(true)
    try {
      const res = await api.get(`/admin/vacation/grants/${userId}`)
      setGrants(res.data)
    } catch (e) {
      console.error('grants fetch error:', e)
    } finally {
      setLoadingGrants(false)
    }
  }, [])

  useEffect(() => {
    fetchSummary()
  }, [fetchSummary])

  useEffect(() => {
    if (selectedUserId) fetchGrants(selectedUserId)
  }, [selectedUserId, fetchGrants])

  const departmentOptions = useMemo(() => {
    const set = new Set<string>()
    summary.forEach((s) => s.department && set.add(s.department))
    return Array.from(set).sort()
  }, [summary])

  const filtered = useMemo(() => {
    return summary.filter((s) => {
      if (departmentFilter !== 'all' && s.department !== departmentFilter) return false
      if (search && !s.name.includes(search) && !(s.email || '').includes(search)) return false
      return true
    })
  }, [summary, search, departmentFilter])

  const selectedUser = summary.find((s) => s.id === selectedUserId)

  const removeGrant = async (id: number) => {
    if (!confirm(t('grants_confirm_delete'))) return
    try {
      await api.delete(`/admin/vacation/grants/${id}`)
      if (selectedUserId) await fetchGrants(selectedUserId)
      await fetchSummary()
    } catch (e: any) {
      alert(e?.response?.data?.error || t('err_delete_failed'))
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('erp_grants_mgmt')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('grants_subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <section className="lg:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 space-y-2">
            <h2 className="text-sm font-semibold">{t('grants_employee_list')}</h2>
            <Input
              placeholder={t('grants_search_placeholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-sm h-8"
            />
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="text-sm border border-gray-200 rounded px-2 py-1 bg-white w-full"
            >
              <option value="all">{t('grants_all_dept')}</option>
              {departmentOptions.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div className="max-h-[600px] overflow-y-auto">
            {loadingSummary || filtered.length === 0 ? (
              <div className="p-6 text-sm text-gray-400 text-center">
                {loadingSummary ? t('loading_short') : t('empty_approvals')}
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {filtered.map((s) => (
                  <li
                    key={s.id}
                    onClick={() => setSelectedUserId(s.id)}
                    className={`p-3 cursor-pointer hover:bg-gray-50 ${
                      selectedUserId === s.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{s.name}</div>
                        <div className="text-xs text-gray-500 truncate">
                          {s.department || s.team || '-'} · {formatYmd(s.hire_date)}
                        </div>
                        <MandatoryBadge m={s.mandatory} t={t} />
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-semibold text-blue-700">{s.remaining}{t('unit_day')}</div>
                        <div className="text-[10px] text-gray-500">{t('leave_remaining')}</div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="lg:col-span-3 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-sm font-semibold">
              {selectedUser ? `${selectedUser.name}${t('grants_history_for_suffix')}` : t('grants_history_default')}
            </h2>
            {selectedUser && (
              <Button size="sm" onClick={() => setShowAddForm(true)} className="gap-1 h-7 text-xs">
                <Plus className="h-3 w-3" />
                {t('grants_manual_grant_btn')}
              </Button>
            )}
          </div>
          {!selectedUser ? (
            <div className="p-12 text-center text-sm text-gray-400">
              {t('grants_select_employee')}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-4 divide-x divide-gray-100 border-b border-gray-200 text-center">
                <Mini label={t('leave_total_granted')} value={`${selectedUser.granted}${t('unit_day')}`} />
                <Mini label={t('leave_used')} value={`${selectedUser.consumed}${t('unit_day')}`} />
                <Mini label={t('status_pending')} value={`${selectedUser.pending}${t('unit_day')}`} />
                <Mini label={t('leave_remaining')} value={`${selectedUser.remaining}${t('unit_day')}`} accent />
              </div>

              {loadingGrants || grants.length === 0 ? (
                <div className="p-12 text-center text-sm text-gray-400">
                  {loadingGrants ? t('loading_short') : t('grants_no_history')}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="px-4 py-2.5 text-left font-medium text-xs">{t('col_grant_date')}</th>
                        <th className="px-4 py-2.5 text-left font-medium text-xs">{t('col_type')}</th>
                        <th className="px-4 py-2.5 text-right font-medium text-xs">{t('col_days')}</th>
                        <th className="px-4 py-2.5 text-left font-medium text-xs">{t('col_expires')}</th>
                        <th className="px-4 py-2.5 text-left font-medium text-xs">{t('col_notes')}</th>
                        <th className="px-4 py-2.5 text-right font-medium text-xs">{t('col_actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {grants.map((g) => (
                        <tr key={g.id} className="border-t border-gray-100 hover:bg-gray-50">
                          <td className="px-4 py-3">{formatYmd(g.grant_date)}</td>
                          <td className="px-4 py-3">
                            <span className="inline-block px-2 py-0.5 text-xs rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {grantTypeLabel(g.grant_type)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold">{g.days}{t('unit_day')}</td>
                          <td className="px-4 py-3">{formatYmd(g.expires_at)}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{g.notes || '-'}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-1">
                              <button
                                onClick={() => setEditingGrant(g)}
                                className="text-gray-400 hover:text-blue-600"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => removeGrant(g.id)}
                                className="text-gray-400 hover:text-red-600"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </section>
      </div>

      {showAddForm && selectedUser && (
        <GrantForm
          userId={selectedUser.id}
          userName={selectedUser.name}
          onClose={() => setShowAddForm(false)}
          onSaved={async () => {
            setShowAddForm(false)
            if (selectedUserId) await fetchGrants(selectedUserId)
            await fetchSummary()
          }}
        />
      )}
      {editingGrant && (
        <EditGrantForm
          grant={editingGrant}
          onClose={() => setEditingGrant(null)}
          onSaved={async () => {
            setEditingGrant(null)
            if (selectedUserId) await fetchGrants(selectedUserId)
            await fetchSummary()
          }}
        />
      )}
    </div>
  )
}

function MandatoryBadge({
  m,
  t,
}: {
  m: MandatoryStatus | undefined
  t: (k: string) => string
}) {
  if (!m || !m.applicable) return null
  const completed = m.remaining === 0
  const dDay = m.daysUntilDeadline
  const danger = !completed && dDay !== null && dDay <= 30
  const warning = !completed && dDay !== null && dDay > 30 && dDay <= 90
  const tone = completed
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : danger
      ? 'bg-red-50 text-red-700 border-red-200'
      : warning
        ? 'bg-amber-50 text-amber-700 border-amber-200'
        : 'bg-blue-50 text-blue-700 border-blue-200'

  const dDayLabel =
    dDay === null ? '' : dDay > 0 ? ` D-${dDay}` : dDay === 0 ? ' D-DAY' : ` +${-dDay}${t('unit_day')}`

  return (
    <div
      className={`inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 text-[10px] rounded border ${tone}`}
    >
      {completed ? (
        <>✅ {t('mandatory_short')} 5{t('unit_day')} {t('mandatory_short_done')}</>
      ) : (
        <>
          {t('mandatory_short')} {t('leave_remaining')} <span className="font-semibold">{m.remaining}{t('unit_day')}</span>
          <span className="opacity-75">{dDayLabel}</span>
        </>
      )}
    </div>
  )
}

function Mini({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="py-3">
      <div className="text-[11px] text-gray-500">{label}</div>
      <div className={`text-base font-bold mt-0.5 ${accent ? 'text-blue-700' : 'text-gray-900'}`}>
        {value}
      </div>
    </div>
  )
}

function GrantForm({
  userId,
  userName,
  onClose,
  onSaved,
}: {
  userId: number
  userName: string
  onClose: () => void
  onSaved: () => void
}) {
  const { t } = useLeaveLabels()
  const [grantDate, setGrantDate] = useState(new Date().toISOString().slice(0, 10))
  const [days, setDays] = useState('')
  const [grantType, setGrantType] = useState<GrantType>('manual')
  const [expiresAt, setExpiresAt] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!grantDate || !days) {
      setError(t('grants_input_required'))
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await api.post('/admin/vacation/grants', {
        userId,
        grantDate,
        days: Number(days),
        grantType,
        expiresAt: expiresAt || undefined,
        notes: notes || undefined,
      })
      onSaved()
    } catch (err: any) {
      setError(err?.response?.data?.error || t('err_grant_failed'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50 rounded-t-xl">
          <h2 className="text-lg font-semibold">{userName}{t('grants_modal_grant_title_suffix')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('grants_modal_grant_date_lbl')} *</label>
            <input
              type="date"
              value={grantDate}
              onChange={(e) => setGrantDate(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('grants_modal_days_lbl')} *</label>
            <input
              type="number"
              step="0.5"
              value={days}
              onChange={(e) => setDays(e.target.value)}
              required
              placeholder="5"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('grants_modal_kind_lbl')}</label>
            <select
              value={grantType}
              onChange={(e) => setGrantType(e.target.value as GrantType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
            >
              <option value="manual">{t('grant_type_manual')}</option>
              <option value="special">{t('grant_type_special')}</option>
              <option value="condolence">{t('grant_type_condolence')}</option>
              <option value="annual">{t('grant_type_annual')}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('grants_modal_expires_lbl')} <span className="text-gray-400 font-normal">{t('grants_modal_expires_default')}</span>
            </label>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('grants_modal_notes_lbl')}</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-none"
            />
          </div>
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
              {error}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              {t('modal_cancel')}
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? t('grants_modal_saving') : t('grants_modal_save_grant')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

function EditGrantForm({
  grant,
  onClose,
  onSaved,
}: {
  grant: Grant
  onClose: () => void
  onSaved: () => void
}) {
  const { t } = useLeaveLabels()
  const [days, setDays] = useState(String(grant.days))
  const [expiresAt, setExpiresAt] = useState(grant.expires_at?.slice(0, 10) || '')
  const [notes, setNotes] = useState(grant.notes || '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await api.patch(`/admin/vacation/grants/${grant.id}`, {
        days: Number(days),
        expiresAt,
        notes,
      })
      onSaved()
    } catch (err: any) {
      setError(err?.response?.data?.error || t('err_save_failed'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50 rounded-t-xl">
          <h2 className="text-lg font-semibold">{t('grants_modal_edit_title')} ({formatYmd(grant.grant_date)})</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('grants_modal_days_lbl')}</label>
            <input
              type="number"
              step="0.5"
              value={days}
              onChange={(e) => setDays(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('grants_modal_expires_lbl')}</label>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('grants_modal_notes_lbl')}</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-none"
            />
          </div>
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
              {error}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              {t('modal_cancel')}
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? t('grants_modal_saving') : t('grants_modal_save')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
