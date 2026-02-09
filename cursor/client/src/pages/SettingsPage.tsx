import { useState, useEffect } from 'react'
import api, { invoiceAPI, authAPI } from '../lib/api'
import { formatDateTime } from '../lib/utils'
import { useAuthStore } from '../store/authStore'
import { useI18nStore } from '../i18n'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Edit2, Trash2, X, RefreshCw, FileText } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import ExamModal from '../components/ExamModal'
import ExamViewModal from '../components/ExamViewModal'

interface User {
  id: string
  name: string
  email: string
  role: string
  created_at: string
  last_login_at?: string | null
}

export default function SettingsPage() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const isAdmin = user?.role === 'admin'
  const { t } = useI18nStore()
  
  const [users, setUsers] = useState<User[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user'
  })
  const [loading, setLoading] = useState(false)
  const [showPasswordChange, setShowPasswordChange] = useState(false)
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [changingPassword, setChangingPassword] = useState(false)
  const [resettingAuth, setResettingAuth] = useState(false)
  const [showManagerChange, setShowManagerChange] = useState(false)
  const [managerChangeData, setManagerChangeData] = useState({
    oldManager: '',
    newManager: ''
  })
  const [changingManager, setChangingManager] = useState(false)
  const [showExamModal, setShowExamModal] = useState(false)
  const [showExamViewModal, setShowExamViewModal] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [selectedUserName, setSelectedUserName] = useState<string>('')
  const [exam1Submitted, setExam1Submitted] = useState(false)
  const [exam2Submitted, setExam2Submitted] = useState(false)
  const [exam3Submitted, setExam3Submitted] = useState(false)
  const [currentExamRound, setCurrentExamRound] = useState(1)

  useEffect(() => {
    if (isAdmin) {
      fetchUsers()
    }
    // 본인의 제출 상태 확인
    checkExamStatus()
  }, [isAdmin])

  const checkExamStatus = async () => {
    try {
      // 1차 시험 상태 확인
      const response1 = await api.get('/exam/my-answers?round=1')
      setExam1Submitted(response1.data.isSubmitted || false)
      
      // 2차 시험 상태 확인
      const response2 = await api.get('/exam/my-answers?round=2')
      setExam2Submitted(response2.data.isSubmitted || false)
      
      // 3차 시험 상태 확인
      const response3 = await api.get('/exam/my-answers?round=3')
      setExam3Submitted(response3.data.isSubmitted || false)
    } catch (error) {
      console.error('Failed to check exam status:', error)
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await api.get('/auth/users')
      setUsers(response.data)
    } catch (error) {
      console.error('Failed to fetch users:', error)
    }
  }

  const startEdit = (user: User) => {
    setEditingId(user.id)
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role
    })
    setShowAddForm(false)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setFormData({ name: '', email: '', password: '', role: 'user' })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      if (editingId) {
        // Update existing user
        await api.put(`/auth/users/${editingId}`, formData)
      } else {
        // Create new user
        await api.post('/auth/users', formData)
      }
      cancelEdit()
      setShowAddForm(false)
      fetchUsers()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to save user')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('정말 ' + t('delete') + '하시겠습니까?')) return
    
    try {
      await api.delete(`/auth/users/${id}`)
      fetchUsers()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to delete user')
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate passwords match
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

  const handleResetFreeeAuth = async () => {
    if (!confirm('freee 인증을 초기화하시겠습니까? 다시 인증해야 합니다.')) {
      return
    }

    setResettingAuth(true)
    try {
      await invoiceAPI.resetAuth()
      alert('freee 인증이 초기화되었습니다. 청구서 발행 페이지로 이동합니다.')
      // 청구서 발행 페이지로 자동 이동
      navigate('/invoices/create')
    } catch (error: any) {
      alert('인증 초기화 실패: ' + (error.response?.data?.error || error.message))
    } finally {
      setResettingAuth(false)
    }
  }

  const handleManagerChange = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!managerChangeData.oldManager || !managerChangeData.newManager) {
      alert('이전 담당자와 새 담당자를 모두 입력해주세요.')
      return
    }

    if (!confirm(`"${managerChangeData.oldManager}" → "${managerChangeData.newManager}"\n\n모든 고객, 리타게팅, 영업이력 데이터의 담당자가 변경됩니다.\n계속하시겠습니까?`)) {
      return
    }

    setChangingManager(true)
    try {
      const response = await authAPI.bulkChangeManager(managerChangeData.oldManager, managerChangeData.newManager)
      const changes = response.data.changes
      alert(`담당자 일괄 변경 완료!\n\n고객관리: ${changes.customers}건\n리타게팅: ${changes.retargeting}건\n영업이력: ${changes.salesTracking}건`)
      setManagerChangeData({ oldManager: '', newManager: '' })
      setShowManagerChange(false)
    } catch (error: any) {
      alert('담당자 변경 실패: ' + (error.response?.data?.message || error.message))
    } finally {
      setChangingManager(false)
    }
  }

  const handleStartExam = (round: number) => {
    setCurrentExamRound(round)
    setShowExamModal(true)
  }

  const handleViewExamAnswers = (userId: string, userName: string) => {
    setSelectedUserId(userId)
    setSelectedUserName(userName)
    setShowExamViewModal(true)
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f3f4f6'
    }}>
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
                  <div className="mt-2 space-x-2">
                    {!exam1Submitted && (
                      <Button 
                        onClick={() => handleStartExam(1)} 
                        variant="outline"
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        1차 {t('examStart')}
                      </Button>
                    )}
                    {exam1Submitted && !exam2Submitted && (
                      <Button 
                        onClick={() => handleStartExam(2)} 
                        variant="outline"
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        2차 {t('examStart')}
                      </Button>
                    )}
                    {exam2Submitted && !exam3Submitted && (
                      <Button 
                        onClick={() => handleStartExam(3)} 
                        variant="outline"
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        3차 {t('examStart')}
                      </Button>
                    )}
                    {exam1Submitted && (
                      <span className="inline-block text-sm text-green-600 font-medium">
                        ✓ 1차 {t('examSubmitted')}
                      </span>
                    )}
                    {exam2Submitted && (
                      <span className="inline-block ml-2 text-sm text-green-600 font-medium">
                        ✓ 2차 {t('examSubmitted')}
                      </span>
                    )}
                    {exam3Submitted && (
                      <span className="inline-block ml-2 text-sm text-green-600 font-medium">
                        ✓ 3차 {t('examSubmitted')}
                      </span>
                    )}
                  </div>
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

          {/* freee 재인증 - 어드민 전용 */}
          {isAdmin && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="w-5 h-5" />
                  freee 재인증
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    freee請求書 API 권한을 추가한 경우, 기존 인증을 초기화하고 다시 인증해야 합니다.
                  </p>
                  <Button 
                    onClick={handleResetFreeeAuth} 
                    variant="outline"
                    disabled={resettingAuth}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className={`w-4 h-4 ${resettingAuth ? 'animate-spin' : ''}`} />
                    {resettingAuth ? '초기화 중...' : 'freee 인증 초기화'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 담당자 일괄 변경 - 어드민 전용 */}
          {isAdmin && (
            <Card>
              <CardHeader>
                <CardTitle>담당자 일괄 변경</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    직원이 퇴사하거나 이름을 변경했을 때, 모든 데이터의 담당자를 일괄 변경합니다.
                    <br />
                    <span className="text-red-600 font-medium">⚠️ 고객관리, 리타게팅, 영업이력의 모든 데이터가 변경됩니다.</span>
                  </p>
                  <Button 
                    onClick={() => setShowManagerChange(!showManagerChange)} 
                    variant="outline"
                  >
                    {showManagerChange ? '취소' : '담당자 일괄 변경'}
                  </Button>
                </div>
                {showManagerChange && (
                  <div className="mt-4 p-4 border rounded-lg bg-gray-50">
                    <form onSubmit={handleManagerChange} className="space-y-4">
                      <div>
                        <Label htmlFor="oldManager">이전 담당자 이름 *</Label>
                        <Input
                          id="oldManager"
                          value={managerChangeData.oldManager}
                          onChange={(e) => setManagerChangeData({ ...managerChangeData, oldManager: e.target.value })}
                          placeholder="예: 石井瞳"
                          required
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          띄어쓰기와 대소문자를 정확히 입력해주세요.
                        </p>
                      </div>
                      <div>
                        <Label htmlFor="newManager">새 담당자 이름 *</Label>
                        <Input
                          id="newManager"
                          value={managerChangeData.newManager}
                          onChange={(e) => setManagerChangeData({ ...managerChangeData, newManager: e.target.value })}
                          placeholder="예: その他"
                          required
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button type="submit" disabled={changingManager} className="bg-orange-600 hover:bg-orange-700">
                          {changingManager ? '변경 중...' : '일괄 변경 실행'}
                        </Button>
                        <Button type="button" variant="ghost" onClick={() => {
                          setShowManagerChange(false)
                          setManagerChangeData({ oldManager: '', newManager: '' })
                        }}>
                          취소
                        </Button>
                      </div>
                    </form>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {isAdmin && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{t('userManagement')}</CardTitle>
                  <Button onClick={() => setShowAddForm(!showAddForm)} disabled={editingId !== null}>
                    {t('addUser')}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {(showAddForm || editingId) && (
                  <form onSubmit={handleSubmit} className="mb-6 space-y-4 p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">{editingId ? t('editUser') : t('addUser')}</h3>
                      {(showAddForm || editingId) && (
                        <Button type="button" variant="ghost" size="sm" onClick={editingId ? cancelEdit : () => setShowAddForm(false)}>
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="name">{t('userName')} *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">{t('email')} *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="password">{t('password')} {editingId && '(변경하지 않으려면 비워두세요)'}</Label>
                      <Input
                        id="password"
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        required={!editingId}
                      />
                    </div>
                    <div>
                      <Label htmlFor="role">{t('role')}</Label>
                      <select
                        id="role"
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        className="w-full px-3 py-2 border rounded-md"
                      >
                        <option value="user">{t('user')}</option>
                        <option value="manager">{t('manager')}</option>
                        <option value="marketer">{t('marketer')}</option>
                        <option value="admin">{t('admin')}</option>
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" disabled={loading}>
                        {loading ? t('saving') : t('save')}
                      </Button>
                      <Button type="button" variant="ghost" onClick={editingId ? cancelEdit : () => setShowAddForm(false)}>
                        {t('cancel')}
                      </Button>
                    </div>
                  </form>
                )}
                
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          {t('userName')}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          {t('email')}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          {t('role')}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          {t('lastLogin')}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          작업
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {users.map((u) => (
                        <tr key={u.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm">{u.name}</td>
                          <td className="px-4 py-3 text-sm">{u.email}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 rounded text-xs ${
                              u.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {formatDateTime(u.last_login_at) || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewExamAnswers(u.id, u.name)}
                                title={t('examAnswers')}
                              >
                                <FileText className="h-4 w-4 text-blue-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => startEdit(u)}
                                disabled={editingId !== null && editingId !== u.id}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(u.id)}
                                disabled={u.id === user?.id}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* 역량 평가 시험 모달 */}
      <ExamModal 
        open={showExamModal} 
        onOpenChange={(open) => {
          setShowExamModal(open)
          if (!open) checkExamStatus() // 모달 닫을 때 제출 상태 다시 확인
        }}
        examRound={currentExamRound}
      />
      
      {/* 어드민 - 직원 답변 조회 모달 */}
      <ExamViewModal 
        open={showExamViewModal} 
        onOpenChange={setShowExamViewModal}
        userId={selectedUserId}
        userName={selectedUserName}
      />
    </div>
  )
}
