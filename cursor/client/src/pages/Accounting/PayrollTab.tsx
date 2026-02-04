import React, { useState, useEffect, useRef } from 'react'
import { Plus, Trash2, Upload, Download, FileText, X } from 'lucide-react'
import api from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency } from './utils'

interface PayrollTabProps {
  language: 'ja' | 'ko'
  isAdmin: boolean
}

const PayrollTab: React.FC<PayrollTabProps> = ({ language, isAdmin }) => {
  // State
  const [monthlyPayrollData, setMonthlyPayrollData] = useState<any[]>([])
  const [monthlyPayrollHistory, setMonthlyPayrollHistory] = useState<string>('')
  
  const currentDate = new Date()
  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth() + 1
  
  const [selectedPayrollYear, setSelectedPayrollYear] = useState<number>(currentYear)
  const [selectedPayrollMonth, setSelectedPayrollMonth] = useState<number>(currentMonth)
  const [editingPayrollCell, setEditingPayrollCell] = useState<{id: string, field: string} | null>(null)
  const [editingPayrollValue, setEditingPayrollValue] = useState<string>('')
  
  const [showAddEmployeeDialog, setShowAddEmployeeDialog] = useState(false)
  const [newEmployeeName, setNewEmployeeName] = useState('')
  
  // 파일 관련 state
  const [payrollFile, setPayrollFile] = useState<any>(null)
  const [isUploadingFile, setIsUploadingFile] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Data fetching
  useEffect(() => {
    fetchMonthlyPayroll()
    fetchPayrollFile()
  }, [selectedPayrollYear, selectedPayrollMonth])

  const fetchMonthlyPayroll = async () => {
    try {
      const response = await api.get(`/monthly-payroll/${selectedPayrollYear}/${selectedPayrollMonth}`)
      setMonthlyPayrollData(response.data.payrollData || [])
      setMonthlyPayrollHistory(response.data.history || '')
    } catch (error) {
      console.error('Monthly payroll fetch error:', error)
    }
  }

  const fetchPayrollFile = async () => {
    try {
      const response = await api.get(`/monthly-payroll/file/${selectedPayrollYear}/${selectedPayrollMonth}`)
      setPayrollFile(response.data.file || null)
    } catch (error) {
      console.error('Payroll file fetch error:', error)
      setPayrollFile(null)
    }
  }

  // Cell editing
  const handlePayrollCellClick = (id: string, field: string, currentValue: any) => {
    setEditingPayrollCell({ id, field })
    const intValue = Math.floor(parseFloat(currentValue) || 0)
    setEditingPayrollValue(intValue.toString())
  }

  const handlePayrollCellSave = async () => {
    if (!editingPayrollCell) return
    
    try {
      await api.put('/monthly-payroll/update', {
        id: editingPayrollCell.id,
        field: editingPayrollCell.field,
        value: editingPayrollValue
      })
      
      setEditingPayrollCell(null)
      setEditingPayrollValue('')
      fetchMonthlyPayroll()
    } catch (error) {
      console.error('Payroll update error:', error)
      alert(language === 'ja' ? '更新に失敗しました' : '업데이트에 실패했습니다')
    }
  }

  const handlePayrollCellCancel = () => {
    setEditingPayrollCell(null)
    setEditingPayrollValue('')
  }

  // History
  const handleSavePayrollHistory = async () => {
    try {
      await api.put('/monthly-payroll/history', {
        fiscalYear: selectedPayrollYear,
        month: selectedPayrollMonth,
        historyText: monthlyPayrollHistory
      })
      alert(language === 'ja' ? '保存しました' : '저장했습니다')
    } catch (error) {
      console.error('History save error:', error)
      alert(language === 'ja' ? '保存に失敗しました' : '저장에 실패했습니다')
    }
  }

  // Employee management
  const handleAddEmployee = async () => {
    if (!newEmployeeName.trim()) {
      alert(language === 'ja' ? '名前を入力してください' : '이름을 입력해주세요')
      return
    }

    try {
      await api.post('/monthly-payroll/add-employee', {
        fiscalYear: selectedPayrollYear,
        month: selectedPayrollMonth,
        employeeName: newEmployeeName.trim()
      })
      
      setNewEmployeeName('')
      setShowAddEmployeeDialog(false)
      fetchMonthlyPayroll()
      alert(language === 'ja' ? '追加しました' : '추가했습니다')
    } catch (error) {
      console.error('Add employee error:', error)
      alert(language === 'ja' ? '追加に失敗しました' : '추가에 실패했습니다')
    }
  }

  const handleDeletePayrollEmployee = async (id: string) => {
    if (!confirm(language === 'ja' ? '削除しますか？' : '삭제하시겠습니까?')) {
      return
    }

    try {
      await api.delete(`/monthly-payroll/${id}`)
      fetchMonthlyPayroll()
      alert(language === 'ja' ? '削除しました' : '삭제했습니다')
    } catch (error) {
      console.error('Delete employee error:', error)
      alert(language === 'ja' ? '削除に失敗しました' : '삭제에 실패했습니다')
    }
  }

  // File management
  const handleFileUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // 파일 크기 확인 (50MB)
    if (file.size > 50 * 1024 * 1024) {
      alert(language === 'ja' ? 'ファイルサイズは50MB以下にしてください' : '파일 크기는 50MB 이하로 해주세요')
      return
    }

    // 확인 메시지
    if (payrollFile) {
      if (!confirm(language === 'ja' 
        ? '既存のファイルを上書きしますか？' 
        : '기존 파일을 덮어쓰시겠습니까?')) {
        event.target.value = ''
        return
      }
    }

    setIsUploadingFile(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('fiscalYear', selectedPayrollYear.toString())
      formData.append('month', selectedPayrollMonth.toString())

      await api.post('/monthly-payroll/file/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      alert(language === 'ja' ? 'アップロードしました' : '업로드했습니다')
      fetchPayrollFile()
    } catch (error: any) {
      console.error('File upload error:', error)
      alert(error.response?.data?.message || (language === 'ja' ? 'アップロードに失敗しました' : '업로드에 실패했습니다'))
    } finally {
      setIsUploadingFile(false)
      event.target.value = ''
    }
  }

  const handleFileDownload = async () => {
    try {
      const response = await api.get(
        `/monthly-payroll/file/download/${selectedPayrollYear}/${selectedPayrollMonth}`,
        { responseType: 'blob' }
      )

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', payrollFile?.fileName || '급여명세서.pdf')
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('File download error:', error)
      alert(language === 'ja' ? 'ダウンロードに失敗しました' : '다운로드에 실패했습니다')
    }
  }

  const handleFileDelete = async () => {
    if (!confirm(language === 'ja' ? 'ファイルを削除しますか？' : '파일을 삭제하시겠습니까?')) {
      return
    }

    try {
      await api.delete(`/monthly-payroll/file/${selectedPayrollYear}/${selectedPayrollMonth}`)
      alert(language === 'ja' ? '削除しました' : '삭제했습니다')
      setPayrollFile(null)
    } catch (error) {
      console.error('File delete error:', error)
      alert(language === 'ja' ? '削除に失敗しました' : '삭제에 실패했습니다')
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  // Auto-generate payroll
  const handleGeneratePayroll = async () => {
    const targetDate = new Date(selectedPayrollYear, selectedPayrollMonth - 1, 1)
    const cutoffDate = new Date(2025, 10, 1) // 2025년 11월 1일
    
    if (targetDate < cutoffDate) {
      alert(language === 'ja' 
        ? '2025年11月1日から自動生成が可能です。それ以前のデータは手動で入力してください。' 
        : '2025년 11월 1일부터 자동 생성이 가능합니다. 이전 데이터는 수동으로 입력해주세요.')
      return
    }

    if (!confirm(language === 'ja' 
      ? `${selectedPayrollYear}年${selectedPayrollMonth}月の給与データを自動生成しますか？\n既存データがある場合は基本給のみ更新され、インセンティブなどは維持されます。`
      : `${selectedPayrollYear}년 ${selectedPayrollMonth}월의 급여 데이터를 자동 생성하시겠습니까?\n기존 데이터가 있는 경우 기본급만 업데이트되고, 인센티브 등은 유지됩니다.`)) {
      return
    }

    try {
      const response = await api.post('/monthly-payroll/generate', {
        fiscalYear: selectedPayrollYear,
        month: selectedPayrollMonth
      })
      
      alert(response.data.message)
      fetchMonthlyPayroll()
    } catch (error: any) {
      console.error('Generate payroll error:', error)
      
      if (error.response?.data?.message === 'existing_data') {
        alert(language === 'ja' 
          ? '給与データを更新しました' 
          : '급여 데이터를 업데이트했습니다')
        fetchMonthlyPayroll()
      } else {
        alert(error.response?.data?.message || (language === 'ja' ? '生成に失敗しました' : '생성에 실패했습니다'))
      }
    }
  }

  // Render cell
  const renderEditableCell = (row: any, field: string, value: any, className: string = '') => {
    const isEditing = editingPayrollCell?.id === row.id && editingPayrollCell?.field === field
    const isNumeric = field !== 'notes'

    return (
      <td 
        className={`px-4 py-3 ${isNumeric ? 'text-right' : 'text-left'} cursor-pointer hover:bg-blue-50 ${className}`}
        onClick={() => handlePayrollCellClick(row.id, field, value)}
      >
        {isEditing ? (
          <input
            type={isNumeric ? 'number' : 'text'}
            step={isNumeric ? '1' : undefined}
            value={editingPayrollValue}
            onChange={(e) => setEditingPayrollValue(e.target.value)}
            onFocus={(e) => e.target.select()}
            onBlur={handlePayrollCellSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handlePayrollCellSave()
              if (e.key === 'Escape') handlePayrollCellCancel()
              if (isNumeric && (e.key === '.' || e.key === ',')) e.preventDefault()
            }}
            autoFocus
            className={`w-full ${isNumeric ? 'text-right' : 'text-left'} border rounded px-1`}
          />
        ) : (
          isNumeric 
            ? formatCurrency(value || 0)
            : <span className="text-xs text-gray-600">{value || '-'}</span>
        )}
      </td>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">{language === 'ja' ? '給与管理' : '급여 관리'}</h2>
        <div className="flex gap-2 items-center">
          <select
            className="border rounded px-3 py-2"
            value={selectedPayrollYear}
            onChange={(e) => setSelectedPayrollYear(Number(e.target.value))}
          >
            {[2024, 2025, 2026, 2027, 2028].map((year) => (
              <option key={year} value={year}>
                {year}{language === 'ja' ? '年度' : '년도'}
              </option>
            ))}
          </select>
          <select
            className="border rounded px-3 py-2"
            value={selectedPayrollMonth}
            onChange={(e) => setSelectedPayrollMonth(Number(e.target.value))}
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((month) => (
              <option key={month} value={month}>
                {month}{language === 'ja' ? '月' : '월'}
              </option>
            ))}
          </select>
          <Button onClick={() => setShowAddEmployeeDialog(true)}>
            <Plus className="h-4 w-4 mr-1" />
            {language === 'ja' ? '従業員追加' : '직원 추가'}
          </Button>
          <Button 
            onClick={handleGeneratePayroll}
            variant="outline"
            className="bg-green-50 hover:bg-green-100"
          >
            {language === 'ja' ? '給与自動生成' : '급여 자동 생성'}
          </Button>
        </div>
      </div>

      {/* File Upload Section */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-gray-500" />
              <div>
                <div className="font-medium text-sm">
                  {language === 'ja' ? '給与明細書' : '급여명세서'}
                </div>
                {payrollFile ? (
                  <div className="text-xs text-gray-500 flex items-center gap-2">
                    <span>{payrollFile.fileName}</span>
                    <span>({formatFileSize(payrollFile.fileSize)})</span>
                  </div>
                ) : (
                  <div className="text-xs text-gray-400">
                    {language === 'ja' ? 'ファイルがアップロードされていません' : '업로드된 파일이 없습니다'}
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              {payrollFile ? (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleFileDownload}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    {language === 'ja' ? 'ダウンロード' : '다운로드'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleFileDelete}
                    className="text-red-600 hover:text-red-700"
                  >
                    <X className="h-4 w-4 mr-1" />
                    {language === 'ja' ? '削除' : '삭제'}
                  </Button>
                </>
              ) : null}
              <Button
                size="sm"
                onClick={handleFileUploadClick}
                disabled={isUploadingFile}
              >
                <Upload className="h-4 w-4 mr-1" />
                {isUploadingFile 
                  ? (language === 'ja' ? 'アップロード中...' : '업로드 중...') 
                  : (language === 'ja' ? 'アップロード' : '업로드')}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.xlsx,.xls,.jpg,.jpeg,.png,.zip"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{language === 'ja' ? '履歴メモ' : '히스토리'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <textarea
              className="flex-1 border rounded px-3 py-2 text-sm resize-none"
              rows={Math.min(15, Math.max(3, (monthlyPayrollHistory?.split('\n').length || 0) + 1))}
              value={monthlyPayrollHistory}
              onChange={(e) => setMonthlyPayrollHistory(e.target.value)}
              placeholder={language === 'ja' ? '履歴を入力...' : '히스토리를 입력...'}
              style={{ maxHeight: '400px', overflowY: 'auto' }}
            />
            <Button onClick={handleSavePayrollHistory} size="sm">
              {language === 'ja' ? '保存' : '저장'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Payroll Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">{language === 'ja' ? '従業員名' : '직원명'}</th>
                  <th className="px-4 py-3 text-right bg-blue-50">{language === 'ja' ? '基本給' : '기본급'}</th>
                  <th className="px-4 py-3 text-right border-l-2 border-gray-300">{language === 'ja' ? 'ココナラ' : '코코나라'}</th>
                  <th className="px-4 py-3 text-right">{language === 'ja' ? '賞与金' : '상여금'}</th>
                  <th className="px-4 py-3 text-right">{language === 'ja' ? 'インセンティブ' : '인센티브'}</th>
                  <th className="px-4 py-3 text-right">{language === 'ja' ? '出張費' : '출장비'}</th>
                  <th className="px-4 py-3 text-right">{language === 'ja' ? '家賃' : '집세'}</th>
                  <th className="px-4 py-3 text-right">{language === 'ja' ? 'その他' : '기타'}</th>
                  <th className="px-4 py-3 text-right font-semibold bg-green-50">{language === 'ja' ? 'インセンティブ合計' : '인센티브 합계'}</th>
                  <th className="px-4 py-3 text-left">{language === 'ja' ? '備考' : '비고'}</th>
                  <th className="px-4 py-3 text-center" style={{ width: '60px' }}>
                    {language === 'ja' ? '操作' : '조작'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {monthlyPayrollData.map((row) => (
                  <tr key={row.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{row.employee_name}</td>
                    {renderEditableCell(row, 'base_salary', row.base_salary, 'bg-blue-50')}
                    {renderEditableCell(row, 'coconala', row.coconala, 'border-l-2 border-gray-300')}
                    {renderEditableCell(row, 'bonus', row.bonus)}
                    {renderEditableCell(row, 'incentive', row.incentive)}
                    {renderEditableCell(row, 'business_trip', row.business_trip)}
                    {renderEditableCell(row, 'rent', row.rent)}
                    {renderEditableCell(row, 'other', row.other)}
                    <td className="px-4 py-3 text-right font-semibold bg-green-50">
                      {formatCurrency(
                        (parseFloat(row.coconala) || 0) +
                        (parseFloat(row.bonus) || 0) +
                        (parseFloat(row.incentive) || 0) +
                        (parseFloat(row.business_trip) || 0) +
                        (parseFloat(row.rent) || 0) +
                        (parseFloat(row.other) || 0)
                      )}
                    </td>
                    {renderEditableCell(row, 'notes', row.notes)}
                    <td className="px-4 py-3 text-center">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDeletePayrollEmployee(row.id)}
                        aria-label={language === 'ja' ? '削除' : '삭제'}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </td>
                  </tr>
                ))}
                
                {/* Total Row */}
                <tr className="border-t-2 bg-blue-50 font-semibold">
                  <td className="px-4 py-3">{language === 'ja' ? '合計' : '계'}</td>
                  <td className="px-4 py-3 text-right bg-blue-100">
                    {formatCurrency(monthlyPayrollData.reduce((sum, r) => sum + (parseFloat(r.base_salary) || 0), 0))}
                  </td>
                  <td className="px-4 py-3 text-right border-l-2 border-gray-300"></td>
                  <td className="px-4 py-3 text-right"></td>
                  <td className="px-4 py-3 text-right"></td>
                  <td className="px-4 py-3 text-right"></td>
                  <td className="px-4 py-3 text-right"></td>
                  <td className="px-4 py-3 text-right"></td>
                  <td className="px-4 py-3 text-right bg-green-100">
                    {formatCurrency(
                      monthlyPayrollData.reduce((sum, r) => 
                        sum + 
                        (parseFloat(r.coconala) || 0) +
                        (parseFloat(r.bonus) || 0) +
                        (parseFloat(r.incentive) || 0) +
                        (parseFloat(r.business_trip) || 0) +
                        (parseFloat(r.rent) || 0) +
                        (parseFloat(r.other) || 0), 0
                      )
                    )}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add Employee Dialog */}
      {showAddEmployeeDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">
              {language === 'ja' ? '従業員追加' : '직원 추가'}
            </h3>
            <input
              type="text"
              value={newEmployeeName}
              onChange={(e) => setNewEmployeeName(e.target.value)}
              placeholder={language === 'ja' ? '従業員名' : '직원명'}
              className="w-full border rounded px-3 py-2 mb-4"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddEmployee()
                if (e.key === 'Escape') setShowAddEmployeeDialog(false)
              }}
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowAddEmployeeDialog(false)}>
                {language === 'ja' ? 'キャンセル' : '취소'}
              </Button>
              <Button onClick={handleAddEmployee}>
                {language === 'ja' ? '追加' : '추가'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PayrollTab




