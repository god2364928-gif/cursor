import React, { useState, useEffect, useMemo, useCallback } from 'react'
import api from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Upload, Trash2, TrendingUp, TrendingDown, Pencil, RotateCcw } from 'lucide-react'
import { useAccountingStore } from '@/store/accountingStore'
import { Transaction, SimpleUser, AutoMatchRule } from './types'
import { CATEGORY_OPTIONS } from './constants'
import { formatCurrency, formatDateOnly } from './utils'
import { DatePickerInput } from '@/components/ui/date-picker-input'

interface TransactionsTabProps {
  language: 'ja' | 'ko'
  isAdmin: boolean
  onTransactionChange?: () => void // Dashboard 새로고침용
}

const TransactionsTab: React.FC<TransactionsTabProps> = ({ language, isAdmin, onTransactionChange }) => {
  const { startDate, endDate, setStartDate, setEndDate, setDateRange } = useAccountingStore()
  
  // 상태
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set())
  const [updatingTransactionId, setUpdatingTransactionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  
  // 필터
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [nameFilter, setNameFilter] = useState<string>('all')
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all')
  const [bankNameFilter, setBankNameFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  
  // 폼
  const [showTransactionForm, setShowTransactionForm] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  
  // 이름 옵션
  const [nameOptions, setNameOptions] = useState<SimpleUser[]>([])
  
  // 일괄 편집
  const [showBulkEditDialog, setShowBulkEditDialog] = useState(false)
  const [bulkEditCategory, setBulkEditCategory] = useState('')
  const [bulkEditAssignedUserId, setBulkEditAssignedUserId] = useState('')
  
  // 자동 매칭
  const [showAutoMatchDialog, setShowAutoMatchDialog] = useState(false)
  const [autoMatchRules, setAutoMatchRules] = useState<AutoMatchRule[]>([])
  const [editingRule, setEditingRule] = useState<AutoMatchRule | null>(null)
  
  // CSV 업로드
  const [uploadingCsv, setUploadingCsv] = useState(false)
  
  // SMBC 붙여넣기
  const [showSmbcPasteDialog, setShowSmbcPasteDialog] = useState(false)
  const [smbcPasteText, setSmbcPasteText] = useState('')
  const [uploadingSmbc, setUploadingSmbc] = useState(false)
  
  // 메모 편집
  const [editingMemoId, setEditingMemoId] = useState<string | null>(null)
  const [memoDrafts, setMemoDrafts] = useState<{ [key: string]: string }>({})

  useEffect(() => {
    fetchTransactions()
    fetchNameOptions()
    fetchAutoMatchRules()
  }, [startDate, endDate])

  const fetchTransactions = useCallback(async () => {
    setLoading(true)
    try {
      console.log('📡 Fetching transactions:', { startDate, endDate, limit: 1000 })
      const response = await api.get('/accounting/transactions', {
        params: {
          startDate,
          endDate,
          limit: 1000  // 증가
        }
      })
      console.log('📥 Received transactions:', response.data.length)
      setTransactions(response.data)
    } catch (error) {
      console.error('Transactions fetch error:', error)
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate])

  const fetchNameOptions = async () => {
    try {
      const response = await api.get('/auth/users')
      setNameOptions(
        response.data.map((user: any) => ({
          id: user.id,
          name: user.name,
        }))
      )
    } catch (error) {
      console.error('Name options fetch error:', error)
    }
  }

  const fetchAutoMatchRules = async () => {
    try {
      const response = await api.get('/accounting/auto-match-rules')
      setAutoMatchRules(response.data)
    } catch (error) {
      console.error('Auto match rules fetch error:', error)
    }
  }

  const handleStartDateChange = (newDate: string) => {
    if (!newDate) return
    const endDateObj = new Date(endDate)
    const newDateObj = new Date(newDate)
    
    if (newDateObj > endDateObj) {
      alert(language === 'ja' ? '開始日は終了日より前でなければなりません' : '시작일은 종료일보다 이전이어야 합니다')
      return
    }
    setStartDate(newDate)
  }

  const handleEndDateChange = (newDate: string) => {
    if (!newDate) return
    const startDateObj = new Date(startDate)
    const newDateObj = new Date(newDate)
    
    if (newDateObj < startDateObj) {
      alert(language === 'ja' ? '終了日は開始日より後でなければなりません' : '종료일은 시작일보다 이후여야 합니다')
      return
    }
    setEndDate(newDate)
  }

  const handlePreviousMonth = () => {
    // 현재 선택된 시작일 기준으로 이전 월 계산
    const [year, month] = startDate.split('-').map(Number)
    const prevMonth = month === 1 ? 12 : month - 1
    const prevYear = month === 1 ? year - 1 : year
    
    // 이전 월의 1일
    const startDateStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`
    
    // 이전 월의 마지막 날
    const lastDay = new Date(prevYear, prevMonth, 0).getDate()
    const endDateStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    
    setDateRange(startDateStr, endDateStr)
  }

  const handleCurrentMonth = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() // 0-11
    
    // 시작일: 현재 월의 1일 (타임존 영향 없이 직접 문자열 생성)
    const startDateStr = `${year}-${String(month + 1).padStart(2, '0')}-01`
    
    // 종료일: 오늘 (타임존 영향 없이 로컬 날짜 사용)
    const endDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    
    setDateRange(startDateStr, endDateStr)
  }

  const handleNextMonth = () => {
    // 현재 선택된 시작일 기준으로 다음 월 계산
    const [year, month] = startDate.split('-').map(Number)
    const nextMonth = month === 12 ? 1 : month + 1
    const nextYear = month === 12 ? year + 1 : year
    
    // 다음 월의 1일
    const startDateStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`
    
    // 다음 월의 마지막 날
    const lastDay = new Date(nextYear, nextMonth, 0).getDate()
    const endDateStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    
    setDateRange(startDateStr, endDateStr)
  }

  const openTransactionForm = (tx?: Transaction) => {
    if (tx) {
      setEditingTransaction(tx)
    } else {
      setEditingTransaction(null)
    }
    setShowTransactionForm(true)
  }

  const closeTransactionForm = () => {
    setShowTransactionForm(false)
    setEditingTransaction(null)
  }

  const handleSubmitTransaction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    const formatTimeValue = (value: FormDataEntryValue | null) => {
      if (!value) return ''
      const str = String(value).trim()
      if (!str) return ''
      return str.length === 5 ? `${str}` : str
    }

    const assignedUserIdValue = formData.get('assignedUserId')
    const memoValue = formData.get('memo')
    const itemNameValue = formData.get('itemName')

    try {
      const payload = {
        transactionDate: formData.get('transactionDate'),
        transactionTime: formatTimeValue(formData.get('transactionTime')),
        transactionType: formData.get('transactionType'),
        category: formData.get('category'),
        paymentMethod: formData.get('paymentMethod'),
        itemName: itemNameValue ? String(itemNameValue) : '',
        amount: Number(formData.get('amount')),
        assignedUserId: assignedUserIdValue ? String(assignedUserIdValue) : null,
        memo: memoValue ? String(memoValue) : null,
      }

      if (editingTransaction) {
        await api.put(`/accounting/transactions/${editingTransaction.id}`, payload)
      } else {
        await api.post('/accounting/transactions', payload)
      }

      closeTransactionForm()
      fetchTransactions()
      onTransactionChange?.() // Dashboard 새로고침
    } catch (error) {
      console.error('Transaction create error:', error)
      alert(language === 'ja' ? '追加に失敗しました' : '추가에 실패했습니다')
    }
  }

  const handleDeleteTransaction = async (id: string) => {
    if (!confirm(language === 'ja' ? '削除しますか？' : '삭제하시겠습니까?')) return
    
    try {
      await api.delete(`/accounting/transactions/${id}`)
      if (editingTransaction?.id === id) {
        closeTransactionForm()
      }
      fetchTransactions()
      onTransactionChange?.()
    } catch (error) {
      console.error('Transaction delete error:', error)
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const filtered = filteredTransactionsSummary.filtered
      const allIds = new Set(filtered.map(t => t.id))
      setSelectedTransactions(allIds)
    } else {
      setSelectedTransactions(new Set())
    }
  }

  const handleSelectTransaction = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedTransactions)
    if (checked) {
      newSelected.add(id)
    } else {
      newSelected.delete(id)
    }
    setSelectedTransactions(newSelected)
  }

  const handleQuickUpdateTransaction = async (
    id: string,
    updates: { category?: string; assignedUserId?: string | null }
  ) => {
    setUpdatingTransactionId(id)
    try {
      await api.put(`/accounting/transactions/${id}`, updates)
      fetchTransactions()
      onTransactionChange?.()
    } catch (error) {
      console.error('Quick update error:', error)
    } finally {
      setUpdatingTransactionId(null)
    }
  }

  const handleBulkEdit = async () => {
    if (selectedTransactions.size === 0) return
    
    const updates: any = {}
    if (bulkEditCategory) updates.category = bulkEditCategory
    if (bulkEditAssignedUserId) updates.assignedUserId = bulkEditAssignedUserId
    
    if (Object.keys(updates).length === 0) {
      alert(language === 'ja' ? '変更項目を選択してください' : '변경할 항목을 선택하세요')
      return
    }

    try {
      await api.put('/accounting/transactions/bulk-update', {
        transactionIds: Array.from(selectedTransactions),
        updates
      })
      
      fetchTransactions()
      onTransactionChange?.()
      setShowBulkEditDialog(false)
      setBulkEditCategory('')
      setBulkEditAssignedUserId('')
      setSelectedTransactions(new Set())
    } catch (error) {
      console.error('Bulk edit error:', error)
      alert(language === 'ja' ? '一括編集に失敗しました' : '일괄 변경에 실패했습니다')
    }
  }

  const handleBulkDelete = async () => {
    if (selectedTransactions.size === 0) return
    
    if (!confirm(language === 'ja' ? `${selectedTransactions.size}件を削除しますか？` : `${selectedTransactions.size}건을 삭제하시겠습니까?`)) return

    try {
      await api.post('/accounting/transactions/bulk-delete', {
        transactionIds: Array.from(selectedTransactions)
      })
      
      fetchTransactions()
      onTransactionChange?.()
      setSelectedTransactions(new Set())
    } catch (error) {
      console.error('Bulk delete error:', error)
      alert(language === 'ja' ? '一括削除に失敗しました' : '일괄 삭제에 실패했습니다')
    }
  }

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingCsv(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      await api.post('/accounting/transactions/csv-upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      fetchTransactions()
      onTransactionChange?.()
      alert(language === 'ja' ? 'アップロード成功' : '업로드 성공')
    } catch (error) {
      console.error('CSV upload error:', error)
      alert(language === 'ja' ? 'アップロード失敗' : '업로드 실패')
    } finally {
      setUploadingCsv(false)
      e.target.value = ''
    }
  }

  const handleSmbcPasteUpload = async () => {
    if (!smbcPasteText.trim()) {
      alert(language === 'ja' ? 'テキストを入力してください' : '텍스트를 입력하세요')
      return
    }

    setUploadingSmbc(true)
    try {
      const response = await api.post('/accounting/transactions/smbc-paste', {
        pastedText: smbcPasteText
      })
      
      fetchTransactions()
      onTransactionChange?.()
      setShowSmbcPasteDialog(false)
      setSmbcPasteText('')
      
      const { imported, errors } = response.data
      alert(
        language === 'ja' 
          ? `${imported}件アップロード成功${errors > 0 ? ` (${errors}件エラー)` : ''}` 
          : `${imported}건 업로드 성공${errors > 0 ? ` (${errors}건 오류)` : ''}`
      )
    } catch (error) {
      console.error('SMBC paste upload error:', error)
      alert(language === 'ja' ? 'アップロード失敗' : '업로드 실패')
    } finally {
      setUploadingSmbc(false)
    }
  }

  const handleMemoEdit = (id: string, currentMemo: string | null) => {
    setEditingMemoId(id)
    setMemoDrafts({ ...memoDrafts, [id]: currentMemo || '' })
  }

  const handleMemoChange = (id: string, value: string) => {
    setMemoDrafts({ ...memoDrafts, [id]: value })
  }

  const handleMemoSave = async (id: string) => {
    const newMemo = memoDrafts[id] || ''
    await handleQuickUpdateTransaction(id, { memo: newMemo } as any)
    setEditingMemoId(null)
  }

  const handleMemoCancel = (id: string) => {
    setEditingMemoId(null)
    const newDrafts = { ...memoDrafts }
    delete newDrafts[id]
    setMemoDrafts(newDrafts)
  }

  const handleSaveAutoMatchRule = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    const payload = {
      keyword: formData.get('keyword'),
      category: formData.get('category') || null,
      assignedUserId: formData.get('assignedUserId') || null,
      paymentMethod: formData.get('paymentMethod') || null,
      priority: Number(formData.get('priority')) || 0,
    }

    try {
      if (editingRule) {
        await api.put(`/accounting/auto-match-rules/${editingRule.id}`, payload)
      } else {
        await api.post('/accounting/auto-match-rules', payload)
      }
      
      fetchAutoMatchRules()
      setEditingRule(null)
      e.currentTarget.reset()
    } catch (error) {
      console.error('Save auto match rule error:', error)
      alert(language === 'ja' ? '保存に失敗しました' : '저장에 실패했습니다')
    }
  }

  const handleDeleteAutoMatchRule = async (id: string) => {
    if (!confirm(language === 'ja' ? '削除しますか？' : '삭제하시겠습니까?')) return

    try {
      await api.delete(`/accounting/auto-match-rules/${id}`)
      fetchAutoMatchRules()
    } catch (error) {
      console.error('Delete auto match rule error:', error)
    }
  }

  // 필터링된 거래내역과 입금/출금 합계 계산
  const filteredTransactionsSummary = useMemo(() => {
    console.log('🔍 Filter Debug:', { 
      startDate, 
      endDate, 
      totalTransactions: transactions.length,
      filters: { transactionTypeFilter, categoryFilter, nameFilter, paymentMethodFilter, bankNameFilter, searchQuery }
    })
    
    const filtered = transactions.filter(tx => {
      // 1. 날짜 데이터 정제 (시간 제거) - 'YYYY-MM-DD'만 추출
      const txDateOnly = tx.transactionDate ? tx.transactionDate.substring(0, 10) : ''
      
      // 2. 날짜 범위 체크 (범위를 벗어나면 즉시 탈락)
      if (startDate && txDateOnly < startDate) {
        console.log('❌ 날짜 제외 (시작일 이전):', txDateOnly, '< ', startDate)
        return false
      }
      if (endDate && txDateOnly > endDate) {
        console.log('❌ 날짜 제외 (종료일 이후):', txDateOnly, '>', endDate)
        return false
      }
      
      // 3. 구분 필터 (입금/출금)
      if (transactionTypeFilter !== 'all' && tx.transactionType !== transactionTypeFilter) {
        return false
      }
      
      // 4. 카테고리 필터
      if (categoryFilter !== 'all' && tx.category !== categoryFilter) {
        return false
      }
      
      // 5. 이름 필터
      if (nameFilter !== 'all' && tx.assignedUserId !== nameFilter) {
        return false
      }
      
      // 6. 결제수단 필터
      if (paymentMethodFilter !== 'all' && tx.paymentMethod !== paymentMethodFilter) {
        return false
      }
      
      // 7. 은행명 필터
      if (bankNameFilter !== 'all' && tx.bankName !== bankNameFilter) {
        return false
      }
      
      // 8. 검색어 필터
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const itemMatch = tx.itemName?.toLowerCase().includes(query)
        const memoMatch = tx.memo?.toLowerCase().includes(query)
        if (!itemMatch && !memoMatch) {
          return false
        }
      }
      
      // 모든 검문을 통과한 데이터만 포함
      return true
    })
    
    const incomeTotal = filtered
      .filter(tx => tx.transactionType === '입금')
      .reduce((sum, tx) => sum + tx.amount, 0)
    
    const expenseTotal = filtered
      .filter(tx => tx.transactionType === '출금')
      .reduce((sum, tx) => sum + tx.amount, 0)
    
    return { filtered, incomeTotal, expenseTotal }
  }, [transactions, startDate, endDate, transactionTypeFilter, categoryFilter, nameFilter, paymentMethodFilter, bankNameFilter, searchQuery])

  return (
    <div className="space-y-4">
      {/* 날짜 필터 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-center flex-wrap">
            <div className="flex gap-2 items-center">
              <label className="text-sm font-medium">
                {language === 'ja' ? '開始日' : '시작일'}:
              </label>
              <DatePickerInput
                value={startDate}
                onChange={handleStartDateChange}
              />
            </div>
            <div className="flex gap-2 items-center">
              <label className="text-sm font-medium">
                {language === 'ja' ? '終了日' : '종료일'}:
              </label>
              <DatePickerInput
                value={endDate}
                onChange={handleEndDateChange}
              />
            </div>
            <Button onClick={handlePreviousMonth} variant="outline">
              {language === 'ja' ? '前月' : '전월'}
            </Button>
            <Button onClick={handleCurrentMonth}>
              {language === 'ja' ? '今月' : '당월'}
            </Button>
            <Button onClick={handleNextMonth} variant="outline">
              {language === 'ja' ? '来月' : '내월'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 필터 & 검색 & 작업 버튼 */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">{language === 'ja' ? '区分' : '구분'}</label>
              <select
                value={transactionTypeFilter}
                onChange={(e) => setTransactionTypeFilter(e.target.value)}
                className="w-full border rounded px-3 py-2"
              >
                <option value="all">{language === 'ja' ? '全て' : '전체'}</option>
                <option value="입금">{language === 'ja' ? '入金' : '입금'}</option>
                <option value="출금">{language === 'ja' ? '出金' : '출금'}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{language === 'ja' ? 'カテゴリ' : '카테고리'}</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full border rounded px-3 py-2"
              >
                <option value="all">{language === 'ja' ? '全て' : '전체'}</option>
                {CATEGORY_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {language === 'ja' ? opt.labelJa : opt.labelKo}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{language === 'ja' ? '名前' : '이름'}</label>
              <select
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
                className="w-full border rounded px-3 py-2"
              >
                <option value="all">{language === 'ja' ? '全て' : '전체'}</option>
                {nameOptions.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{language === 'ja' ? '決済' : '결제'}</label>
              <select
                value={paymentMethodFilter}
                onChange={(e) => setPaymentMethodFilter(e.target.value)}
                className="w-full border rounded px-3 py-2"
              >
                <option value="all">{language === 'ja' ? '全て' : '전체'}</option>
                <option value="계좌이체">{language === 'ja' ? '口座振替' : '계좌이체'}</option>
                <option value="PayPay">PayPay</option>
                <option value="페이팔">{language === 'ja' ? 'ペイパル' : '페이팔'}</option>
                <option value="카드">{language === 'ja' ? 'カード' : '카드'}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{language === 'ja' ? '銀行' : '은행'}</label>
              <select
                value={bankNameFilter}
                onChange={(e) => setBankNameFilter(e.target.value)}
                className="w-full border rounded px-3 py-2"
              >
                <option value="all">{language === 'ja' ? '全て' : '전체'}</option>
                <option value="PayPay">PayPay</option>
                <option value="SMBC">SMBC</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{language === 'ja' ? '検索' : '검색'}</label>
              <Input
                type="text"
                placeholder={language === 'ja' ? '項目名、メモで検索' : '항목명, 메모 검색'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end items-center">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                title={language === 'ja' ? 'リセット' : '필터 초기화'}
                onClick={() => {
                  setTransactionTypeFilter('all')
                  setCategoryFilter('all')
                  setNameFilter('all')
                  setPaymentMethodFilter('all')
                  setBankNameFilter('all')
                  setSearchQuery('')
                }}
                className="h-9 w-9 text-gray-500 hover:text-gray-800"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowAutoMatchDialog(true)}
              >
                {language === 'ja' ? '自動マッチング設定' : '자동 매칭 설정'}
              </Button>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCsvUpload}
                  className="hidden"
                  disabled={uploadingCsv}
                />
                <div className={`inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3 ${uploadingCsv ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                  <Upload className="h-4 w-4 mr-2" />
                  {uploadingCsv ? (language === 'ja' ? 'アップロード中...' : '업로드 중...') : (language === 'ja' ? 'CSV (PayPay)' : 'CSV (PayPay)')}
                </div>
              </label>
              <Button
                variant="outline"
                onClick={() => setShowSmbcPasteDialog(true)}
                disabled={uploadingSmbc}
              >
                <Upload className="h-4 w-4 mr-2" />
                {language === 'ja' ? '貼り付け (SMBC)' : '붙여넣기 (SMBC)'}
              </Button>
              <Button
                onClick={() => {
                  if (showTransactionForm && !editingTransaction) {
                    closeTransactionForm()
                  } else {
                    openTransactionForm()
                  }
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                {language === 'ja' ? '追加' : '추가'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 거래 추가/수정 폼 */}
      {showTransactionForm && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">
              {editingTransaction
                ? language === 'ja'
                  ? '取引を修正する'
                  : '거래 수정'
                : language === 'ja'
                ? '取引を追加する'
                : '거래 추가'}
            </h3>
            <form
              key={editingTransaction?.id || 'new'}
              onSubmit={handleSubmitTransaction}
              className="grid grid-cols-2 gap-4"
            >
              <div>
                <label className="block text-sm font-medium mb-1">{language === 'ja' ? '日付' : '날짜'}</label>
                <Input
                  type="date"
                  name="transactionDate"
                  required
                  defaultValue={editingTransaction?.transactionDate || ''}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{language === 'ja' ? '時間' : '시간'}</label>
                <Input
                  type="time"
                  name="transactionTime"
                  defaultValue={editingTransaction?.transactionTime || ''}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{language === 'ja' ? '区分' : '구분'}</label>
                <select
                  name="transactionType"
                  className="w-full border rounded px-3 py-2"
                  required
                  defaultValue={editingTransaction?.transactionType || '입금'}
                >
                  <option value="입금">{language === 'ja' ? '入金' : '입금'}</option>
                  <option value="출금">{language === 'ja' ? '出金' : '출금'}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{language === 'ja' ? 'カテゴリ' : '카테고리'}</label>
                <select
                  name="category"
                  className="w-full border rounded px-3 py-2"
                  required
                  defaultValue={editingTransaction?.category || '지정없음'}
                >
                  {CATEGORY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {language === 'ja' ? option.labelJa : option.labelKo}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{language === 'ja' ? '名前' : '이름'}</label>
                <select
                  name="assignedUserId"
                  className="w-full border rounded px-3 py-2"
                  defaultValue={editingTransaction?.assignedUserId || ''}
                >
                  <option value="">{language === 'ja' ? '未選択' : '선택 안 함'}</option>
                  {nameOptions.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{language === 'ja' ? '決済手段' : '결제수단'}</label>
                <select
                  name="paymentMethod"
                  className="w-full border rounded px-3 py-2"
                  required
                  defaultValue={
                    editingTransaction?.paymentMethod
                      ? (editingTransaction.paymentMethod === '현금' || editingTransaction.paymentMethod === '은행' || editingTransaction.paymentMethod === '현금/은행'
                          ? '계좌이체'
                          : editingTransaction.paymentMethod === 'Stripe'
                          ? '페이팔'
                          : editingTransaction.paymentMethod)
                      : '계좌이체'
                  }
                >
                  <option value="계좌이체">{language === 'ja' ? '口座振替' : '계좌이체'}</option>
                  <option value="PayPay">PayPay</option>
                  <option value="페이팔">{language === 'ja' ? 'ペイパル' : '페이팔'}</option>
                  <option value="카드">{language === 'ja' ? 'カード' : '카드'}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{language === 'ja' ? '項目名' : '항목명'}</label>
                <Input
                  type="text"
                  name="itemName"
                  required
                  defaultValue={editingTransaction?.itemName || ''}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{language === 'ja' ? '金額' : '금액'}</label>
                <Input
                  type="number"
                  name="amount"
                  required
                  defaultValue={editingTransaction ? String(editingTransaction.amount) : ''}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">{language === 'ja' ? 'メモ' : '메모'}</label>
                <Input type="text" name="memo" defaultValue={editingTransaction?.memo || ''} />
              </div>
              <div className="col-span-2 flex gap-2">
                <Button type="submit">
                  {editingTransaction
                    ? language === 'ja'
                      ? '修正を保存'
                      : '수정 저장'
                    : language === 'ja'
                    ? '保存'
                    : '저장'}
                </Button>
                <Button type="button" variant="ghost" onClick={closeTransactionForm}>
                  {language === 'ja' ? 'キャンセル' : '취소'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* 선택한 항목 일괄 변경 버튼 */}
      {selectedTransactions.size > 0 && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">
                {language === 'ja' 
                  ? `${selectedTransactions.size}件選択中` 
                  : `${selectedTransactions.size}건 선택됨`}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBulkEditDialog(true)}
                >
                  {language === 'ja' ? '一括編集' : '일괄 변경'}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDelete}
                >
                  {language === 'ja' ? '一括削除' : '일괄 삭제'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedTransactions(new Set())}
                >
                  {language === 'ja' ? '選択解除' : '선택 해제'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 입금/출금 합계 표시 */}
      <div className="flex gap-4 mb-4">
        <Card className="flex-1">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-emerald-100">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <div className="text-sm text-gray-500">{language === 'ja' ? '入金合計' : '입금합계'}</div>
                <div className="text-xl font-bold text-emerald-600">{formatCurrency(filteredTransactionsSummary.incomeTotal)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="flex-1">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-red-100">
                <TrendingDown className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <div className="text-sm text-gray-500">{language === 'ja' ? '出金合計' : '출금합계'}</div>
                <div className="text-xl font-bold text-red-600">{formatCurrency(filteredTransactionsSummary.expenseTotal)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 거래 내역 테이블 */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-center" style={{ width: '40px' }}>
                    <input
                      type="checkbox"
                      checked={selectedTransactions.size > 0 && filteredTransactionsSummary.filtered.length > 0}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="cursor-pointer"
                    />
                  </th>
                  <th className="px-3 py-3 text-left" style={{ width: '140px' }}>{language === 'ja' ? '日時' : '날짜/시간'}</th>
                  <th className="px-3 py-3 text-center" style={{ width: '60px' }}>{language === 'ja' ? '区分' : '구분'}</th>
                  <th className="px-3 py-3 text-left" style={{ width: '280px' }}>{language === 'ja' ? '項目' : '항목'}</th>
                  <th className="px-3 py-3 text-left" style={{ width: '100px' }}>{language === 'ja' ? 'カテゴリ' : '카테고리'}</th>
                  <th className="px-3 py-3 text-left" style={{ width: '120px' }}>{language === 'ja' ? '名前' : '이름'}</th>
                  <th className="px-3 py-3 text-right" style={{ width: '120px' }}>{language === 'ja' ? '金額' : '금액'}</th>
                  <th className="px-3 py-3 text-left" style={{ width: '80px' }}>{language === 'ja' ? '決済' : '결제'}</th>
                  <th className="px-3 py-3 text-left" style={{ width: '70px' }}>{language === 'ja' ? '銀行' : '은행'}</th>
                  <th className="px-3 py-3 text-left" style={{ width: '150px' }}>{language === 'ja' ? 'メモ' : '메모'}</th>
                  <th className="px-3 py-3 text-center" style={{ width: '60px' }}>{language === 'ja' ? '操作' : '조작'}</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactionsSummary.filtered.map((tx, idx) => (
                  <tr key={tx.id} className={`border-t transition-colors hover:bg-blue-50/40 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}`}>
                    <td className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={selectedTransactions.has(tx.id)}
                        onChange={(e) => handleSelectTransaction(tx.id, e.target.checked)}
                        className="cursor-pointer"
                      />
                    </td>
                    <td className="px-3 py-2 text-sm">
                      {tx.transactionTime ? (
                        <>
                          <div>{tx.transactionDate}</div>
                          <div className="text-xs text-gray-500">{tx.transactionTime}</div>
                        </>
                      ) : (
                        <div>{tx.transactionDate}</div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide ${
                        tx.transactionType === '입금' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'
                      }`}>
                        {tx.transactionType === '입금' ? (language === 'ja' ? '入' : '입') : (language === 'ja' ? '出' : '출')}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-sm" style={{ maxWidth: '280px' }}>
                      <div className="truncate">{tx.itemName}</div>
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={tx.category}
                        onChange={(e) => handleQuickUpdateTransaction(tx.id, { category: e.target.value })}
                        disabled={updatingTransactionId === tx.id}
                        className={`w-full border rounded px-2 py-1 text-sm ${updatingTransactionId === tx.id ? 'opacity-60 cursor-wait' : ''}`}
                      >
                        {CATEGORY_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {language === 'ja' ? option.labelJa : option.labelKo}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={tx.assignedUserId ?? ''}
                        onChange={(e) =>
                          handleQuickUpdateTransaction(tx.id, {
                            assignedUserId: e.target.value ? e.target.value : null,
                          })
                        }
                        disabled={updatingTransactionId === tx.id || nameOptions.length === 0}
                        className={`w-full border rounded px-2 py-1 text-sm ${
                          updatingTransactionId === tx.id ? 'opacity-60 cursor-wait' : ''
                        }`}
                      >
                        <option value="">{language === 'ja' ? '未選択' : '선택 안 함'}</option>
                        {nameOptions.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-sm tabular-nums">{formatCurrency(tx.amount)}</td>
                    <td className="px-3 py-2 text-sm">{tx.paymentMethod}</td>
                    <td className="px-3 py-2 text-sm">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        tx.bankName === 'SMBC' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {tx.bankName || 'PayPay'}
                      </span>
                    </td>
                    <td className="px-3 py-2" style={{ maxWidth: '250px' }}>
                      {editingMemoId === tx.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={memoDrafts[tx.id] ?? ''}
                            placeholder={language === 'ja' ? 'メモを入力' : '메모 입력'}
                            onChange={(e) => handleMemoChange(tx.id, e.target.value)}
                            disabled={updatingTransactionId === tx.id}
                            className="text-xs flex-1"
                            autoFocus
                          />
                          <Button
                            size="sm"
                            onClick={() => handleMemoSave(tx.id)}
                            disabled={updatingTransactionId === tx.id}
                            className="h-8 px-3 text-xs"
                          >
                            {language === 'ja' ? '保存' : '저장'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMemoCancel(tx.id)}
                            disabled={updatingTransactionId === tx.id}
                            className="h-8 px-3 text-xs"
                          >
                            {language === 'ja' ? 'キャンセル' : '취소'}
                          </Button>
                        </div>
                      ) : (
                        <div 
                          className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded min-h-[28px]"
                          onClick={() => handleMemoEdit(tx.id, tx.memo ?? null)}
                        >
                          <span className="text-xs flex-1 truncate text-gray-600">
                            {tx.memo || ''}
                          </span>
                          <Pencil className="w-3 h-3 text-gray-400" />
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDeleteTransaction(tx.id)}
                        aria-label={language === 'ja' ? '削除' : '삭제'}
                        className="text-gray-300 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 일괄 변경 모달 */}
      {showBulkEditDialog && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowBulkEditDialog(false)
            }
          }}
        >
          <Card className="w-96">
            <CardHeader>
              <CardTitle>{language === 'ja' ? '一括編集' : '일괄 변경'}</CardTitle>
              <p className="text-sm text-gray-600">
                {language === 'ja' 
                  ? `${selectedTransactions.size}件の項目を編集します` 
                  : `${selectedTransactions.size}건의 항목을 변경합니다`}
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {language === 'ja' ? 'カテゴリ' : '카테고리'}
                  </label>
                  <select
                    value={bulkEditCategory}
                    onChange={(e) => setBulkEditCategory(e.target.value)}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="">{language === 'ja' ? '変更しない' : '변경하지 않음'}</option>
                    {CATEGORY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {language === 'ja' ? option.labelJa : option.labelKo}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    {language === 'ja' ? '担当者' : '담당자'}
                  </label>
                  <select
                    value={bulkEditAssignedUserId}
                    onChange={(e) => setBulkEditAssignedUserId(e.target.value)}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="">{language === 'ja' ? '変更しない' : '변경하지 않음'}</option>
                    {nameOptions.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2 justify-end pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowBulkEditDialog(false)
                      setBulkEditCategory('')
                      setBulkEditAssignedUserId('')
                    }}
                  >
                    {language === 'ja' ? 'キャンセル' : '취소'}
                  </Button>
                  <Button onClick={handleBulkEdit}>
                    {language === 'ja' ? '適用' : '적용'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* SMBC 붙여넣기 모달 */}
      {showSmbcPasteDialog && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowSmbcPasteDialog(false)
            }
          }}
        >
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="inline-block px-3 py-1 rounded text-sm font-medium bg-blue-100 text-blue-800">
                  SMBC
                </span>
                {language === 'ja' ? '銀行明細を貼り付け' : '은행 내역 붙여넣기'}
              </CardTitle>
              <p className="text-sm text-gray-600 mt-2">
                {language === 'ja' 
                  ? 'SMBC銀行のウェブサイトから明細をコピーして、下のボックスに貼り付けてください。'
                  : 'SMBC 은행 웹사이트에서 내역을 복사한 후 아래 박스에 붙여넣으세요.'}
              </p>
              <div className="bg-gray-50 p-3 rounded mt-2 text-xs">
                <div className="font-medium mb-1">{language === 'ja' ? '例' : '예시'}:</div>
                <pre className="text-gray-600 whitespace-pre-wrap">
                  入金{'\n'}
                  振込{'\n'}
                  2026/1/30{'\n'}
                  2026/1/30{'\n'}
                  ｶ)ｼｴﾙ{'\n'}
                  99,000{'\n'}
                  円{'\n'}
                  0{'\n'}
                  円{'\n'}
                  30000002
                </pre>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <textarea
                    value={smbcPasteText}
                    onChange={(e) => setSmbcPasteText(e.target.value)}
                    placeholder={language === 'ja' ? 'ここに貼り付けてください...' : '여기에 붙여넣으세요...'}
                    className="w-full border rounded px-3 py-2 h-64 font-mono text-sm"
                    disabled={uploadingSmbc}
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowSmbcPasteDialog(false)
                      setSmbcPasteText('')
                    }}
                    disabled={uploadingSmbc}
                  >
                    {language === 'ja' ? 'キャンセル' : '취소'}
                  </Button>
                  <Button 
                    onClick={handleSmbcPasteUpload}
                    disabled={uploadingSmbc || !smbcPasteText.trim()}
                  >
                    {uploadingSmbc 
                      ? (language === 'ja' ? 'アップロード中...' : '업로드 중...') 
                      : (language === 'ja' ? 'アップロード' : '업로드')}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 자동 매칭 설정 팝업 */}
      {showAutoMatchDialog && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAutoMatchDialog(false)
              setEditingRule(null)
            }
          }}
        >
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-auto">
            <CardHeader>
              <CardTitle>{language === 'ja' ? '自動マッチング設定' : '자동 매칭 설정'}</CardTitle>
              <p className="text-sm text-gray-600 mt-2">
                {language === 'ja' 
                  ? 'CSV アップロード時に、項目名にキーワードが含まれていれば自動的にカテゴリと担当者を設定します。'
                  : 'CSV 업로드 시 항목명에 키워드가 포함되어 있으면 자동으로 카테고리와 담당자를 설정합니다.'}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 규칙 추가/수정 폼 */}
              <form onSubmit={handleSaveAutoMatchRule} className="border rounded p-4 space-y-3 bg-gray-50">
                <h3 className="font-semibold">{editingRule ? (language === 'ja' ? '規則を修正' : '규칙 수정') : (language === 'ja' ? '新規規則追加' : '신규 규칙 추가')}</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {language === 'ja' ? 'キーワード' : '키워드'} <span className="text-red-500">*</span>
                    </label>
                    <Input
                      name="keyword"
                      required
                      placeholder={language === 'ja' ? '例: face, PayPay' : '예: face, PayPay'}
                      defaultValue={editingRule?.keyword || ''}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {language === 'ja' ? 'カテゴリ' : '카테고리'}
                    </label>
                    <select name="category" className="w-full border rounded px-3 py-2" defaultValue={editingRule?.category || ''}>
                      <option value="">{language === 'ja' ? '指定なし' : '지정 없음'}</option>
                      {CATEGORY_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>
                          {language === 'ja' ? opt.labelJa : opt.labelKo}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {language === 'ja' ? '担当者' : '담당자'}
                    </label>
                    <select name="assignedUserId" className="w-full border rounded px-3 py-2" defaultValue={editingRule?.assigned_user_id || ''}>
                      <option value="">{language === 'ja' ? '指定なし' : '지정 없음'}</option>
                      {nameOptions.map(user => (
                        <option key={user.id} value={user.id}>{user.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {language === 'ja' ? '決済手段' : '결제수단'}
                    </label>
                    <select name="paymentMethod" className="w-full border rounded px-3 py-2" defaultValue={editingRule?.payment_method || ''}>
                      <option value="">{language === 'ja' ? '指定なし' : '지정 없음'}</option>
                      <option value="계좌이체">{language === 'ja' ? '口座振替' : '계좌이체'}</option>
                      <option value="PayPay">PayPay</option>
                      <option value="페이팔">{language === 'ja' ? 'ペイパル' : '페이팔'}</option>
                      <option value="카드">{language === 'ja' ? 'カード' : '카드'}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {language === 'ja' ? '優先順位' : '우선순위'}
                    </label>
                    <Input
                      type="number"
                      name="priority"
                      defaultValue={editingRule?.priority || 0}
                      placeholder="0"
                    />
                    <p className="text-xs text-gray-500 mt-1">{language === 'ja' ? '数字が大きいほど優先' : '숫자가 클수록 우선'}</p>
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  {editingRule && (
                    <Button type="button" variant="outline" onClick={() => setEditingRule(null)}>
                      {language === 'ja' ? 'キャンセル' : '취소'}
                    </Button>
                  )}
                  <Button type="submit">
                    {editingRule ? (language === 'ja' ? '修正を保存' : '수정 저장') : (language === 'ja' ? '追加' : '추가')}
                  </Button>
                </div>
              </form>

              {/* 규칙 목록 */}
              <div>
                <h3 className="font-semibold mb-2">{language === 'ja' ? '登録されている規則' : '등록된 규칙'}</h3>
                <div className="border rounded overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-3 py-2 text-left">{language === 'ja' ? 'キーワード' : '키워드'}</th>
                        <th className="px-3 py-2 text-left">{language === 'ja' ? 'カテゴリ' : '카테고리'}</th>
                        <th className="px-3 py-2 text-left">{language === 'ja' ? '担当者' : '담당자'}</th>
                        <th className="px-3 py-2 text-left">{language === 'ja' ? '決済' : '결제'}</th>
                        <th className="px-3 py-2 text-center">{language === 'ja' ? '優先' : '우선'}</th>
                        <th className="px-3 py-2 text-center">{language === 'ja' ? '操作' : '조작'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {autoMatchRules.map(rule => (
                        <tr key={rule.id} className="border-t">
                          <td className="px-3 py-2 font-mono text-blue-600">{rule.keyword}</td>
                          <td className="px-3 py-2">{rule.category || '-'}</td>
                          <td className="px-3 py-2">{rule.assigned_user_name || '-'}</td>
                          <td className="px-3 py-2">{rule.payment_method || '-'}</td>
                          <td className="px-3 py-2 text-center">{rule.priority}</td>
                          <td className="px-3 py-2 text-center">
                            <div className="flex gap-1 justify-center">
                              <Button size="sm" variant="outline" onClick={() => setEditingRule(rule)}>
                                {language === 'ja' ? '修正' : '수정'}
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleDeleteAutoMatchRule(rule.id)}>
                                <Trash2 className="h-3 w-3 text-red-600" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {autoMatchRules.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-3 py-4 text-center text-gray-500">
                            {language === 'ja' ? '登録されている規則がありません' : '등록된 규칙이 없습니다'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end">
                <Button variant="outline" onClick={() => {
                  setShowAutoMatchDialog(false)
                  setEditingRule(null)
                }}>
                  {language === 'ja' ? '閉じる' : '닫기'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

export default TransactionsTab

