import { useState, useEffect } from 'react'
import { useI18nStore } from '../i18n'
import api from '../lib/api'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { Button } from './ui/button'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { ScrollArea } from './ui/scroll-area'

interface ExamModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const EXAM_QUESTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]

export default function ExamModal({ open, onOpenChange }: ExamModalProps) {
  const { t } = useI18nStore()
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      loadExamAnswers()
    }
  }, [open])

  const loadExamAnswers = async () => {
    setLoading(true)
    try {
      const response = await api.get('/exam/my-answers')
      if (response.data.answers) {
        // JSONB에서 number 키를 string으로 저장했으므로 변환
        const loadedAnswers: Record<number, string> = {}
        Object.keys(response.data.answers).forEach((key) => {
          loadedAnswers[parseInt(key)] = response.data.answers[key]
        })
        setAnswers(loadedAnswers)
      }
      setIsSubmitted(response.data.isSubmitted || false)
    } catch (error) {
      console.error('Failed to load exam answers:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAnswerChange = (questionId: number, value: string) => {
    if (isSubmitted) return // 제출 후에는 수정 불가
    setAnswers({ ...answers, [questionId]: value })
  }

  const handleSave = async () => {
    if (isSubmitted) return

    setSaving(true)
    try {
      // 서버에 저장할 때는 키를 문자열로 변환
      const answersForServer: Record<string, string> = {}
      Object.keys(answers).forEach((key) => {
        answersForServer[key] = answers[parseInt(key)]
      })

      await api.post('/exam/save-answers', { answers: answersForServer })
      alert(t('saved'))
    } catch (error: any) {
      alert(error.response?.data?.message || t('saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = async () => {
    if (isSubmitted) return

    if (!confirm(t('examConfirmSubmit'))) {
      return
    }

    setSaving(true)
    try {
      // 서버에 저장할 때는 키를 문자열로 변환
      const answersForServer: Record<string, string> = {}
      Object.keys(answers).forEach((key) => {
        answersForServer[key] = answers[parseInt(key)]
      })

      await api.post('/exam/submit-answers', { answers: answersForServer })
      setIsSubmitted(true)
      alert(t('examSubmitted'))
    } catch (error: any) {
      alert(error.response?.data?.message || t('saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {t('examTitle')}
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

        <ScrollArea className="h-[60vh] pr-4">
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <p>{t('loading')}</p>
            </div>
          ) : (
            <div className="space-y-6">
              {EXAM_QUESTIONS.map((qNum) => (
                <div key={qNum} className="space-y-2">
                  <Label htmlFor={`question-${qNum}`} className="text-base font-semibold whitespace-pre-line">
                    {qNum}. {t(`exam${qNum}` as any)}
                  </Label>
                  <Textarea
                    id={`question-${qNum}`}
                    value={answers[qNum] || ''}
                    onChange={(e) => handleAnswerChange(qNum, e.target.value)}
                    disabled={isSubmitted}
                    className={`min-h-[120px] ${isSubmitted ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    placeholder={isSubmitted ? '' : t('enterContent')}
                  />
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
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
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t('close')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
