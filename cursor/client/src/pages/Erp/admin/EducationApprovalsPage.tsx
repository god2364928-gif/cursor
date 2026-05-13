import { useEffect, useState, useCallback } from 'react'
import {
  GraduationCap,
  Check,
  X,
  CreditCard,
  CheckCircle2,
  Undo2,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
  RefreshCw,
} from 'lucide-react'
import { useI18nStore } from '../../../i18n'
import { Button } from '../../../components/ui/button'
import {
  adminList,
  adminAct,
  adminSweep,
  fileDownloadUrl,
  type EducationRequest,
  type EducationStatus,
  type AdminAction,
} from '../educationApi'

function formatYen(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—'
  return '¥' + Number(n).toLocaleString('ja-JP')
}

function formatYmd(s?: string | null): string {
  if (!s) return '-'
  return s.slice(0, 10)
}

const STATUS_TABS: { key: '' | EducationStatus; labelKey: string }[] = [
  { key: 'pending', labelKey: 'education_status_pending' },
  { key: 'approved', labelKey: 'education_status_approved' },
  { key: 'paid', labelKey: 'education_status_paid' },
  { key: 'evidence_pending', labelKey: 'education_status_evidence_pending' },
  { key: 'completed', labelKey: 'education_status_completed' },
  { key: '', labelKey: 'education_status_all' },
  { key: 'rejected', labelKey: 'education_status_rejected' },
  { key: 'refunded', labelKey: 'education_status_refunded' },
  { key: 'cancelled', labelKey: 'education_status_cancelled' },
]

function statusColor(s: EducationStatus): string {
  switch (s) {
    case 'draft':
      return 'bg-gray-100 text-gray-700'
    case 'pending':
      return 'bg-amber-100 text-amber-800'
    case 'approved':
      return 'bg-blue-100 text-blue-800'
    case 'paid':
      return 'bg-indigo-100 text-indigo-800'
    case 'evidence_pending':
      return 'bg-purple-100 text-purple-800'
    case 'completed':
      return 'bg-emerald-100 text-emerald-800'
    case 'rejected':
      return 'bg-rose-100 text-rose-800'
    case 'cancelled':
      return 'bg-gray-100 text-gray-600'
    case 'refunded':
      return 'bg-red-100 text-red-800'
  }
}

export default function EducationApprovalsPage() {
  const { t } = useI18nStore()
  const year = new Date().getFullYear()
  const [statusFilter, setStatusFilter] = useState<'' | EducationStatus>('pending')
  const [items, setItems] = useState<EducationRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)

  const load = useCallback(async () => {
    try {
      setError('')
      const res = await adminList({ status: statusFilter || undefined })
      setItems(res.items)
    } catch (e: any) {
      setError(e?.message || 'Failed')
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    void load()
  }, [load])

  async function act(req: EducationRequest, action: AdminAction) {
    setBusyId(req.id)
    try {
      let extra: Record<string, unknown> = {}
      if (action === 'reject') {
        const r = prompt(t('education_prompt_reject_reason'))
        if (r === null) return
        extra.reject_reason = r
      } else if (action === 'refund') {
        const r = prompt(t('education_prompt_refund_reason'))
        if (r === null) return
        extra.refund_reason = r
      } else if (action === 'mark_completed') {
        const v = prompt(t('education_prompt_reimbursed'), String(req.cost))
        if (v === null) return
        const n = Number(v)
        if (!Number.isFinite(n) || n < 0) {
          alert(t('education_invalid_amount'))
          return
        }
        extra.reimbursed_amount = Math.round(n)
      }
      await adminAct(req.id, action, extra as any)
      await load()
    } catch (e: any) {
      alert(e?.message || 'Failed')
    } finally {
      setBusyId(null)
    }
  }

  async function doSweep() {
    try {
      const res = await adminSweep()
      alert(t('education_sweep_done').replace('{{n}}', String(res.updated)))
      await load()
    } catch (e: any) {
      alert(e?.message || 'Failed')
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-gray-700" />
            {t('education_admin_title')}
          </h1>
          <p className="text-sm text-gray-500 mt-1">{t('education_admin_subtitle')}</p>
        </div>
        <Button variant="outline" size="sm" onClick={doSweep}>
          <RefreshCw className="h-4 w-4 mr-1" />
          {t('education_admin_sweep')}
        </Button>
      </div>

      {/* status tabs */}
      <div className="mb-4 bg-white border border-gray-200 rounded-lg px-3 py-2.5">
        <div className="flex flex-wrap gap-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key || 'all'}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1.5 rounded text-sm border transition-colors ${
                statusFilter === tab.key
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {t(tab.labelKey)}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg">
        {loading ? (
          <div className="p-12 text-center text-gray-500 text-sm">{t('loading')}</div>
        ) : error ? (
          <div className="p-6 text-rose-600 text-sm">{error}</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-gray-500 text-sm">
            {t('education_admin_empty')}
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {items.map((req) => {
              const isExpanded = expandedId === req.id
              return (
                <li key={req.id} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(req.status)}`}>
                          {t(`education_status_${req.status}`)}
                        </span>
                        {req.ceo_approval_required && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                            {t('education_ceo_required')}
                          </span>
                        )}
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {req.course_name}
                        </span>
                        <span className="text-xs text-gray-500">@ {req.provider}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {req.user_name}
                        {req.department ? ` · ${req.department}` : ''} · {formatYmd(req.start_date)} ~{' '}
                        {formatYmd(req.end_date)} · {formatYen(req.cost)} ·{' '}
                        {t(`education_course_type_${req.course_type}`)}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-wrap">
                      {req.status === 'pending' && (
                        <>
                          <button
                            disabled={busyId === req.id}
                            onClick={() => act(req, 'approve')}
                            className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 inline-flex items-center gap-1"
                          >
                            <Check className="h-3 w-3" />
                            {t('education_action_approve')}
                          </button>
                          <button
                            disabled={busyId === req.id}
                            onClick={() => act(req, 'reject')}
                            className="px-2 py-1 text-xs bg-rose-600 text-white rounded hover:bg-rose-700 inline-flex items-center gap-1"
                          >
                            <X className="h-3 w-3" />
                            {t('education_action_reject')}
                          </button>
                        </>
                      )}
                      {req.status === 'approved' && (
                        <button
                          disabled={busyId === req.id}
                          onClick={() => act(req, 'mark_paid')}
                          className="px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 inline-flex items-center gap-1"
                        >
                          <CreditCard className="h-3 w-3" />
                          {t('education_action_mark_paid')}
                        </button>
                      )}
                      {req.status === 'evidence_pending' && (
                        <button
                          disabled={busyId === req.id}
                          onClick={() => act(req, 'mark_completed')}
                          className="px-2 py-1 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700 inline-flex items-center gap-1"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          {t('education_action_complete')}
                        </button>
                      )}
                      {['paid', 'evidence_pending', 'completed'].includes(req.status) && (
                        <button
                          disabled={busyId === req.id}
                          onClick={() => act(req, 'refund')}
                          className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 inline-flex items-center gap-1"
                        >
                          <Undo2 className="h-3 w-3" />
                          {t('education_action_refund')}
                        </button>
                      )}
                      {!['pending'].includes(req.status) && (
                        <button
                          disabled={busyId === req.id}
                          onClick={() => act(req, 'reopen')}
                          className="px-2 py-1 text-xs border border-gray-300 text-gray-700 rounded hover:bg-gray-50 inline-flex items-center gap-1"
                          title={t('education_action_reopen')}
                        >
                          <RotateCcw className="h-3 w-3" />
                        </button>
                      )}
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : req.id)}
                        className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded"
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 ml-1 bg-gray-50 border border-gray-200 rounded p-3 text-sm space-y-2">
                      {req.course_url && (
                        <div>
                          <span className="text-gray-500">{t('education_course_url')}: </span>
                          <a
                            href={req.course_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 hover:underline inline-flex items-center gap-1"
                          >
                            {req.course_url}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-500">{t('education_relevance')}: </span>
                        <div className="text-gray-800 whitespace-pre-wrap">{req.relevance}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">{t('education_study_plan')}: </span>
                        <div className="text-gray-800 whitespace-pre-wrap">{req.study_plan}</div>
                      </div>
                      {req.reject_reason && (
                        <div className="text-rose-700">
                          {t('education_reject_reason')}: {req.reject_reason}
                        </div>
                      )}
                      {req.refund_reason && (
                        <div className="text-red-700">
                          {t('education_refund_reason')}: {req.refund_reason}
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 pt-2 border-t border-gray-200">
                        <div>
                          {t('education_submitted_at')}: {formatYmd(req.submitted_at)}
                        </div>
                        <div>
                          {t('education_approved_at')}: {formatYmd(req.approved_at)}
                        </div>
                        <div>
                          {t('education_paid_at')}: {formatYmd(req.paid_at)}
                        </div>
                        <div>
                          {t('education_evidence_due')}: {formatYmd(req.evidence_due_date)}
                        </div>
                        <div>
                          {t('education_completed_at')}: {formatYmd(req.completed_at)}
                        </div>
                        <div>
                          {t('education_reimbursed_amount')}: {formatYen(req.reimbursed_amount)}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-gray-200">
                        <div className="font-medium text-gray-900 mb-1.5">
                          {t('education_evidence_files')}
                        </div>
                        <ul className="space-y-1">
                          {(req.files || []).map((f) => (
                            <li key={f.id} className="flex items-center justify-between text-xs">
                              <span className="text-gray-700">
                                [{t(`education_file_kind_${f.kind}`)}] {f.file_name} ·{' '}
                                {(f.file_size / 1024).toFixed(1)} KB
                              </span>
                              <a
                                href={fileDownloadUrl(f.id)}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1 text-gray-500 hover:text-blue-600"
                              >
                                <Download className="h-3.5 w-3.5" />
                              </a>
                            </li>
                          ))}
                          {(!req.files || req.files.length === 0) && (
                            <li className="text-xs text-gray-400">{t('education_no_files')}</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
