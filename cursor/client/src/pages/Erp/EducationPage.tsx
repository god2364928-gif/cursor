import { useEffect, useState, useCallback } from 'react'
import {
  GraduationCap,
  Plus,
  Upload,
  Download,
  Trash2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Pencil,
  XCircle,
} from 'lucide-react'
import { useI18nStore } from '../../i18n'
import { readCache, writeCache } from '../../lib/erpCache'
import { Button } from '../../components/ui/button'
import {
  fetchStats,
  fetchMyHistory,
  cancelRequest,
  uploadFile,
  deleteFile,
  fileDownloadUrl,
  type EducationRequest,
  type EducationStats,
  type EducationStatus,
  type EducationFileKind,
} from './educationApi'
import EducationRequestModal from './EducationRequestModal'

function formatYen(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—'
  return '¥' + Number(n).toLocaleString('ja-JP')
}

function formatYmd(s?: string | null): string {
  if (!s) return '-'
  return s.slice(0, 10)
}

const STATUS_TABS: { key: '' | EducationStatus; labelKey: string }[] = [
  { key: '', labelKey: 'education_status_all' },
  { key: 'pending', labelKey: 'education_status_pending' },
  { key: 'approved', labelKey: 'education_status_approved' },
  { key: 'paid', labelKey: 'education_status_paid' },
  { key: 'evidence_pending', labelKey: 'education_status_evidence_pending' },
  { key: 'completed', labelKey: 'education_status_completed' },
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

function fileKindForCourseType(courseType: EducationRequest['course_type']): EducationFileKind {
  if (courseType === 'offline') return 'certificate'
  if (courseType === 'book') return 'book_record'
  return 'progress'
}

interface EducationCache {
  stats: EducationStats | null
  items: EducationRequest[]
}

export default function EducationPage() {
  const { t } = useI18nStore()

  const year = new Date().getFullYear()
  const [statusFilter, setStatusFilter] = useState<'' | EducationStatus>('')
  const cacheKey = `${year}:${statusFilter || 'all'}`
  const initial = readCache<EducationCache>('education', cacheKey)
  const [stats, setStats] = useState<EducationStats | null>(initial?.stats ?? null)
  const [items, setItems] = useState<EducationRequest[]>(initial?.items ?? [])
  const [loading, setLoading] = useState(!initial)
  const [error, setError] = useState('')
  const [showGuide, setShowGuide] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<EducationRequest | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const loadAll = useCallback(async () => {
    const key = `${year}:${statusFilter || 'all'}`
    const c = readCache<EducationCache>('education', key)
    if (c) {
      setStats(c.stats)
      setItems(c.items)
      setLoading(false)
    }
    try {
      setError('')
      const [st, hist] = await Promise.all([
        fetchStats(year),
        fetchMyHistory(statusFilter || undefined),
      ])
      setStats(st)
      setItems(hist.items)
      writeCache<EducationCache>('education', key, { stats: st, items: hist.items })
    } catch (e: any) {
      setError(e?.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [year, statusFilter])

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  async function onCancel(req: EducationRequest) {
    if (!confirm(t('education_confirm_cancel'))) return
    await cancelRequest(req.id)
    void loadAll()
  }

  async function onUpload(req: EducationRequest, kind: EducationFileKind, file: File) {
    try {
      await uploadFile(req.id, kind, file)
      await loadAll()
    } catch (e: any) {
      alert(e?.message || 'Upload failed')
    }
  }

  async function onDeleteFile(fileId: number) {
    if (!confirm(t('education_confirm_delete_file'))) return
    await deleteFile(fileId)
    void loadAll()
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-gray-700" />
            {t('education_page_title')}
          </h1>
          <p className="text-sm text-gray-500 mt-1">{t('education_page_subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowGuide((v) => !v)}>
            {showGuide ? t('education_collapse_guide') : t('education_open_guide')}
          </Button>
          <Button
            onClick={() => {
              setEditing(null)
              setShowModal(true)
            }}
            className="bg-gray-900 hover:bg-gray-800 text-white"
          >
            <Plus className="h-4 w-4 mr-1" />
            {t('education_new_request')}
          </Button>
        </div>
      </div>

      {/* Status tabs */}
      <div className="mb-4 bg-white border border-gray-200 rounded-lg px-3 py-2.5">
        <div className="text-xs text-gray-500 mb-1">{t('education_status_filter')}</div>
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

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-500">
            {t('education_stat_total_spent').replace('{{year}}', String(year))}
          </div>
          <div className="text-2xl font-semibold text-gray-900 mt-1">
            {formatYen(stats?.total_spent)}
          </div>
          <div className="text-xs text-gray-400 mt-1">{t('education_stat_total_note')}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-500">
            {t('education_stat_active').replace('{{year}}', String(year))}
          </div>
          <div className="text-2xl font-semibold text-gray-900 mt-1">{stats?.active_count ?? '—'}</div>
          <div className="text-xs text-gray-400 mt-1">{t('education_stat_active_note')}</div>
        </div>
      </div>

      {/* Guide */}
      {showGuide && (
        <div className="bg-white border border-gray-200 rounded-lg p-5 mb-4 text-sm text-gray-700">
          <h2 className="font-semibold text-gray-900 mb-3">{t('education_guide_title')}</h2>
          <p className="leading-6 mb-4 text-gray-700">{t('education_guide_intro')}</p>

          <div className="space-y-3">
            <div>
              <div className="font-medium text-gray-900">{t('education_guide_cond_title')}</div>
              <ul className="list-disc list-inside text-gray-700 text-sm mt-1 space-y-0.5">
                <li>{t('education_guide_cond_1')}</li>
                <li>{t('education_guide_cond_2')}</li>
              </ul>
            </div>
            <div>
              <div className="font-medium text-gray-900">{t('education_guide_scope_title')}</div>
              <ul className="list-disc list-inside text-gray-700 text-sm mt-1 space-y-0.5">
                <li>{t('education_guide_scope_1')}</li>
                <li>{t('education_guide_scope_2')}</li>
                <li>{t('education_guide_scope_3')}</li>
                <li>{t('education_guide_scope_4')}</li>
              </ul>
            </div>
            <div>
              <div className="font-medium text-gray-900">{t('education_guide_how_title')}</div>
              <ul className="list-disc list-inside text-gray-700 text-sm mt-1 space-y-0.5">
                <li>{t('education_guide_how_1')}</li>
                <li>{t('education_guide_how_2')}</li>
                <li>{t('education_guide_how_3')}</li>
                <li>{t('education_guide_how_4')}</li>
              </ul>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded p-3">
              <div className="font-medium text-gray-900 mb-1">{t('education_guide_flow_title')}</div>
              <ol className="list-decimal list-inside text-gray-700 text-sm space-y-0.5">
                <li>{t('education_guide_flow_1')}</li>
                <li>{t('education_guide_flow_2')}</li>
                <li>{t('education_guide_flow_3')}</li>
                <li>{t('education_guide_flow_4')}</li>
              </ol>
              <div className="text-amber-700 mt-2 text-xs">⚠️ {t('education_guide_ceo_threshold')}</div>
            </div>
            <div className="bg-rose-50 border border-rose-200 rounded p-3 text-rose-700 text-sm">
              <div className="font-medium mb-1">{t('education_guide_warn_title')}</div>
              <ul className="list-disc list-inside space-y-0.5">
                <li>{t('education_guide_warn_1')}</li>
                <li>{t('education_guide_warn_2')}</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      <div className="bg-white border border-gray-200 rounded-lg">
        {loading ? (
          <div className="p-12 text-center text-gray-500 text-sm">{t('loading')}</div>
        ) : error ? (
          <div className="p-6 text-rose-600 text-sm">{error}</div>
        ) : items.length === 0 ? (
          <div className="p-16 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gray-100 mb-3">
              <GraduationCap className="h-7 w-7 text-gray-400" />
            </div>
            <div className="text-gray-900 font-medium">{t('education_empty_title')}</div>
            <div className="text-sm text-gray-500 mt-1">{t('education_empty_subtitle')}</div>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {items.map((req) => {
              const isExpanded = expandedId === req.id
              const evidenceKind = fileKindForCourseType(req.course_type)
              const canEdit = req.status === 'draft' || req.status === 'pending'
              const canCancel = ['draft', 'pending', 'approved'].includes(req.status)
              const canUploadEvidence = ['paid', 'evidence_pending'].includes(req.status)

              return (
                <li key={req.id} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-4">
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
                        {t(`education_course_type_${req.course_type}`)} ·{' '}
                        {formatYmd(req.start_date)} ~ {formatYmd(req.end_date)} ·{' '}
                        {formatYen(req.cost)}
                        {req.evidence_due_date && req.status === 'evidence_pending' && (
                          <span className="ml-2 text-purple-700">
                            {t('education_evidence_due')}: {formatYmd(req.evidence_due_date)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {canEdit && (
                        <button
                          onClick={() => {
                            setEditing(req)
                            setShowModal(true)
                          }}
                          className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded"
                          title={t('edit')}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      )}
                      {canCancel && (
                        <button
                          onClick={() => onCancel(req)}
                          className="p-1.5 text-gray-500 hover:text-rose-700 hover:bg-rose-50 rounded"
                          title={t('education_cancel')}
                        >
                          <XCircle className="h-4 w-4" />
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
                        <div className="text-gray-800 whitespace-pre-wrap">{req.relevance || '—'}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">{t('education_study_plan')}: </span>
                        <div className="text-gray-800 whitespace-pre-wrap">{req.study_plan || '—'}</div>
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

                      {/* Files */}
                      <div className="pt-2 border-t border-gray-200">
                        <div className="font-medium text-gray-900 mb-1.5">
                          {t('education_evidence_files')}
                          <span className="ml-2 text-xs text-gray-500">
                            ({t(`education_evidence_required_${evidenceKind}`)})
                          </span>
                        </div>
                        <ul className="space-y-1">
                          {(req.files || []).map((f) => (
                            <li key={f.id} className="flex items-center justify-between text-xs">
                              <span className="text-gray-700">
                                [{t(`education_file_kind_${f.kind}`)}] {f.file_name} ·{' '}
                                {(f.file_size / 1024).toFixed(1)} KB
                              </span>
                              <div className="flex items-center gap-1">
                                <a
                                  href={fileDownloadUrl(f.id)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1 text-gray-500 hover:text-blue-600"
                                  title={t('education_download')}
                                >
                                  <Download className="h-3.5 w-3.5" />
                                </a>
                                <button
                                  onClick={() => onDeleteFile(f.id)}
                                  className="p-1 text-gray-500 hover:text-rose-700"
                                  title={t('education_delete')}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </li>
                          ))}
                          {(!req.files || req.files.length === 0) && (
                            <li className="text-xs text-gray-400">{t('education_no_files')}</li>
                          )}
                        </ul>

                        {canUploadEvidence && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            <FileUploadButton
                              label={t(`education_upload_${evidenceKind}`)}
                              onPick={(f) => onUpload(req, evidenceKind, f)}
                            />
                            <FileUploadButton
                              label={t('education_upload_receipt')}
                              onPick={(f) => onUpload(req, 'receipt', f)}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <EducationRequestModal
        open={showModal}
        editing={editing}
        onClose={() => setShowModal(false)}
        onSubmitted={() => {
          void loadAll()
        }}
      />
    </div>
  )
}

function FileUploadButton({
  label,
  onPick,
}: {
  label: string
  onPick: (f: File) => void
}) {
  const inputId = `edu-upload-${Math.random().toString(36).slice(2)}`
  return (
    <label
      htmlFor={inputId}
      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs border border-gray-300 rounded cursor-pointer hover:bg-gray-100 bg-white"
    >
      <Upload className="h-3.5 w-3.5" />
      {label}
      <input
        id={inputId}
        type="file"
        className="hidden"
        accept=".pdf,.jpg,.jpeg,.png,.heic,.heif,.webp"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onPick(f)
          e.target.value = ''
        }}
      />
    </label>
  )
}
