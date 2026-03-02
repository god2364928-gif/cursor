import { useState, useEffect } from 'react'
import api from '../lib/api'
import { useAuthStore } from '../store/authStore'
import { useI18nStore } from '../i18n'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { FileText } from 'lucide-react'
import ExamModal from '../components/ExamModal'

export default function SettingsPage() {
  const user = useAuthStore((state) => state.user)
  const { t } = useI18nStore()

  const [showPasswordChange, setShowPasswordChange] = useState(false)
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [changingPassword, setChangingPassword] = useState(false)

  const [showExamModal, setShowExamModal] = useState(false)
  const [currentExamRound, setCurrentExamRound] = useState(1)
  // 어드민이 오픈한 차수 목록 (예: [1, 3])
  const [openedRounds, setOpenedRounds] = useState<number[]>([])
  // 이미 제출 완료한 차수 목록
  const [submittedRounds, setSubmittedRounds] = useState<number[]>([])

  useEffect(() => {
    fetchExamInfo()
  }, [])

  const fetchExamInfo = async () => {
    try {
      const [openingsRes, r1, r2, r3] = await Promise.all([
        api.get('/exam/my-openings'),
        api.get('/exam/my-answers?round=1'),
        api.get('/exam/my-answers?round=2'),
        api.get('/exam/my-answers?round=3'),
      ])
      setOpenedRounds(openingsRes.data)
      const submitted: number[] = []
      if (r1.data.isSubmitted) submitted.push(1)
      if (r2.data.isSubmitted) submitted.push(2)
      if (r3.data.isSubmitted) submitted.push(3)
      setSubmittedRounds(submitted)
    } catch {
      /* silent */
    }
  }

  const handleStartExam = (round: number) => {
    setCurrentExamRound(round)
    setShowExamModal(true)
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert(t('passwordMismatch'))
      return
    }

    setChangingPassword(true)

    try {
      await api.put('/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      })
      alert(t('passwordChanged'))
      setShowPasswordChange(false)
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (error: any) {
      if (error.response?.status === 401) {
        alert(t('invalidCurrentPassword'))
      } else {
        alert(t('passwordChangeFailed'))
      }
    } finally {
      setChangingPassword(false)
    }
  }

  // 어드민이 오픈했고 아직 제출하지 않은 차수
  const availableRounds = openedRounds.filter((r) => !submittedRounds.includes(r))

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6' }}>
      <div className="bg-white p-6">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('accountInfo')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">{t('userName')}</p>
                  <p className="text-lg font-medium">{user?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('email')}</p>
                  <p className="text-lg font-medium">{user?.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('role')}</p>
                  <p className="text-lg font-medium">{user?.role}</p>
                </div>
                <div>
                  <Button onClick={() => setShowPasswordChange(!showPasswordChange)} variant="outline">
                    {t('changePassword')}
                  </Button>

                  {/* 완료한 차수 표시 */}
                  {submittedRounds.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {submittedRounds.map((r) => (
                        <span key={r} className="text-sm text-green-600 font-medium">
                          ✓ {r}차 {t('examSubmitted')}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* 오픈된 차수 응시 버튼 */}
                  {availableRounds.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {availableRounds.map((r) => (
                        <Button key={r} onClick={() => handleStartExam(r)} variant="outline" size="sm">
                          <FileText className="w-4 h-4 mr-1" />
                          {r}차 {t('examStart')}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {showPasswordChange && (
                <div className="mt-4 p-4 border rounded-lg bg-gray-50">
                  <form onSubmit={handlePasswordChange} className="space-y-4">
                    <div>
                      <Label htmlFor="currentPassword">{t('currentPassword')} *</Label>
                      <Input
                        id="currentPassword"
                        type="password"
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="newPassword">{t('newPassword')} *</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="confirmPassword">{t('confirmNewPassword')} *</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                        required
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" disabled={changingPassword}>
                        {changingPassword ? t('saving') : t('save')}
                      </Button>
                      <Button type="button" variant="ghost" onClick={() => {
                        setShowPasswordChange(false)
                        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
                      }}>
                        {t('cancel')}
                      </Button>
                    </div>
                  </form>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <ExamModal
        open={showExamModal}
        onOpenChange={(open) => {
          setShowExamModal(open)
          if (!open) fetchExamInfo()
        }}
        examRound={currentExamRound}
      />
    </div>
  )
}
