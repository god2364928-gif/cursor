import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Plus, Pencil, Trash2, Upload, Download, FileText } from 'lucide-react'
import api from '../../lib/api'
import { useI18nStore } from '../../i18n'
import { Employee } from './types'
import { formatCurrency, formatDateOnly } from './utils'

interface EmployeesTabProps {
  isAdmin: boolean
}

export default function EmployeesTab({ isAdmin }: EmployeesTabProps) {
  const { language } = useI18nStore()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [employeeStatusFilter, setEmployeeStatusFilter] = useState<string>('입사중')
  const [showEmployeeForm, setShowEmployeeForm] = useState(false)
  const [showEmployeeDetailModal, setShowEmployeeDetailModal] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [employeeFiles, setEmployeeFiles] = useState<any[]>([])
  const [uploadingFile, setUploadingFile] = useState(false)
  const [selectedYearMonth, setSelectedYearMonth] = useState('')
  const [selectedFileSubcategory, setSelectedFileSubcategory] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchEmployees()
  }, [])

  const fetchEmployees = useCallback(async () => {
    setLoading(true)
    try {
      const response = await api.get('/auth/users')
      setEmployees(response.data)
    } catch (error) {
      console.error('Employees fetch error:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // 필터링된 직원 목록 (메모이제이션)
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const status = emp.employmentStatus || emp.employment_status
      if (employeeStatusFilter === '입사중') {
        return status === '입사중' || status === null || status === ''
      }
      return status === employeeStatusFilter
    })
  }, [employees, employeeStatusFilter])

  const openEmployeeForm = (emp?: Employee) => {
    if (emp) {
      setEditingEmployee(emp)
    } else {
      setEditingEmployee(null)
    }
    setShowEmployeeForm(true)
  }

  const closeEmployeeForm = () => {
    setShowEmployeeForm(false)
    setEditingEmployee(null)
  }

  const handleSubmitEmployee = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    // Helper function to convert empty strings to null
    const getFormValue = (key: string): string | null => {
      const value = formData.get(key)
      if (!value) return null
      const trimmed = String(value).trim()
      return trimmed || null
    }

    const getFormNumberValue = (key: string): number | null => {
      const value = getFormValue(key)
      if (!value) return null
      const num = Number(value)
      return isNaN(num) ? null : num
    }

    try {
      const payload = {
        name: getFormValue('name'),
        email: getFormValue('email'),
        password: getFormValue('password') || undefined,
        hireDate: getFormValue('hireDate'),
        department: getFormValue('department'),
        position: getFormValue('position'),
        employmentStatus: getFormValue('employmentStatus') || '입사중',
        baseSalary: getFormNumberValue('baseSalary'),
        contractStartDate: getFormValue('contractStartDate'),
        contractEndDate: getFormValue('contractEndDate'),
        martId: getFormValue('martId'),
        transportationRoute: getFormValue('transportationRoute'),
        monthlyTransportationCost: getFormNumberValue('monthlyTransportationCost'),
        transportationStartDate: getFormValue('transportationStartDate'),
        transportationDetails: getFormValue('transportationDetails'),
      }

      if (editingEmployee) {
        await api.put(`/auth/users/${editingEmployee.id}`, payload)
        
        // 상세 모달이 열려있으면 해당 직원 정보도 업데이트
        if (selectedEmployee?.id === editingEmployee.id) {
          const response = await api.get(`/auth/users`)
          const updatedEmployee = response.data.find((emp: any) => emp.id === editingEmployee.id)
          if (updatedEmployee) {
            setSelectedEmployee(updatedEmployee)
          }
        }
      } else {
        await api.post('/auth/users', {
          ...payload,
          role: 'user',
          team: formData.get('department') || '',
        })
      }

      closeEmployeeForm()
      fetchEmployees()
    } catch (error: any) {
      console.error('Employee create error:', error)
      alert(error.response?.data?.message || (language === 'ja' ? '追加に失敗しました' : '추가에 실패했습니다'))
    }
  }

  const handleDeleteEmployee = async (id: string) => {
    if (!confirm(language === 'ja' ? '削除しますか？' : '삭제하시겠습니까?')) return
    try {
      await api.delete(`/auth/users/${id}`)
      if (editingEmployee?.id === id) {
        closeEmployeeForm()
      }
      fetchEmployees()
    } catch (error) {
      console.error('Employee delete error:', error)
      alert(language === 'ja' ? '削除に失敗しました' : '삭제에 실패했습니다')
    }
  }

  const openEmployeeDetail = async (employee: Employee) => {
    setSelectedEmployee(employee)
    setShowEmployeeDetailModal(true)
    try {
      const response = await api.get(`/accounting/employees/${employee.id}/files`)
      setEmployeeFiles(response.data)
    } catch (error) {
      console.error('Employee files fetch error:', error)
    }
  }

  const closeEmployeeDetail = () => {
    setShowEmployeeDetailModal(false)
    setSelectedEmployee(null)
    setEmployeeFiles([])
    setSelectedYearMonth('')
    setSelectedFileSubcategory('')
  }

  const handleUploadEmployeeFile = async (fileCategory: string, file: File, subcategory?: string, yearMonth?: string) => {
    if (!selectedEmployee) return
    
    setUploadingFile(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('fileCategory', fileCategory)
      if (subcategory) formData.append('fileSubcategory', subcategory)
      if (yearMonth) formData.append('yearMonth', yearMonth)

      await api.post(`/accounting/employees/${selectedEmployee.id}/files`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      // 파일 목록 새로고침
      const response = await api.get(`/accounting/employees/${selectedEmployee.id}/files`)
      setEmployeeFiles(response.data)
      
      alert(language === 'ja' ? 'アップロードしました' : '업로드되었습니다')
    } catch (error) {
      console.error('File upload error:', error)
      alert(language === 'ja' ? 'アップロードに失敗しました' : '업로드에 실패했습니다')
    } finally {
      setUploadingFile(false)
    }
  }

  const handleDownloadEmployeeFile = async (fileId: string, fileName: string) => {
    if (!selectedEmployee) return
    
    try {
      const response = await api.get(`/accounting/employees/${selectedEmployee.id}/files/${fileId}`, {
        responseType: 'blob'
      })
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', fileName)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('File download error:', error)
      alert(language === 'ja' ? 'ダウンロードに失敗しました' : '다운로드에 실패했습니다')
    }
  }

  const handleDeleteEmployeeFile = async (fileId: string) => {
    if (!selectedEmployee) return
    if (!confirm(language === 'ja' ? '削除しますか？' : '삭제하시겠습니까?')) return
    
    try {
      await api.delete(`/accounting/employees/${selectedEmployee.id}/files/${fileId}`)
      
      // 파일 목록 새로고침
      const response = await api.get(`/accounting/employees/${selectedEmployee.id}/files`)
      setEmployeeFiles(response.data)
      
      alert(language === 'ja' ? '削除しました' : '삭제되었습니다')
    } catch (error) {
      console.error('File delete error:', error)
      alert(language === 'ja' ? '削除に失敗しました' : '삭제에 실패했습니다')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">{language === 'ja' ? '従業員管理' : '직원 관리'}</h2>
        <div className="flex gap-2 items-center">
          <select
            value={employeeStatusFilter}
            onChange={(e) => setEmployeeStatusFilter(e.target.value)}
            className="border rounded px-3 py-2"
          >
            <option value="입사중">{language === 'ja' ? '入社中' : '입사중'}</option>
            <option value="입사전">{language === 'ja' ? '入社前' : '입사전'}</option>
            <option value="퇴사">{language === 'ja' ? '退職' : '퇴사'}</option>
          </select>
          <Button
            onClick={() => {
              if (showEmployeeForm && !editingEmployee) {
                closeEmployeeForm()
              } else {
                openEmployeeForm()
              }
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            {language === 'ja' ? '追加' : '추가'}
          </Button>
        </div>
      </div>

      {showEmployeeForm && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">
              {editingEmployee
                ? language === 'ja'
                  ? '従業員情報を修正'
                  : '직원 정보 수정'
                : language === 'ja'
                ? '従業員を追加'
                : '직원 추가'}
            </h3>
            <form
              key={editingEmployee?.id || 'new-employee'}
              onSubmit={handleSubmitEmployee}
              className="grid grid-cols-2 gap-4"
            >
              <div>
                <label className="block text-sm font-medium mb-1">{language === 'ja' ? '名前' : '이름'}</label>
                <Input type="text" name="name" required defaultValue={editingEmployee?.name || ''} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{language === 'ja' ? 'メールアドレス' : '이메일'}</label>
                <Input type="email" name="email" required defaultValue={editingEmployee?.email || ''} />
              </div>
              {!editingEmployee && (
                <div>
                  <label className="block text-sm font-medium mb-1">{language === 'ja' ? 'パスワード' : '비밀번호'}</label>
                  <Input type="password" name="password" required />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">{language === 'ja' ? '部署' : '부서'}</label>
                <Input type="text" name="department" defaultValue={editingEmployee?.department || ''} placeholder={language === 'ja' ? '経営支援チーム' : '경영지원팀'} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{language === 'ja' ? '職級' : '직급'}</label>
                <select
                  name="position"
                  className="w-full border rounded px-3 py-2"
                  defaultValue={editingEmployee?.position || '사원'}
                >
                  <option value="사원">{language === 'ja' ? '社員' : '사원'}</option>
                  <option value="주임">{language === 'ja' ? '主任' : '주임'}</option>
                  <option value="대리">{language === 'ja' ? '代理' : '대리'}</option>
                  <option value="팀장">{language === 'ja' ? 'チーム長' : '팀장'}</option>
                  <option value="대표">{language === 'ja' ? '代表' : '대표'}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{language === 'ja' ? '入社現況' : '입사현황'}</label>
                <select
                  name="employmentStatus"
                  className="w-full border rounded px-3 py-2"
                  defaultValue={editingEmployee?.employmentStatus || editingEmployee?.employment_status || '입사중'}
                >
                  <option value="입사중">{language === 'ja' ? '入社中' : '입사중'}</option>
                  <option value="입사전">{language === 'ja' ? '入社前' : '입사전'}</option>
                  <option value="퇴사">{language === 'ja' ? '退職' : '퇴사'}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{language === 'ja' ? '入社日' : '입사일'}</label>
                <Input type="date" name="hireDate" defaultValue={formatDateOnly(editingEmployee?.hireDate || editingEmployee?.hire_date)} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{language === 'ja' ? '基本給' : '기본급'}</label>
                <Input
                  type="number"
                  name="baseSalary"
                  defaultValue={editingEmployee?.baseSalary ? String(editingEmployee.baseSalary) : editingEmployee?.base_salary ? String(editingEmployee.base_salary) : ''}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{language === 'ja' ? '契約終了日' : '계약 종료일'}</label>
                <Input type="date" name="contractEndDate" defaultValue={formatDateOnly(editingEmployee?.contractEndDate || editingEmployee?.contract_end_date)} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{language === 'ja' ? 'マートID' : '마트 아이디'}</label>
                <Input type="text" name="martId" defaultValue={editingEmployee?.martId || editingEmployee?.mart_id || ''} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{language === 'ja' ? '交通費経路' : '교통비 경로'}</label>
                <Input type="text" name="transportationRoute" defaultValue={editingEmployee?.transportationRoute || editingEmployee?.transportation_route || ''} placeholder={language === 'ja' ? '西川口~浜松町' : '예: 西川口~浜松町'} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{language === 'ja' ? '月交通費' : '월 교통비'}</label>
                <Input
                  type="number"
                  name="monthlyTransportationCost"
                  defaultValue={editingEmployee?.monthlyTransportationCost ? String(editingEmployee.monthlyTransportationCost) : editingEmployee?.monthly_transportation_cost ? String(editingEmployee.monthly_transportation_cost) : ''}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">{language === 'ja' ? '履歴' : '히스토리'}</label>
                <textarea
                  name="transportationDetails"
                  className="w-full border rounded px-3 py-2"
                  rows={2}
                  defaultValue={editingEmployee?.transportationDetails || editingEmployee?.transportation_details || ''}
                  placeholder=""
                />
              </div>
              <div className="col-span-2 flex gap-2">
                <Button type="submit">
                  {editingEmployee
                    ? language === 'ja'
                      ? '修正を保存'
                      : '수정 저장'
                    : language === 'ja'
                    ? '保存'
                    : '저장'}
                </Button>
                <Button type="button" variant="ghost" onClick={closeEmployeeForm}>
                  {language === 'ja' ? 'キャンセル' : '취소'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredEmployees.map((emp) => (
          <Card key={emp.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openEmployeeDetail(emp)}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-lg">{emp.name}</h3>
                  <p className="text-sm text-gray-600">
                    {emp.department || '-'} • {emp.position || '-'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {emp.email}
                  </p>
                </div>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      ((emp.employmentStatus || emp.employment_status) || '입사중') === '입사중' 
                        ? 'bg-green-100 text-green-800' 
                        : ((emp.employmentStatus || emp.employment_status) || '입사중') === '입사전'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {((emp.employmentStatus || emp.employment_status) || '입사중') === '입사중'
                      ? (language === 'ja' ? '入社中' : '입사중')
                      : ((emp.employmentStatus || emp.employment_status) || '입사중') === '입사전'
                      ? (language === 'ja' ? '入社前' : '입사전')
                      : (language === 'ja' ? '退職' : '퇴사')}
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation()
                      openEmployeeForm(emp)
                    }}
                    aria-label={language === 'ja' ? '修正' : '수정'}
                  >
                    <Pencil className="h-4 w-4 text-emerald-600" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteEmployee(emp.id)
                    }}
                    aria-label={language === 'ja' ? '削除' : '삭제'}
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-gray-600">{language === 'ja' ? '基本給' : '기본급'}</p>
                  <p className="font-bold">{(emp.baseSalary || emp.base_salary) ? formatCurrency(emp.baseSalary || emp.base_salary || 0) : '-'}</p>
                </div>
                <div>
                  <p className="text-gray-600">{language === 'ja' ? '入社日' : '입사일'}</p>
                  <p className="font-bold text-sm">
                    {formatDateOnly(emp.hireDate || emp.hire_date) || '-'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Employee Detail Modal - 여기에 상세 모달 로직 추가 필요 (원본 코드에서 복사) */}
      {showEmployeeDetailModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={closeEmployeeDetail}>
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold">{selectedEmployee.name}</h2>
                  <p className="text-gray-600">{selectedEmployee.email}</p>
                </div>
                <Button variant="ghost" onClick={closeEmployeeDetail}>
                  ×
                </Button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">{language === 'ja' ? '部署' : '부서'}</p>
                    <p className="font-medium">{selectedEmployee.department || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">{language === 'ja' ? '職級' : '직급'}</p>
                    <p className="font-medium">{selectedEmployee.position || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">{language === 'ja' ? '基本給' : '기본급'}</p>
                    <p className="font-medium">
                      {(selectedEmployee.baseSalary || selectedEmployee.base_salary) 
                        ? formatCurrency(selectedEmployee.baseSalary || selectedEmployee.base_salary || 0) 
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">{language === 'ja' ? '入社日' : '입사일'}</p>
                    <p className="font-medium">
                      {formatDateOnly(selectedEmployee.hireDate || selectedEmployee.hire_date) || '-'}
                    </p>
                  </div>
                </div>

                {/* 파일 관리 섹션 */}
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-4">{language === 'ja' ? 'ファイル管理' : '파일 관리'}</h3>
                  
                  {/* 필수 서류 섹션 */}
                  <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="font-semibold mb-3 text-blue-900">
                      {language === 'ja' ? '必須書類' : '필수 서류'}
                    </h4>
                    <div className="space-y-3">
                      {[
                        { category: '이력서', label: language === 'ja' ? '履歴書' : '이력서' },
                        { category: '계약서', label: language === 'ja' ? '契約書' : '계약서' },
                        { category: '인사기록카드', label: language === 'ja' ? '人事記録カード' : '인사기록카드' },
                        { category: '비밀유지계약서', label: language === 'ja' ? '秘密保持契約書' : '비밀유지계약서' },
                        { category: '녹취파일', label: language === 'ja' ? '録音ファイル' : '녹취파일' },
                      ].map(({ category, label }) => {
                        const categoryFiles = employeeFiles.filter((f: any) => f.fileCategory === category)
                        return (
                          <div key={category} className="bg-white p-3 rounded border">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">{label}</span>
                                {categoryFiles.length > 0 ? (
                                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                                    {categoryFiles.length}개
                                  </span>
                                ) : (
                                  <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
                                    {language === 'ja' ? '未登録' : '미등록'}
                                  </span>
                                )}
                              </div>
                              <label className="flex items-center gap-1 px-3 py-1 bg-blue-500 text-white text-xs rounded cursor-pointer hover:bg-blue-600">
                                <Upload className="h-3 w-3" />
                                {language === 'ja' ? 'アップロード' : '업로드'}
                                <input
                                  type="file"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0]
                                    if (file) {
                                      handleUploadEmployeeFile(category, file)
                                      e.target.value = ''
                                    }
                                  }}
                                  disabled={uploadingFile}
                                />
                              </label>
                            </div>
                            {categoryFiles.length > 0 && (
                              <div className="space-y-1 mt-2">
                                {categoryFiles.map((file: any) => (
                                  <div key={file.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded text-xs">
                                    <FileText className="h-4 w-4 text-blue-500 flex-shrink-0" />
                                    <span className="flex-1 truncate">{file.fileName || file.originalName}</span>
                                    <span className="text-gray-500 flex-shrink-0">
                                      {((file.fileSize || 0) / 1024).toFixed(1)} KB
                                    </span>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleDownloadEmployeeFile(file.id, file.fileName || file.originalName)}
                                      className="h-6 w-6 p-0"
                                    >
                                      <Download className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleDeleteEmployeeFile(file.id)}
                                      className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* 일반 서류 섹션 */}
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <h4 className="font-semibold mb-3 text-gray-900">
                      {language === 'ja' ? '一般書類' : '일반 서류'}
                    </h4>
                    <div className="space-y-3">
                      {[
                        { category: '교통비', label: language === 'ja' ? '交通費' : '교통비' },
                        { category: '진단서', label: language === 'ja' ? '診断書' : '진단서' },
                        { category: '기타', label: language === 'ja' ? 'その他' : '기타' },
                      ].map(({ category, label }) => {
                        const categoryFiles = employeeFiles.filter((f: any) => f.fileCategory === category)
                        return (
                          <div key={category} className="bg-white p-3 rounded border">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">{label}</span>
                                {categoryFiles.length > 0 && (
                                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                    {categoryFiles.length}개
                                  </span>
                                )}
                              </div>
                              <label className="flex items-center gap-1 px-3 py-1 bg-gray-500 text-white text-xs rounded cursor-pointer hover:bg-gray-600">
                                <Upload className="h-3 w-3" />
                                {language === 'ja' ? 'アップロード' : '업로드'}
                                <input
                                  type="file"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0]
                                    if (file) {
                                      handleUploadEmployeeFile(category, file)
                                      e.target.value = ''
                                    }
                                  }}
                                  disabled={uploadingFile}
                                />
                              </label>
                            </div>
                            {categoryFiles.length > 0 && (
                              <div className="space-y-1 mt-2">
                                {categoryFiles.map((file: any) => (
                                  <div key={file.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded text-xs">
                                    <FileText className="h-4 w-4 text-gray-500 flex-shrink-0" />
                                    <span className="flex-1 truncate">{file.fileName || file.originalName}</span>
                                    <span className="text-gray-500 flex-shrink-0">
                                      {((file.fileSize || 0) / 1024).toFixed(1)} KB
                                    </span>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleDownloadEmployeeFile(file.id, file.fileName || file.originalName)}
                                      className="h-6 w-6 p-0"
                                    >
                                      <Download className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleDeleteEmployeeFile(file.id)}
                                      className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

