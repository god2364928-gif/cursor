import { useState, useEffect } from 'react'
import { useI18nStore } from '../i18n'
import api from '../lib/api'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { Button } from './ui/button'
import { Label } from './ui/label'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { ScrollArea } from './ui/scroll-area'
import { Copy, AlertTriangle } from 'lucide-react'

interface ExamViewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string | null
  userName?: string
  initialRound?: number
}

const EXAM_QUESTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]

// 부정행위 이벤트 타입 → i18n 라벨 키
const PROCTOR_LABEL_KEYS: Record<string, string> = {
  paste_blocked: 'proctorPasteBlocked',
  drop_blocked: 'proctorDropBlocked',
  copy: 'proctorCopy',
  cut: 'proctorCut',
  tab_hidden: 'proctorTabHidden',
  window_blur: 'proctorWindowBlur',
  contextmenu: 'proctorContextmenu',
  bulk_insert: 'proctorBulkInsert',
  fullscreen_exit: 'proctorFullscreenExit',
}

// 문항 본문을 표/불릿/소제목/문단으로 보기 좋게 렌더링
function QuestionContent({ text }: { text: string }) {
  const lines = text.split('\n')
  const blocks: JSX.Element[] = []
  let i = 0

  while (i < lines.length) {
    const raw = lines[i]
    const line = raw.trim()

    if (line === '') {
      i++
      continue
    }

    // 표: 「｜」가 포함된 연속된 줄들을 묶어 테이블로
    if (raw.includes('｜')) {
      const tableLines: string[] = []
      while (i < lines.length && lines[i].includes('｜')) {
        tableLines.push(lines[i])
        i++
      }
      const rows = tableLines.map((l) => l.split('｜').map((c) => c.trim()))
      const [header, ...body] = rows
      blocks.push(
        <div key={blocks.length} className="overflow-x-auto my-1 rounded border border-gray-300">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                {header.map((c, ci) => (
                  <th
                    key={ci}
                    className="border border-gray-300 bg-gray-200 px-2 py-1.5 text-left font-semibold text-gray-700"
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {body.map((r, ri) => {
                const emphasized = r[0]?.startsWith('小計') || r[0]?.startsWith('合計')
                return (
                  <tr key={ri} className={emphasized ? 'bg-blue-50 font-semibold' : 'bg-white'}>
                    {r.map((c, ci) => (
                      <td key={ci} className="border border-gray-300 px-2 py-1.5 align-top">
                        {c}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )
      continue
    }

    // 소제목: 【...】
    if (line.startsWith('【')) {
      blocks.push(
        <p key={blocks.length} className="font-semibold text-gray-900 mt-2">
          {line}
        </p>
      )
      i++
      continue
    }

    // 불릿: ・로 시작하는 연속된 줄들
    if (line.startsWith('・')) {
      const items: string[] = []
      while (i < lines.length && lines[i].trim().startsWith('・')) {
        items.push(lines[i].trim().slice(1).trim())
        i++
      }
      blocks.push(
        <ul key={blocks.length} className="list-disc pl-5 space-y-1">
          {items.map((it, ii) => (
            <li key={ii}>{it}</li>
          ))}
        </ul>
      )
      continue
    }

    // 일반 문단
    blocks.push(
      <p key={blocks.length} className={/^\(\d+\)/.test(line) ? 'mt-1' : ''}>
        {line}
      </p>
    )
    i++
  }

  return <div className="space-y-1.5">{blocks}</div>
}

export default function ExamViewModal({ open, onOpenChange, userId, userName, initialRound }: ExamViewModalProps) {
  const { t } = useI18nStore()
  const [exams, setExams] = useState<Array<{
    answers: Record<number, string>
    examRound: number
    isSubmitted: boolean
    submittedAt: string | null
    scores: Record<number, string>
    maxScores: Record<number, string>
    feedback: string
    totalScore: number | null
    gradedAt: string | null
    gradedByName: string | null
  }>>([])
  const [selectedRound, setSelectedRound] = useState(1)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [userInfo, setUserInfo] = useState<{ name: string; email: string; role: string } | null>(null)
  const [proctorEvents, setProctorEvents] = useState<Array<{ eventType: string; detail: any; occurredAt: string }>>([])
  const [proctorSummary, setProctorSummary] = useState<Record<string, number>>({})

  // 현재 회차의 채점 입력 상태
  const [scores, setScores] = useState<Record<number, string>>({})
  const [maxScores, setMaxScores] = useState<Record<number, string>>({})
  const [feedback, setFeedback] = useState('')

  useEffect(() => {
    if (open && userId) {
      loadUserExamAnswers()
    }
  }, [open, userId, initialRound])

  // 선택된 회차의 부정행위 감지 내역 로드
  useEffect(() => {
    if (!open || !userId) {
      setProctorEvents([])
      setProctorSummary({})
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const res = await api.get(`/exam/user/${userId}/proctor-events?round=${selectedRound}`)
        if (cancelled) return
        setProctorEvents(res.data.events || [])
        setProctorSummary(res.data.summary || {})
      } catch (error) {
        if (!cancelled) {
          setProctorEvents([])
          setProctorSummary({})
        }
      }
    })()
    return () => { cancelled = true }
  }, [open, userId, selectedRound])

  const loadUserExamAnswers = async () => {
    if (!userId) return

    setLoading(true)
    try {
      const response = await api.get(`/exam/user/${userId}/answers`)
      
      if (response.data.exams && response.data.exams.length > 0) {
        // 각 시험 회차의 답변을 변환
        const loadedExams = response.data.exams.map((exam: any) => {
          const loadedAnswers: Record<number, string> = {}
          if (exam.answers) {
            Object.keys(exam.answers).forEach((key) => {
              loadedAnswers[parseInt(key)] = exam.answers[key]
            })
          }
          const loadedScores: Record<number, string> = {}
          const loadedMaxScores: Record<number, string> = {}
          EXAM_QUESTIONS.forEach((q) => {
            const sv = exam.scores ? (exam.scores[q] ?? exam.scores[String(q)]) : undefined
            const mv = exam.maxScores ? (exam.maxScores[q] ?? exam.maxScores[String(q)]) : undefined
            loadedScores[q] = sv === undefined || sv === null ? '' : String(sv)
            loadedMaxScores[q] = mv === undefined || mv === null ? '10' : String(mv)
          })

          return {
            answers: loadedAnswers,
            examRound: exam.examRound,
            isSubmitted: exam.isSubmitted,
            submittedAt: exam.submittedAt,
            scores: loadedScores,
            maxScores: loadedMaxScores,
            feedback: exam.feedback ?? '',
            totalScore: exam.totalScore ?? null,
            gradedAt: exam.gradedAt ?? null,
            gradedByName: exam.gradedByName ?? null
          }
        })
        setExams(loadedExams)

        // initialRound가 있으면 그 회차로, 없으면 첫 번째 회차로
        const targetRound = initialRound && loadedExams.some((e: { examRound: number }) => e.examRound === initialRound)
          ? initialRound
          : loadedExams[0]?.examRound
        if (targetRound) setSelectedRound(targetRound)
      } else {
        setExams([])
      }
      
      setUserInfo(response.data.user || null)
    } catch (error) {
      console.error('Failed to load user exam answers:', error)
    } finally {
      setLoading(false)
    }
  }

  // 회차 전환 시 해당 회차의 채점값으로 동기화
  useEffect(() => {
    const exam = exams.find((e) => e.examRound === selectedRound)
    if (exam) {
      setScores({ ...exam.scores })
      setMaxScores({ ...exam.maxScores })
      setFeedback(exam.feedback)
    } else {
      setScores({})
      setMaxScores({})
      setFeedback('')
    }
  }, [selectedRound, exams])

  // 환산 총점: Σ점수 / Σ배점 × 100
  const computeConvertedScore = (): string => {
    let sumScore = 0
    let sumMax = 0
    EXAM_QUESTIONS.forEach((q) => {
      const s = parseFloat(scores[q] || '')
      const m = parseFloat(maxScores[q] || '')
      if (!isNaN(s)) sumScore += s
      if (!isNaN(m)) sumMax += m
    })
    if (sumMax <= 0) return '-'
    return ((sumScore / sumMax) * 100).toFixed(1)
  }

  const handleSaveGrade = async () => {
    if (!userId) return
    setSaving(true)
    try {
      const numScores: Record<number, number> = {}
      const numMaxScores: Record<number, number> = {}
      EXAM_QUESTIONS.forEach((q) => {
        const s = parseFloat(scores[q] || '')
        const m = parseFloat(maxScores[q] || '')
        // 빈 점수칸은 0, 빈 배점칸은 10
        numScores[q] = isNaN(s) ? 0 : s
        numMaxScores[q] = isNaN(m) ? 10 : m
      })

      await api.post(`/exam/user/${userId}/grade`, {
        examRound: selectedRound,
        scores: numScores,
        maxScores: numMaxScores,
        feedback
      })

      alert(t('gradeSaved'))
      await loadUserExamAnswers()
    } catch (error) {
      console.error('Failed to save grade:', error)
      alert('채점 저장에 실패했습니다')
    } finally {
      setSaving(false)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleCopyAll = () => {
    const currentExam = exams.find(e => e.examRound === selectedRound)
    if (!currentExam || !currentExam.isSubmitted) return

    let copyText = `${userName || userInfo?.name || ''} - ${t('examTitle')} ${selectedRound}차\n`
    copyText += `${t('examSubmitted')}: ${formatDate(currentExam.submittedAt)}\n\n`
    copyText += '='.repeat(50) + '\n\n'

    EXAM_QUESTIONS.forEach((qNum) => {
      const question = t(`exam${qNum}` as any)
      const answer = currentExam.answers[qNum] || t('examNoAnswer')
      
      copyText += `${qNum}. ${question}\n\n`
      copyText += `[${t('examAnswer')}]\n${answer}\n\n`
      copyText += '-'.repeat(50) + '\n\n'
    })

    navigator.clipboard.writeText(copyText).then(() => {
      alert(t('copied'))
    }).catch((err) => {
      console.error('Failed to copy:', err)
      alert('복사에 실패했습니다')
    })
  }

  const currentExam = exams.find(e => e.examRound === selectedRound)

  const proctorLabel = (type: string) => t((PROCTOR_LABEL_KEYS[type] || type) as any)
  const proctorDetailText = (ev: { detail: any }) => {
    const d = ev.detail || {}
    const parts: string[] = []
    if (d.questionId) parts.push(`${t('proctorQuestion')}${d.questionId}`)
    if (typeof d.length === 'number' && d.length > 0) parts.push(`${d.length}${t('proctorChars')}`)
    if (d.preview) parts.push(`"${d.preview}"`)
    return parts.join(' · ')
  }
  const formatProctorTime = (s: string) => {
    if (!s) return ''
    const d = new Date(s)
    if (isNaN(d.getTime())) return ''
    return d.toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {t('examAnswers')} - {userName || userInfo?.name || ''}
          </DialogTitle>
          <div className="text-sm text-gray-600 space-y-1">
            {userInfo && (
              <>
                <p>{t('email')}: {userInfo.email}</p>
                <p>{t('role')}: {userInfo.role}</p>
              </>
            )}
          </div>
          
          {/* 회차 선택 탭 */}
          {exams.length > 0 && (
            <div className="flex gap-2 mt-4">
              {exams.map((exam) => (
                <Button
                  key={exam.examRound}
                  variant={selectedRound === exam.examRound ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedRound(exam.examRound)}
                >
                  {exam.examRound}차 시험
                  {exam.isSubmitted && <span className="ml-1">✓</span>}
                </Button>
              ))}
            </div>
          )}
          
          {/* 선택된 회차의 제출 상태 */}
          {currentExam && (
            <div className="mt-2">
              {currentExam.isSubmitted ? (
                <p className="text-sm text-green-600 font-medium">
                  ✓ {t('examSubmitted')} ({formatDate(currentExam.submittedAt)})
                </p>
              ) : (
                <p className="text-sm text-orange-600 font-medium">{t('examNotSubmitted')}</p>
              )}
              {currentExam.gradedByName && (
                <p className="text-sm text-gray-600 font-medium mt-1">
                  {t('examGradedBy')}: {currentExam.gradedByName} ({formatDate(currentExam.gradedAt)})
                </p>
              )}
            </div>
          )}
        </DialogHeader>

        {/* 부정행위 감지 내역 */}
        {proctorEvents.length > 0 && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 mt-1">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span className="text-sm font-bold text-red-700">{t('proctorTitle')}</span>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {Object.entries(proctorSummary).map(([type, count]) => (
                <span
                  key={type}
                  className="inline-flex items-center rounded-full bg-white border border-red-200 px-2 py-0.5 text-xs font-medium text-red-700"
                >
                  {proctorLabel(type)} {count}{t('proctorCountUnit')}
                </span>
              ))}
            </div>
            <div className="max-h-28 overflow-y-auto overflow-x-hidden space-y-0.5 text-xs">
              {proctorEvents.map((ev, i) => (
                <div key={i} className="flex gap-2 items-baseline min-w-0">
                  <span className="text-gray-400 tabular-nums whitespace-nowrap shrink-0">{formatProctorTime(ev.occurredAt)}</span>
                  <span className="font-medium text-gray-700 whitespace-nowrap shrink-0">{proctorLabel(ev.eventType)}</span>
                  <span className="text-gray-500 break-words min-w-0 flex-1">{proctorDetailText(ev)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <ScrollArea className="h-[60vh] pr-4">
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <p>{t('loading')}</p>
            </div>
          ) : !currentExam ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-500">
              <p>{t('examNoAnswer')}</p>
            </div>
          ) : !currentExam.isSubmitted ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-500">
              <p>{t('examNoAnswer')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {EXAM_QUESTIONS.map((qNum) => {
                const answer = currentExam.answers[qNum]
                const hasAnswer = !!answer && answer.trim() !== ''
                return (
                  <div key={qNum} className="rounded-lg border border-gray-200 overflow-hidden">
                    {/* 문항 */}
                    <div className="flex gap-3 bg-gray-50 px-4 py-3 border-b border-gray-200">
                      <span className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white text-sm font-bold">
                        {qNum}
                      </span>
                      <div className="flex-1 text-sm leading-relaxed text-gray-800 min-w-0">
                        <QuestionContent text={t(`exam${qNum}` as any)} />
                      </div>
                    </div>
                    {/* 답변 */}
                    <div className="px-4 py-3">
                      <div className="text-xs font-semibold text-gray-400 mb-1.5">
                        {t('examAnswer')}
                      </div>
                      {hasAnswer ? (
                        <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-900">
                          {answer}
                        </div>
                      ) : (
                        <span className="inline-block text-xs text-gray-400 bg-gray-100 rounded px-2 py-1">
                          {t('examNoAnswer')}
                        </span>
                      )}
                      {/* 채점 입력 */}
                      <div className="flex items-center gap-2 text-sm mt-3 pt-3 border-t border-gray-100">
                        <Label className="text-sm font-medium whitespace-nowrap">{t('examScore')}</Label>
                        <Input
                          type="number"
                          min={0}
                          value={scores[qNum] ?? ''}
                          onChange={(e) => setScores((prev) => ({ ...prev, [qNum]: e.target.value }))}
                          className="w-20 h-8"
                        />
                        <span className="text-gray-400">/</span>
                        <Label className="text-sm font-medium whitespace-nowrap">{t('examMaxScore')}</Label>
                        <Input
                          type="number"
                          min={0}
                          value={maxScores[qNum] ?? ''}
                          onChange={(e) => setMaxScores((prev) => ({ ...prev, [qNum]: e.target.value }))}
                          className="w-20 h-8"
                        />
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* 종합 피드백 */}
              <div className="space-y-2 pt-2">
                <Label className="text-base font-semibold">{t('examFeedback')}</Label>
                <Textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="min-h-[100px]"
                  placeholder={t('examFeedback')}
                />
              </div>
            </div>
          )}
        </ScrollArea>

        <div className="flex justify-between gap-2 mt-4 pt-4 border-t">
          <div className="flex items-center gap-3">
            {currentExam?.isSubmitted && (
              <Button variant="outline" onClick={handleCopyAll}>
                <Copy className="w-4 h-4 mr-2" />
                {t('examCopyAll')}
              </Button>
            )}
            {currentExam?.isSubmitted && (
              <span className="text-sm font-semibold text-gray-700">
                {t('examTotalScore')}: {computeConvertedScore()} / 100
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {currentExam?.isSubmitted && (
              <Button onClick={handleSaveGrade} disabled={saving}>
                {saving ? '...' : t('examSaveGrade')}
              </Button>
            )}
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              {t('close')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
