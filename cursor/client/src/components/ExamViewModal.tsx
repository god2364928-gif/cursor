import { useState, useEffect } from 'react'
import { useI18nStore } from '../i18n'
import api from '../lib/api'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { Button } from './ui/button'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { ScrollArea } from './ui/scroll-area'
import { Copy } from 'lucide-react'

interface ExamViewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string | null
  userName?: string
}

const EXAM_QUESTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]

export default function ExamViewModal({ open, onOpenChange, userId, userName }: ExamViewModalProps) {
  const { t } = useI18nStore()
  const [exams, setExams] = useState<Array<{
    answers: Record<number, string>
    examRound: number
    isSubmitted: boolean
    submittedAt: string | null
  }>>([])
  const [selectedRound, setSelectedRound] = useState(1)
  const [loading, setLoading] = useState(false)
  const [userInfo, setUserInfo] = useState<{ name: string; email: string; role: string } | null>(null)

  useEffect(() => {
    if (open && userId) {
      loadUserExamAnswers()
    }
  }, [open, userId])

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
          return {
            answers: loadedAnswers,
            examRound: exam.examRound,
            isSubmitted: exam.isSubmitted,
            submittedAt: exam.submittedAt
          }
        })
        setExams(loadedExams)
        
        // 기본적으로 첫 번째 회차 선택
        if (loadedExams.length > 0) {
          setSelectedRound(loadedExams[0].examRound)
        }
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
            </div>
          )}
        </DialogHeader>

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
            <div className="space-y-6">
              {EXAM_QUESTIONS.map((qNum) => (
                <div key={qNum} className="space-y-2">
                  <Label className="text-base font-semibold whitespace-pre-line">
                    {qNum}. {t(`exam${qNum}` as any)}
                  </Label>
                  <Textarea
                    value={currentExam.answers[qNum] || ''}
                    disabled
                    className="min-h-[120px] bg-gray-50 cursor-default"
                    placeholder={t('examNoAnswer')}
                  />
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="flex justify-between gap-2 mt-4 pt-4 border-t">
          <div>
            {currentExam?.isSubmitted && (
              <Button variant="outline" onClick={handleCopyAll}>
                <Copy className="w-4 h-4 mr-2" />
                {t('examCopyAll')}
              </Button>
            )}
          </div>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t('close')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
