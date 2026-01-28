import { useState, useEffect } from 'react'
import { useI18nStore } from '../i18n'
import api from '../lib/api'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { Button } from './ui/button'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { ScrollArea } from './ui/scroll-area'

interface ExamViewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string | null
  userName?: string
}

const EXAM_QUESTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]

export default function ExamViewModal({ open, onOpenChange, userId, userName }: ExamViewModalProps) {
  const { t } = useI18nStore()
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [submittedAt, setSubmittedAt] = useState<string | null>(null)
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
      if (response.data.answers) {
        // JSONB에서 number 키를 string으로 저장했으므로 변환
        const loadedAnswers: Record<number, string> = {}
        Object.keys(response.data.answers).forEach((key) => {
          loadedAnswers[parseInt(key)] = response.data.answers[key]
        })
        setAnswers(loadedAnswers)
      } else {
        setAnswers({})
      }
      setIsSubmitted(response.data.isSubmitted || false)
      setSubmittedAt(response.data.submittedAt || null)
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
            {isSubmitted ? (
              <p className="text-green-600 font-medium">
                ✓ {t('examSubmitted')} ({formatDate(submittedAt)})
              </p>
            ) : (
              <p className="text-orange-600 font-medium">{t('examNotSubmitted')}</p>
            )}
          </div>
        </DialogHeader>

        <ScrollArea className="h-[60vh] pr-4">
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <p>{t('loading')}</p>
            </div>
          ) : !isSubmitted ? (
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
                    value={answers[qNum] || ''}
                    disabled
                    className="min-h-[120px] bg-gray-50 cursor-default"
                    placeholder={t('examNoAnswer')}
                  />
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t('close')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
