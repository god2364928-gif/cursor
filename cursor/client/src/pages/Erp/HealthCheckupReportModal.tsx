import { useEffect, useState } from 'react'
import { useI18nStore } from '../../i18n'
import { Button } from '../../components/ui/button'
import { X, Upload, FileText, Trash2 } from 'lucide-react'
import {
  createReport,
  updateReport,
  uploadFile,
  deleteFile,
  fileDownloadUrl,
  BASIC_CHECK_ITEMS,
  SKIPPABLE_CHECK_ITEMS,
  type HealthCheckupItem,
} from './healthCheckupApi'

const REIMBURSEMENT_CAP = 10000

interface Props {
  initial?: HealthCheckupItem | null
  onClose: () => void
  onSaved: () => void
}

function todayStr(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatYen(n: number): string {
  return '¥' + Number(n || 0).toLocaleString('ja-JP')
}

export default function HealthCheckupReportModal({ initial, onClose, onSaved }: Props) {
  const { language } = useI18nStore()
  const isJa = language === 'ja'

  const [examDate, setExamDate] = useState<string>(initial?.exam_date || todayStr())
  const [hospital, setHospital] = useState<string>(initial?.hospital_name || '')
  const [hospitalAddr, setHospitalAddr] = useState<string>(initial?.hospital_address || '')
  const [amount, setAmount] = useState<string>(
    initial?.amount_paid ? String(initial.amount_paid) : ''
  )
  const [note, setNote] = useState<string>(initial?.note || '')
  const [basic, setBasic] = useState<Set<string>>(
    new Set(initial?.checked_items?.basic || BASIC_CHECK_ITEMS.map((i) => i.key))
  )
  const [skipped, setSkipped] = useState<Set<string>>(
    new Set(initial?.checked_items?.skipped || [])
  )
  const [savedId, setSavedId] = useState<number | null>(initial?.id ?? null)
  const [files, setFiles] = useState<HealthCheckupItem['files']>(initial?.files || [])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setFiles(initial?.files || [])
  }, [initial?.id])

  const amountNum = Number(amount || 0)
  const reimburse = Math.min(Math.max(amountNum, 0), REIMBURSEMENT_CAP)
  const overAmount = Math.max(0, amountNum - REIMBURSEMENT_CAP)

  const toggleSet = (s: Set<string>, key: string, setter: (s: Set<string>) => void) => {
    const next = new Set(s)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    setter(next)
  }

  const handleSave = async () => {
    setError('')
    if (!examDate) {
      setError(isJa ? '受診日を入力してください' : '수검일을 입력해주세요')
      return
    }
    if (!hospital.trim()) {
      setError(isJa ? '医療機関名を入力してください' : '의료기관명을 입력해주세요')
      return
    }
    if (!Number.isInteger(amountNum) || amountNum < 0) {
      setError(isJa ? '金額は0以上の整数で入力してください' : '금액은 0 이상의 정수')
      return
    }

    setBusy(true)
    try {
      const payload = {
        exam_date: examDate,
        hospital_name: hospital.trim(),
        hospital_address: hospitalAddr.trim() || undefined,
        checked_items: { basic: Array.from(basic), skipped: Array.from(skipped) },
        amount_paid: amountNum,
        note: note.trim() || undefined,
      }
      const saved = savedId
        ? await updateReport(savedId, payload)
        : await createReport(payload)
      setSavedId(saved.id)
      setFiles(saved.files || [])
      onSaved()
    } catch (e: any) {
      setError(e?.message || (isJa ? '保存に失敗しました' : '저장 실패'))
    } finally {
      setBusy(false)
    }
  }

  const handleUpload = async (kind: 'receipt' | 'result', file: File | null) => {
    if (!file || !savedId) return
    setError('')
    setBusy(true)
    try {
      await uploadFile(savedId, kind, file)
      // 새 파일 정보를 받아오기 위해 onSaved 호출 후 부모가 재로딩하도록 함
      onSaved()
      // 모달 내 표시도 즉시 갱신 — 응답에 file 정보만 들어오므로 임시 갱신
      const optimistic = {
        id: Date.now(),
        kind,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        uploaded_at: new Date().toISOString(),
      }
      setFiles((prev) => {
        const list = (prev || []).filter((f) => f.kind !== kind)
        return [...list, optimistic]
      })
    } catch (e: any) {
      setError(e?.message || (isJa ? 'アップロードに失敗しました' : '업로드 실패'))
    } finally {
      setBusy(false)
    }
  }

  const handleDeleteFile = async (fileId: number) => {
    setError('')
    setBusy(true)
    try {
      await deleteFile(fileId)
      setFiles((prev) => (prev || []).filter((f) => f.id !== fileId))
      onSaved()
    } catch (e: any) {
      setError(e?.message || (isJa ? '削除に失敗しました' : '삭제 실패'))
    } finally {
      setBusy(false)
    }
  }

  const receiptFile = files?.find((f) => f.kind === 'receipt')
  const resultFile = files?.find((f) => f.kind === 'result')
  const items = isJa ? BASIC_CHECK_ITEMS.map((i) => ({ key: i.key, label: i.ja }))
    : BASIC_CHECK_ITEMS.map((i) => ({ key: i.key, label: i.ko }))
  const skipItems = isJa ? SKIPPABLE_CHECK_ITEMS.map((i) => ({ key: i.key, label: i.ja }))
    : SKIPPABLE_CHECK_ITEMS.map((i) => ({ key: i.key, label: i.ko }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">
            {isJa
              ? savedId ? '健康診断の報告を編集' : '健康診断の報告'
              : savedId ? '건강검진 보고 수정' : '건강검진 보고'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5 overflow-y-auto space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 text-sm p-3 rounded">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-600 mb-1">
                {isJa ? '受診日' : '수검일'} <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">
                {isJa ? '受診費用 (¥)' : '수검 비용 (¥)'} <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min={0}
                step={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="8000"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
              <div className="mt-1 text-xs text-gray-500">
                {isJa ? '会社負担: ' : '회사 부담: '}
                <span className="font-semibold text-blue-600">{formatYen(reimburse)}</span>
                {overAmount > 0 && (
                  <span className="ml-2 text-amber-600">
                    {isJa ? `自己負担: ${formatYen(overAmount)}` : `자기 부담: ${formatYen(overAmount)}`}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">
              {isJa ? '医療機関名' : '의료기관명'} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={hospital}
              onChange={(e) => setHospital(e.target.value)}
              placeholder={isJa ? '○○クリニック' : '○○클리닉'}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">
              {isJa ? '住所 (任意)' : '주소 (선택)'}
            </label>
            <input
              type="text"
              value={hospitalAddr}
              onChange={(e) => setHospitalAddr(e.target.value)}
              placeholder={isJa ? '東京都...' : '도쿄도...'}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-2">
              {isJa ? '受診した検査項目' : '수검 항목'}
            </label>
            <div className="grid grid-cols-2 gap-2 bg-gray-50 rounded-lg p-3 border border-gray-200">
              {items.map((it) => (
                <label key={it.key} className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={basic.has(it.key)}
                    onChange={() => toggleSet(basic, it.key, setBasic)}
                  />
                  {it.label}
                </label>
              ))}
            </div>
            {skipItems.length > 0 && (
              <details className="mt-2">
                <summary className="text-xs text-gray-500 cursor-pointer">
                  {isJa
                    ? '医師の判断により省略可能な項目を選択'
                    : '의사 판단으로 생략 가능한 항목 선택'}
                </summary>
                <div className="grid grid-cols-2 gap-2 mt-2 bg-amber-50 rounded-lg p-3 border border-amber-200">
                  {skipItems.map((it) => (
                    <label key={it.key} className="flex items-center gap-2 text-xs text-gray-700">
                      <input
                        type="checkbox"
                        checked={skipped.has(it.key)}
                        onChange={() => toggleSet(skipped, it.key, setSkipped)}
                      />
                      {it.label}
                    </label>
                  ))}
                </div>
              </details>
            )}
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">
              {isJa ? '備考 (任意)' : '비고 (선택)'}
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
            />
          </div>

          {/* 파일 업로드: 저장 이후에만 활성 */}
          <div className="border-t border-gray-200 pt-4">
            <div className="text-sm font-semibold text-gray-800 mb-2">
              {isJa ? '添付ファイル' : '첨부 파일'}
              {!savedId && (
                <span className="ml-2 text-xs text-gray-500 font-normal">
                  {isJa ? '(保存後にアップロード可能)' : '(저장 후 업로드 가능)'}
                </span>
              )}
            </div>
            <div className="space-y-2">
              <FileRow
                kind="receipt"
                label={isJa ? '領収書' : '영수증'}
                file={receiptFile}
                disabled={!savedId || busy}
                onUpload={(f) => handleUpload('receipt', f)}
                onDelete={handleDeleteFile}
              />
              <FileRow
                kind="result"
                label={isJa ? '健康診断結果' : '건강진단 결과서'}
                file={resultFile}
                disabled={!savedId || busy}
                onUpload={(f) => handleUpload('result', f)}
                onDelete={handleDeleteFile}
              />
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-2 bg-gray-50">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            {isJa ? '閉じる' : '닫기'}
          </Button>
          <Button onClick={handleSave} disabled={busy}>
            {busy
              ? isJa ? '保存中...' : '저장 중...'
              : savedId
              ? isJa ? '更新' : '수정'
              : isJa ? '保存' : '저장'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function FileRow(props: {
  kind: 'receipt' | 'result'
  label: string
  file?: { id: number; file_name: string; file_size: number }
  disabled: boolean
  onUpload: (f: File) => void
  onDelete: (id: number) => void
}) {
  const { label, file, disabled, onUpload, onDelete } = props
  return (
    <div className="flex items-center justify-between border border-gray-200 rounded-lg px-3 py-2 bg-white">
      <div className="flex items-center gap-2 min-w-0">
        <FileText className="h-4 w-4 text-gray-400 shrink-0" />
        <div className="min-w-0">
          <div className="text-xs text-gray-500">{label}</div>
          {file ? (
            <a
              href={fileDownloadUrl(file.id)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline truncate block max-w-xs"
              title={file.file_name}
            >
              {file.file_name}
            </a>
          ) : (
            <div className="text-sm text-gray-400">—</div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <label
          className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded border cursor-pointer ${
            disabled
              ? 'border-gray-200 text-gray-400 cursor-not-allowed'
              : 'border-blue-300 text-blue-600 hover:bg-blue-50'
          }`}
        >
          <Upload className="h-3.5 w-3.5" />
          {file ? '差替' : 'アップロード'}
          <input
            type="file"
            className="hidden"
            disabled={disabled}
            accept="application/pdf,image/*"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) onUpload(f)
              e.target.value = ''
            }}
          />
        </label>
        {file && !disabled && (
          <button
            type="button"
            onClick={() => onDelete(file.id)}
            className="text-xs text-red-600 hover:bg-red-50 p-1 rounded"
            title="削除"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}
