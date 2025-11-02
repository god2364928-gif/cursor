import { useState, useEffect } from 'react'
import api from '../lib/api'
import { useAuthStore } from '../store/authStore'
import { useI18nStore } from '../i18n'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Edit2, Trash2, X } from 'lucide-react'

interface User {
  id: string
  name: string
  email: string
  role: string
  created_at: string
}

export default function SettingsPage() {
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

  useEffect(() => {
    if (isAdmin) {
      fetchUsers()
    }
  }, [isAdmin])

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
                          <td className="px-4 py-3 text-sm">
                            <div className="flex gap-2">
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
    </div>
  )
}
