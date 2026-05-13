import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '../../store/authStore'
import { useI18nStore } from '../../i18n'
import { readCache, writeCache } from '../../lib/erpCache'
import { Button } from '../../components/ui/button'
import {
  Stethoscope,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Hourglass,
  XCircle,
  Edit3,
  Trash2,
  ShieldCheck,
  ShieldX,
  Wallet,
} from 'lucide-react'
import {
  fetchMe,
  fetchMyHistory,
  fetchAdminList,
  deleteReport,
  adminAction,
  type MeResponse,
  type HealthCheckupItem,
  type HealthCheckupStatus,
  type VacationHealthCheckRecord,
} from './healthCheckupApi'
import HealthCheckupReportModal from './HealthCheckupReportModal'

const REIMBURSEMENT_CAP = 10000

function formatYen(n: number): string {
  return '¥' + Number(n || 0).toLocaleString('ja-JP')
}

function formatYmd(s?: string | null): string {
  if (!s) return '-'
  const d = new Date(s)
  if (isNaN(d.getTime())) return s
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function monthsBetween(a: Date, b: Date): number {
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth())
}

function StatusBadge({ status, isJa }: { status: HealthCheckupStatus; isJa: boolean }) {
  const labelJa: Record<HealthCheckupStatus, string> = {
    submitted: '審査待ち',
    reviewed: '審査済み',
    reimbursed: '精算済み',
    rejected: '却下',
  }
  const labelKo: Record<HealthCheckupStatus, string> = {
    submitted: '검토 대기',
    reviewed: '검토 완료',
    reimbursed: '정산 완료',
    rejected: '반려',
  }
  const cls: Record<HealthCheckupStatus, string> = {
    submitted: 'bg-amber-50 text-amber-700 border-amber-200',
    reviewed: 'bg-blue-50 text-blue-700 border-blue-200',
    reimbursed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    rejected: 'bg-red-50 text-red-700 border-red-200',
  }
  return (
    <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded border ${cls[status]}`}>
      {isJa ? labelJa[status] : labelKo[status]}
    </span>
  )
}

interface HealthCheckupCache {
  me: MeResponse | null
  history: HealthCheckupItem[]
  vacationRecords: VacationHealthCheckRecord[]
  adminItems: HealthCheckupItem[]
}

export default function HealthCheckupPage() {
  const user = useAuthStore((s) => s.user)
  const { language } = useI18nStore()
  const isJa = language === 'ja'
  const isAdmin = user?.role === 'admin' || user?.role === 'office_assistant'

  const [adminTab, setAdminTab] = useState<HealthCheckupStatus | 'all'>('submitted')
  const cacheKey = isAdmin ? `admin:${adminTab}` : 'me'
  const initial = readCache<HealthCheckupCache>('healthCheckup', cacheKey)
  const [me, setMe] = useState<MeResponse | null>(initial?.me ?? null)
  const [history, setHistory] = useState<HealthCheckupItem[]>(initial?.history ?? [])
  const [vacationRecords, setVacationRecords] = useState<VacationHealthCheckRecord[]>(initial?.vacationRecords ?? [])
  const [adminItems, setAdminItems] = useState<HealthCheckupItem[]>(initial?.adminItems ?? [])
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<HealthCheckupItem | null>(null)
  const [loading, setLoading] = useState(!initial)
  const [error, setError] = useState('')

  const loadAll = useCallback(async () => {
    const key = isAdmin ? `admin:${adminTab}` : 'me'
    const c = readCache<HealthCheckupCache>('healthCheckup', key)
    if (c) {
      setMe(c.me)
      setHistory(c.history)
      setVacationRecords(c.vacationRecords ?? [])
      setAdminItems(c.adminItems)
      setLoading(false)
    }
    try {
      setError('')
      const tasks: Promise<any>[] = [fetchMe(), fetchMyHistory()]
      if (isAdmin) {
        tasks.push(
          fetchAdminList(
            adminTab === 'all'
              ? undefined
              : { status: adminTab as HealthCheckupStatus }
          )
        )
      }
      const results = await Promise.all(tasks)
      const nextMe = results[0] as MeResponse
      const nextHistory = (results[1].items || []) as HealthCheckupItem[]
      const nextVacation = (results[1].vacation_records || []) as VacationHealthCheckRecord[]
      const nextAdmin = isAdmin ? results[2].items || [] : []
      setMe(nextMe)
      setHistory(nextHistory)
      setVacationRecords(nextVacation)
      if (isAdmin) setAdminItems(nextAdmin)
      writeCache<HealthCheckupCache>('healthCheckup', key, {
        me: nextMe,
        history: nextHistory,
        vacationRecords: nextVacation,
        adminItems: nextAdmin,
      })
    } catch (e: any) {
      setError(e?.message || (isJa ? '読込に失敗しました' : '로딩 실패'))
    } finally {
      setLoading(false)
    }
  }, [isAdmin, adminTab, isJa])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  // ===== 자격 안내 카드 계산 =====
  // 일본 규정: 입사 후 6개월 경과 → 1회차 수검 가능 / 마지막 검진 + 1년 → 다음 수검 가능
  // 휴가 시스템(과거 마이그레이션 데이터 포함)까지 합친 최근 검진일을 우선 사용.
  const eligibility = (() => {
    if (!me) return null
    const now = new Date()
    const hire = me.hire_date ? new Date(me.hire_date) : null

    // 합쳐진 최근 검진일: me.latest_exam_date 우선, 없으면 health_checkup_requests history 에서.
    const combinedLatestStr =
      me.latest_exam_date ||
      history
        .filter((h) => h.status !== 'rejected')
        .slice()
        .sort((a, b) => b.exam_date.localeCompare(a.exam_date))[0]?.exam_date

    // 1) 이미 수검한 적이 있는 경우 — 마지막 검진 + 1년 후 재수검 가능
    if (combinedLatestStr) {
      const lastExam = new Date(combinedLatestStr)
      const nextAvail = new Date(lastExam)
      nextAvail.setFullYear(nextAvail.getFullYear() + 1)
      const monthsSince = monthsBetween(lastExam, now)

      if (now < nextAvail) {
        return {
          tone: 'idle' as const,
          title: isJa
            ? 'まだ健康診断の対象ではありません'
            : '아직 건강검진 대상이 아닙니다',
          sub: isJa
            ? `最終受診: ${formatYmd(combinedLatestStr)} ─ ${formatYmd(nextAvail.toISOString())} から再受診申請可能です。(現在 ${monthsSince}ヶ月経過)`
            : `마지막 검진: ${formatYmd(combinedLatestStr)} ─ ${formatYmd(nextAvail.toISOString())}부터 재검진 신청 가능합니다. (현재 ${monthsSince}개월 경과)`,
          canReport: false,
        }
      }
      return {
        tone: 'blue' as const,
        title: isJa
          ? '次回の健康診断を申請してください'
          : '다음 건강검진을 신청해주세요',
        sub: isJa
          ? `最終受診: ${formatYmd(combinedLatestStr)} (${monthsSince}ヶ月経過)`
          : `마지막 검진: ${formatYmd(combinedLatestStr)} (${monthsSince}개월 경과)`,
        canReport: true,
      }
    }

    // 2) 첫 검진 — 입사일 + 6개월 후부터 가능
    if (hire) {
      const firstAvail = new Date(hire)
      firstAvail.setMonth(firstAvail.getMonth() + 6)
      const monthsSinceHire = monthsBetween(hire, now)

      if (now < firstAvail) {
        return {
          tone: 'idle' as const,
          title: isJa
            ? 'まだ健康診断の対象ではありません'
            : '아직 건강검진 대상이 아닙니다',
          sub: isJa
            ? `入社日: ${formatYmd(hire.toISOString())} ─ ${formatYmd(firstAvail.toISOString())} から初回受診申請可能です。(現在 ${monthsSinceHire}ヶ月経過)`
            : `입사일: ${formatYmd(hire.toISOString())} ─ ${formatYmd(firstAvail.toISOString())}부터 1회차 검진 신청 가능합니다. (현재 ${monthsSinceHire}개월 경과)`,
          canReport: false,
        }
      }

      const firstDeadline = new Date(hire)
      firstDeadline.setFullYear(firstDeadline.getFullYear() + 1)
      return {
        tone: 'blue' as const,
        title: isJa
          ? '初回健康診断を申請してください'
          : '1회차 건강검진을 신청해주세요',
        sub: isJa
          ? `推奨: ${formatYmd(firstDeadline.toISOString())} までに受診`
          : `권장: ${formatYmd(firstDeadline.toISOString())}까지 수검`,
        canReport: true,
      }
    }

    // 3) 입사일 정보 없음 — 일반 안내
    return {
      tone: 'blue' as const,
      title: isJa ? '健康診断を申請してください' : '건강검진을 신청해주세요',
      sub: isJa
        ? '受診後、診断書を添付して報告してください'
        : '수검 후 진단서를 첨부하여 보고해주세요',
      canReport: true,
    }
  })()

  const handleDelete = async (id: number) => {
    if (!window.confirm(isJa ? '本当に削除しますか？' : '정말 삭제하시겠습니까?')) return
    try {
      await deleteReport(id)
      await loadAll()
    } catch (e: any) {
      alert(e?.message || (isJa ? '削除失敗' : '삭제 실패'))
    }
  }

  const handleAdminAction = async (
    item: HealthCheckupItem,
    action: 'review' | 'reimburse' | 'reject' | 'grant_vacation' | 'revoke_vacation'
  ) => {
    let payload: { amount_reimbursed?: number; reject_reason?: string } | undefined
    if (action === 'reimburse') {
      const input = window.prompt(
        isJa
          ? `会社負担額を確定 (上限 ${REIMBURSEMENT_CAP}円)`
          : `회사 부담액 확정 (한도 ${REIMBURSEMENT_CAP}엔)`,
        String(item.amount_reimbursed || Math.min(item.amount_paid, REIMBURSEMENT_CAP))
      )
      if (input === null) return
      const n = Number(input)
      if (!Number.isInteger(n) || n < 0) {
        alert(isJa ? '数値を入力してください' : '숫자를 입력해주세요')
        return
      }
      payload = { amount_reimbursed: n }
    }
    if (action === 'reject') {
      const reason = window.prompt(isJa ? '却下理由' : '반려 사유', '')
      if (reason === null) return
      payload = { reject_reason: reason }
    }
    try {
      await adminAction(item.id, action, payload)
      await loadAll()
    } catch (e: any) {
      alert(e?.message || (isJa ? '更新失敗' : '업데이트 실패'))
    }
  }

  const toneCls = {
    amber: 'bg-amber-50 border-amber-200 text-amber-900',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    blue: 'bg-blue-50 border-blue-200 text-blue-900',
    idle: 'bg-amber-50/60 border-amber-200 text-stone-800',
  }
  const toneIcon = {
    amber: <AlertTriangle className="h-5 w-5 text-amber-600" />,
    emerald: <CheckCircle2 className="h-5 w-5 text-emerald-600" />,
    blue: <Stethoscope className="h-5 w-5 text-blue-600" />,
    idle: <Hourglass className="h-5 w-5 text-stone-500" />,
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-rose-50 border border-rose-200 p-2 mt-0.5">
          <Stethoscope className="h-5 w-5 text-rose-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isJa ? '健康診断申請' : '건강검진 신청'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {isJa
              ? '健康診断の報告・状況確認'
              : '건강검진 보고 및 현황 확인'}
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 text-sm p-3 rounded">
          {error}
        </div>
      )}

      {/* 자격 안내 카드 */}
      {eligibility && (
        <div className={`rounded-xl border p-4 flex items-start gap-3 ${toneCls[eligibility.tone]}`}>
          {toneIcon[eligibility.tone]}
          <div className="flex-1">
            <div className="font-semibold">{eligibility.title}</div>
            <div className="text-sm mt-0.5">{eligibility.sub}</div>
          </div>
          {eligibility.canReport && (
            <Button
              size="sm"
              onClick={() => {
                setEditing(null)
                setShowModal(true)
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              {isJa ? '報告する' : '보고하기'}
            </Button>
          )}
        </div>
      )}

      {/* 안내사항 카드 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-base font-bold text-gray-900 mb-3">
          {isJa ? '健康診断のご案内' : '건강검진 안내사항'}
        </h2>
        <ol className="space-y-2 text-sm text-gray-700 list-decimal pl-5">
          <li>
            <span className="font-semibold">{isJa ? '対象' : '대상'}</span> ─{' '}
            {isJa ? '正社員' : '정규직 사원'}
          </li>
          <li>
            <span className="font-semibold">{isJa ? '頻度' : '주기'}</span> ─{' '}
            {isJa ? '1年以内ごとに1回 (入社6か月経過後に受診可能)' : '1년 이내마다 1회 (입사 6개월 경과 후 수검 가능)'}
          </li>
          <li>
            <span className="font-semibold">{isJa ? '実施場所' : '실시 장소'}</span> ─{' '}
            {isJa ? '任意の医療機関 (各自予約)' : '임의 의료기관 (본인 예약)'}
          </li>
          <li>
            <span className="font-semibold">{isJa ? '費用' : '비용'}</span> ─{' '}
            <span className="text-blue-700 font-semibold">
              {isJa ? '1万円まで会社負担' : '1만 엔까지 회사 부담'}
            </span>
            <div className="text-xs text-gray-500 mt-0.5 pl-1">
              {isJa
                ? '※ がん検診・子宮頸がん検査・乳がん検査・人間ドック等は対象外'
                : '※ 암검진·자궁경부암·유방암·종합 건강검진(인간독)은 적용 외'}
            </div>
          </li>
          <li className="bg-blue-50 -mx-2 px-2 py-1 rounded">
            <span className="font-semibold">{isJa ? '休暇' : '휴가'}</span> ─{' '}
            {isJa
              ? '受診当日は全休（自動で1日有給付与・年次有給とは別）'
              : '검진 당일 전일 휴무 (자동 1일 유급, 연차와 별도)'}
          </li>
          <li>
            <span className="font-semibold">{isJa ? '提出物' : '제출물'}</span> ─{' '}
            {isJa ? '診断書 (PDF)' : '진단서 (PDF)'}
          </li>
          <li>
            <span className="font-semibold">{isJa ? '提出先' : '제출처'}</span> ─{' '}
            {isJa ? '経営支援部' : '경영지원부'}
          </li>
        </ol>
      </div>

      {/* 내 신청 이력 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-gray-900">
            {isJa ? '私の申請履歴' : '내 신청 이력'}
          </h2>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setEditing(null)
              setShowModal(true)
            }}
          >
            <Plus className="h-4 w-4 mr-1" />
            {isJa ? '新規報告' : '신규 보고'}
          </Button>
        </div>
        {loading ? (
          <div className="text-sm text-gray-500">{isJa ? '読込中...' : '로딩 중...'}</div>
        ) : history.length === 0 && vacationRecords.length === 0 ? (
          <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-6 text-center text-sm text-gray-500">
            {isJa ? '申請履歴がありません' : '신청 이력이 없습니다'}
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((it) => (
              <HistoryRow
                key={`hc-${it.id}`}
                item={it}
                isJa={isJa}
                onEdit={() => {
                  setEditing(it)
                  setShowModal(true)
                }}
                onDelete={() => handleDelete(it.id)}
              />
            ))}
            {vacationRecords.map((vr) => (
              <VacationRecordRow key={`vr-${vr.id}`} record={vr} isJa={isJa} />
            ))}
          </div>
        )}
      </div>

      {/* FAQ */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-base font-bold text-gray-900 mb-3">FAQ</h2>
        <div className="space-y-3 text-sm text-gray-700">
          <FAQ
            q={
              isJa
                ? '特定のかかりつけ病院があり定期的に検査している場合も会社で受診する必要がありますか？'
                : '특정 단골 병원이 있고 정기적으로 검사하고 있는 경우에도 회사 검진이 필요한가요?'
            }
            a={
              isJa
                ? 'かかりつけ病院の検査項目と健康診断の内容に重複がある場合、検診項目を一部省略できます。ただし、健康診断結果の提出と、会社で受ける際の担当医師の許可が必要になります。'
                : '단골 병원의 검사 항목과 건강검진 내용이 중복되는 경우 검진 항목을 일부 생략할 수 있습니다. 단, 결과 제출 및 담당 의사의 허가가 필요합니다.'
            }
          />
          <FAQ
            q={
              isJa
                ? '個人的に人間ドックを受けていても健康診断を受診する必要がありますか？'
                : '개인적으로 인간독을 받고 있어도 건강검진을 받아야 하나요?'
            }
            a={
              isJa
                ? '受診の必要はありません。ただし、人間ドックの結果の写し等を経営支援部に提出する必要があります。市町村が実施する健康診断を受けた場合も同様で、不足項目がある場合は追加受診が必要です。'
                : '수검할 필요는 없습니다. 단, 인간독 결과 사본 등을 경영지원부에 제출해야 합니다. 시·정·촌 건강검진 수검 시에도 동일하며, 부족 항목이 있는 경우 추가 수검이 필요합니다.'
            }
          />
          <FAQ
            q={
              isJa
                ? '産休で休業中に定期健康診断の時期が来た場合、受診する必要がありますか？'
                : '출산휴가 중에 정기 건강검진 시기가 도래한 경우 수검해야 하나요?'
            }
            a={
              isJa
                ? '受診しなくても差し支えありません。育児休業・療養休業により休業中の場合には、定期健康診断を受診しなくても問題ありません。ただし、休業終了後、速やかに受診してください。'
                : '수검하지 않아도 무방합니다. 육아휴직·요양휴직으로 휴업 중인 경우 정기 건강검진을 받지 않아도 됩니다. 단, 휴업 종료 후 신속하게 수검해주세요.'
            }
          />
        </div>
      </div>

      {/* 관리자 섹션 */}
      {isAdmin && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-gray-900">
              {isJa ? '管理 (全申請)' : '관리 (전체 신청)'}
            </h2>
            <div className="flex items-center gap-1">
              {(['submitted', 'reviewed', 'reimbursed', 'rejected', 'all'] as const).map(
                (s) => (
                  <button
                    key={s}
                    onClick={() => setAdminTab(s)}
                    className={`text-xs px-2 py-1 rounded border ${
                      adminTab === s
                        ? 'bg-blue-50 border-blue-300 text-blue-700'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {s === 'all'
                      ? isJa ? '全て' : '전체'
                      : s === 'submitted'
                      ? isJa ? '審査待ち' : '대기'
                      : s === 'reviewed'
                      ? isJa ? '審査済み' : '검토 완료'
                      : s === 'reimbursed'
                      ? isJa ? '精算済み' : '정산 완료'
                      : isJa ? '却下' : '반려'}
                  </button>
                )
              )}
            </div>
          </div>
          {adminItems.length === 0 ? (
            <div className="text-sm text-gray-500 text-center py-6">
              {isJa ? '該当する申請はありません' : '해당하는 신청이 없습니다'}
            </div>
          ) : (
            <div className="space-y-2">
              {adminItems.map((it) => (
                <AdminRow
                  key={it.id}
                  item={it}
                  isJa={isJa}
                  onAction={(action) => handleAdminAction(it, action)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {showModal && (
        <HealthCheckupReportModal
          initial={editing}
          onClose={() => {
            setShowModal(false)
            setEditing(null)
          }}
          onSaved={() => {
            loadAll()
          }}
        />
      )}
    </div>
  )
}

// ===== Subcomponents =====

function FAQ({ q, a }: { q: string; a: string }) {
  return (
    <details className="border border-gray-200 rounded-lg p-3">
      <summary className="font-medium text-gray-800 cursor-pointer">{q}</summary>
      <div className="mt-2 text-gray-600 text-sm">{a}</div>
    </details>
  )
}

function HistoryRow({
  item,
  isJa,
  onEdit,
  onDelete,
}: {
  item: HealthCheckupItem
  isJa: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const canEdit = item.status === 'submitted'
  const resultOk = !!item.files?.find((f) => f.kind === 'result')
  return (
    <div className="flex items-center justify-between border border-gray-200 rounded-lg px-4 py-3 bg-white">
      <div className="flex items-center gap-4 min-w-0">
        <div className="text-sm font-semibold text-gray-900 w-16">{item.fiscal_year}</div>
        <div className="text-sm text-gray-600 w-28">{formatYmd(item.exam_date)}</div>
        <div className="text-sm text-gray-800 truncate max-w-xs">{item.hospital_name}</div>
        <StatusBadge status={item.status} isJa={isJa} />
        <div className="text-xs text-gray-500">
          <span className={resultOk ? 'text-emerald-600' : 'text-amber-600'}>
            {isJa ? '診断書' : '진단서'}: {resultOk ? '✓' : '×'}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-sm text-right">
          <div className="text-gray-700">{formatYen(item.amount_paid)}</div>
          <div className="text-xs text-blue-600">
            {isJa ? '会社負担 ' : '회사 부담 '}
            {formatYen(item.amount_reimbursed)}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onEdit}
            className="text-xs text-gray-600 hover:bg-gray-100 p-1.5 rounded"
            title={isJa ? '編集' : '편집'}
          >
            <Edit3 className="h-4 w-4" />
          </button>
          {canEdit && (
            <button
              type="button"
              onClick={onDelete}
              className="text-xs text-red-600 hover:bg-red-50 p-1.5 rounded"
              title={isJa ? '削除' : '삭제'}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function VacationRecordRow({
  record,
  isJa,
}: {
  record: VacationHealthCheckRecord
  isJa: boolean
}) {
  return (
    <div className="flex items-center justify-between border border-gray-200 rounded-lg px-4 py-3 bg-gray-50">
      <div className="flex items-center gap-4 min-w-0">
        <div className="text-sm font-semibold text-gray-700 w-16">{record.fiscal_year}</div>
        <div className="text-sm text-gray-600 w-28">{formatYmd(record.exam_date)}</div>
        <div className="text-sm text-gray-500 truncate max-w-xs">
          {isJa ? '休暇システム記録' : '휴가 시스템 기록'}
        </div>
        <span className="inline-flex items-center text-xs px-2 py-0.5 rounded border bg-stone-50 text-stone-600 border-stone-200">
          {isJa ? '記録のみ' : '기록만'}
        </span>
        {record.reason && (
          <span className="text-xs text-gray-400 truncate max-w-[180px]" title={record.reason}>
            {record.reason}
          </span>
        )}
      </div>
      <div className="text-xs text-gray-400">
        {isJa ? '詳細情報なし' : '상세 정보 없음'}
      </div>
    </div>
  )
}

function AdminRow({
  item,
  isJa,
  onAction,
}: {
  item: HealthCheckupItem
  isJa: boolean
  onAction: (a: 'review' | 'reimburse' | 'reject' | 'grant_vacation' | 'revoke_vacation') => void
}) {
  return (
    <div className="border border-gray-200 rounded-lg px-4 py-3 bg-white">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="text-sm font-semibold text-gray-900 truncate max-w-[160px]">
            {item.user_name}
          </div>
          <div className="text-xs text-gray-500">{item.department || '-'}</div>
          <div className="text-sm text-gray-600">{formatYmd(item.exam_date)}</div>
          <StatusBadge status={item.status} isJa={isJa} />
          {item.vacation_granted && (
            <span className="inline-flex items-center text-xs px-2 py-0.5 rounded border bg-emerald-50 text-emerald-700 border-emerald-200">
              {isJa ? '休暇付与済' : '휴가 부여됨'}
            </span>
          )}
        </div>
        <div className="text-sm text-right">
          <div className="text-gray-700">{formatYen(item.amount_paid)}</div>
          <div className="text-xs text-blue-600">
            {isJa ? '負担 ' : '부담 '}
            {formatYen(item.amount_reimbursed)}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <div className="text-xs text-gray-500 truncate max-w-md">{item.hospital_name}</div>
        <div className="ml-auto flex items-center gap-1.5">
          {item.status === 'submitted' && (
            <>
              <Button size="sm" variant="outline" onClick={() => onAction('review')}>
                <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-blue-600" />
                {isJa ? '審査済みにする' : '검토 완료'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => onAction('reject')}>
                <XCircle className="h-3.5 w-3.5 mr-1 text-red-600" />
                {isJa ? '却下' : '반려'}
              </Button>
            </>
          )}
          {item.status === 'reviewed' && (
            <Button size="sm" onClick={() => onAction('reimburse')}>
              <Wallet className="h-3.5 w-3.5 mr-1" />
              {isJa ? '精算確定' : '정산 확정'}
            </Button>
          )}
          {item.status !== 'rejected' && (
            <>
              {item.vacation_granted ? (
                <Button size="sm" variant="outline" onClick={() => onAction('revoke_vacation')}>
                  <ShieldX className="h-3.5 w-3.5 mr-1 text-red-500" />
                  {isJa ? '休暇取消' : '휴가 취소'}
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={() => onAction('grant_vacation')}>
                  <ShieldCheck className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                  {isJa ? '休暇付与' : '휴가 부여'}
                </Button>
              )}
            </>
          )}
        </div>
      </div>
      {item.reject_reason && (
        <div className="mt-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">
          {isJa ? '却下理由: ' : '반려 사유: '}
          {item.reject_reason}
        </div>
      )}
    </div>
  )
}
