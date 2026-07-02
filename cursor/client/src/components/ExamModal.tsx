import { useState, useEffect, useRef } from 'react'
import { useI18nStore } from '../i18n'
import api from '../lib/api'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'
import { ScrollArea } from './ui/scroll-area'
import QuestionContent from './QuestionContent'

interface ExamModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  examRound?: number
}

const EXAM_QUESTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]

export default function ExamModal({ open, onOpenChange, examRound = 1 }: ExamModalProps) {
  const { t, language } = useI18nStore()
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [currentRound, setCurrentRound] = useState(examRound)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dirtyRef = useRef(false)        // 마지막 저장 이후 변경분 존재 여부
  const answersRef = useRef(answers)    // setTimeout/flush에서 최신 답변 참조용
  const isSubmittedRef = useRef(isSubmitted)
  const currentRoundRef = useRef(currentRound)
  // 부정행위 감지: 이벤트 버퍼 + 배치 전송용 ref
  const proctorBufferRef = useRef<Array<{ eventType: string; detail: any; occurredAt: string }>>([])
  const proctorSuppressRef = useRef(false)  // 저장/제출 alert·confirm로 인한 window blur 오탐 억제
  const awaySinceRef = useRef<number | null>(null)  // 자리비움 시작 시각(복귀 시 자리비움 시간 계산용, null이면 현재 자리에 있음)

  useEffect(() => { answersRef.current = answers }, [answers])
  useEffect(() => { isSubmittedRef.current = isSubmitted }, [isSubmitted])
  useEffect(() => { currentRoundRef.current = currentRound }, [currentRound])

  // 언마운트 시 타이머 정리
  useEffect(() => () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
  }, [])

  useEffect(() => {
    if (open) {
      setCurrentRound(examRound)
    }
  }, [open, examRound])

  useEffect(() => {
    if (open) {
      loadExamAnswers()
    }
  }, [open, currentRound])

  const loadExamAnswers = async () => {
    // 회차 전환/재로드 시 이전 회차의 대기 중인 자동저장 취소
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }
    dirtyRef.current = false
    setLoading(true)
    try {
      const response = await api.get(`/exam/my-answers?round=${currentRound}`)
      if (response.data.answers) {
        // JSONB에서 number 키를 string으로 저장했으므로 변환
        const loadedAnswers: Record<number, string> = {}
        Object.keys(response.data.answers).forEach((key) => {
          loadedAnswers[parseInt(key)] = response.data.answers[key]
        })
        setAnswers(loadedAnswers)
      } else {
        setAnswers({}) // 새로운 회차는 빈 답변으로 시작
      }
      setIsSubmitted(response.data.isSubmitted || false)
    } catch (error) {
      console.error('Failed to load exam answers:', error)
    } finally {
      setLoading(false)
    }
  }

  // 서버 자동저장 (디바운스/닫기 시 호출). 조용히 실행하며 실패해도 알림 없음.
  const performAutoSave = async () => {
    if (isSubmittedRef.current) return
    if (!dirtyRef.current) return
    const current = answersRef.current
    const answersForServer: Record<string, string> = {}
    Object.keys(current).forEach((key) => {
      answersForServer[key] = current[parseInt(key)]
    })
    try {
      await api.post('/exam/save-answers', { answers: answersForServer, examRound: currentRoundRef.current })
      dirtyRef.current = false
    } catch (error) {
      // 자동저장 실패는 조용히 무시 (다음 변경 시 재시도). 수동 저장/제출은 그대로 알림.
      console.error('Auto-save failed:', error)
    }
  }

  // ── 부정행위 감지 ──────────────────────────────────────────
  // 이벤트를 버퍼에 쌓고(응시자에게 알림 없음), 주기적/이탈 시 서버에 배치 전송한다.
  const recordProctorEvent = (eventType: string, detail?: any) => {
    if (isSubmittedRef.current) return
    proctorBufferRef.current.push({
      eventType,
      detail: detail ?? null,
      occurredAt: new Date().toISOString(),
    })
  }

  const flushProctorEvents = () => {
    const buffer = proctorBufferRef.current
    if (buffer.length === 0) return
    proctorBufferRef.current = []
    void api
      .post('/exam/proctor-event', { examRound: currentRoundRef.current, events: buffer })
      .catch((error) => {
        console.error('Proctor flush failed:', error)
        // 실패분은 되돌려 다음 전송에서 재시도
        proctorBufferRef.current = buffer.concat(proctorBufferRef.current)
      })
  }

  const handleAnswerChange = (questionId: number, value: string) => {
    if (isSubmitted) return // 제출 후에는 수정 불가
    // 타이핑 없이 한 번에 대량 입력(자동완성/우회 의심) 감지
    const prevValue = answers[questionId] || ''
    if (value.length - prevValue.length >= 50) {
      recordProctorEvent('bulk_insert', { questionId, length: value.length - prevValue.length })
    }
    setAnswers({ ...answers, [questionId]: value })
    dirtyRef.current = true
    // 입력이 1.5초간 멈추면 자동저장
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null
      performAutoSave()
    }, 1500)
  }

  // 모달 닫기: 대기 중인 자동저장을 즉시 flush 후 닫음 (실수로 닫아도 손실 방지)
  const handleClose = (next: boolean) => {
    if (!next) {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
        saveTimerRef.current = null
      }
      // fire-and-forget: 닫히는 시점의 변경분을 서버에 저장
      void performAutoSave()
    }
    onOpenChange(next)
  }

  const handleSave = async () => {
    if (isSubmitted) return

    proctorSuppressRef.current = true
    setSaving(true)
    try {
      // 서버에 저장할 때는 키를 문자열로 변환
      const answersForServer: Record<string, string> = {}
      Object.keys(answers).forEach((key) => {
        answersForServer[key] = answers[parseInt(key)]
      })

      await api.post('/exam/save-answers', { answers: answersForServer, examRound: currentRound })
      dirtyRef.current = false
      alert(t('saved'))
    } catch (error: any) {
      alert(error.response?.data?.message || t('saveFailed'))
    } finally {
      setSaving(false)
      setTimeout(() => { proctorSuppressRef.current = false }, 500)
    }
  }

  const handleSubmit = async () => {
    if (isSubmitted) return

    proctorSuppressRef.current = true
    if (!confirm(t('examConfirmSubmit'))) {
      proctorSuppressRef.current = false
      return
    }

    setSaving(true)
    try {
      // 서버에 저장할 때는 키를 문자열로 변환
      const answersForServer: Record<string, string> = {}
      Object.keys(answers).forEach((key) => {
        answersForServer[key] = answers[parseInt(key)]
      })

      await api.post('/exam/submit-answers', { answers: answersForServer, examRound: currentRound })
      setIsSubmitted(true)
      alert(t('examSubmitted'))
    } catch (error: any) {
      alert(error.response?.data?.message || t('saveFailed'))
    } finally {
      setSaving(false)
      setTimeout(() => { proctorSuppressRef.current = false }, 500)
    }
  }

  // 응시 중(모달 열림 & 미제출)에만 부정행위 이벤트를 감지·전송한다.
  useEffect(() => {
    if (!open || isSubmitted) return

    // 자리비움 시작 마킹(이미 away면 갱신하지 않음 → blur+visibilitychange 중복 방지)
    const markAway = () => {
      if (awaySinceRef.current == null) awaySinceRef.current = Date.now()
    }
    // 복귀 마킹(away 상태였을 때만 자리비움 시간 기록)
    const markReturn = () => {
      if (awaySinceRef.current != null) {
        const awayMs = Date.now() - awaySinceRef.current
        recordProctorEvent('focus_return', { awayMs })
        awaySinceRef.current = null
        flushProctorEvents() // 복귀 시 즉시 전송
      }
    }

    const onVisibilityChange = () => {
      if (document.hidden) {
        markAway()
        recordProctorEvent('tab_hidden')
        flushProctorEvents() // 이탈 시 즉시 전송(복귀 안 해도 유실 방지)
      } else {
        markReturn()
      }
    }
    const onWindowBlur = () => {
      if (proctorSuppressRef.current) return // 저장/제출 alert로 인한 오탐 제외(away 시작으로도 치지 않음)
      markAway()
      recordProctorEvent('window_blur')
      flushProctorEvents()
    }
    const onWindowFocus = () => {
      markReturn()
    }
    const onCopy = () => {
      const sel = document.getSelection?.()?.toString() || ''
      recordProctorEvent('copy', sel ? { length: sel.length, preview: sel.slice(0, 100) } : null)
    }
    const onCut = () => {
      const sel = document.getSelection?.()?.toString() || ''
      recordProctorEvent('cut', sel ? { length: sel.length, preview: sel.slice(0, 100) } : null)
    }
    const onContextMenu = () => {
      recordProctorEvent('contextmenu')
    }
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) {
        recordProctorEvent('fullscreen_exit')
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('blur', onWindowBlur)
    window.addEventListener('focus', onWindowFocus)
    document.addEventListener('copy', onCopy)
    document.addEventListener('cut', onCut)
    document.addEventListener('contextmenu', onContextMenu)
    document.addEventListener('fullscreenchange', onFullscreenChange)
    const flushInterval = setInterval(flushProctorEvents, 5000)

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('blur', onWindowBlur)
      window.removeEventListener('focus', onWindowFocus)
      document.removeEventListener('copy', onCopy)
      document.removeEventListener('cut', onCut)
      document.removeEventListener('contextmenu', onContextMenu)
      document.removeEventListener('fullscreenchange', onFullscreenChange)
      clearInterval(flushInterval)
      flushProctorEvents() // 닫힘/제출 시 남은 이벤트 전송
    }
  }, [open, isSubmitted])

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[95vh]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {t('examTitle')} - {currentRound}{language === 'ja' ? '次' : '차'}
            {isSubmitted && (
              <span className="ml-3 text-sm font-normal text-green-600">
                ✓ {t('examSubmitted')}
              </span>
            )}
          </DialogTitle>
          {isSubmitted && (
            <p className="text-sm text-orange-600 mt-2">{t('examReadOnly')}</p>
          )}
        </DialogHeader>

        <ScrollArea className="h-[78vh] pr-4">
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <p>{t('loading')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {EXAM_QUESTIONS.map((qNum) => (
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
                  {/* 답변 입력 */}
                  <div className="px-4 py-3">
                    <Textarea
                      id={`question-${qNum}`}
                      value={answers[qNum] || ''}
                      onChange={(e) => handleAnswerChange(qNum, e.target.value)}
                      onPaste={(e) => {
                        if (isSubmitted) return
                        const text = e.clipboardData?.getData('text') || ''
                        e.preventDefault() // 붙여넣기 차단
                        recordProctorEvent('paste_blocked', { questionId: qNum, length: text.length, preview: text.slice(0, 100) })
                      }}
                      onDrop={(e) => {
                        if (isSubmitted) return
                        const text = e.dataTransfer?.getData('text') || ''
                        e.preventDefault() // 드래그&드롭 입력 차단
                        recordProctorEvent('drop_blocked', { questionId: qNum, length: text.length, preview: text.slice(0, 100) })
                      }}
                      disabled={isSubmitted}
                      className={`min-h-[120px] ${isSubmitted ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      placeholder={isSubmitted ? '' : t('enterContent')}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="flex justify-end items-center gap-2 mt-4 pt-4 border-t">
          <div className="flex gap-2">
            {!isSubmitted && (
              <>
                <Button
                  variant="outline"
                  onClick={handleSave}
                  disabled={saving || loading}
                >
                  {saving ? t('saving') : t('examSave')}
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={saving || loading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {saving ? t('saving') : t('examSubmit')}
                </Button>
              </>
            )}
            <Button variant="ghost" onClick={() => handleClose(false)}>
              {t('close')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
