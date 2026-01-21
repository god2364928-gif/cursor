import React, { useState, useEffect, useCallback } from 'react'
import { Plus, Upload, Pencil, Trash2, FileText } from 'lucide-react'
import api from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatCurrency } from './utils'
import { DatePickerInput } from '@/components/ui/date-picker-input'

interface PayPayTabProps {
  language: 'ja' | 'ko'
  isAdmin: boolean
}

const getPreviousMonthDates = () => {
  const now = new Date()
  now.setMonth(now.getMonth() - 1)
  const year = now.getFullYear()
  const month = now.getMonth()
  const firstDay = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const lastDay = new Date(year, month + 1, 0)
  const lastDayString = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`
  return { start: firstDay, end: lastDayString }
}

const PayPayTab: React.FC<PayPayTabProps> = ({ language, isAdmin }) => {
  const [paypaySummary, setPaypaySummary] = useState<{ totalSales: number; totalExpenses: number; balance: number }>({ 
    totalSales: 0, 
    totalExpenses: 0, 
    balance: 0 
  })
  const [paypaySales, setPaypaySales] = useState<any[]>([])
  const [paypayExpenses, setPaypayExpenses] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  
  const paypayPrevMonthDates = getPreviousMonthDates()
  const [paypayStartDate, setPaypayStartDate] = useState(paypayPrevMonthDates.start)
  const [paypayEndDate, setPaypayEndDate] = useState(paypayPrevMonthDates.end)
  const [paypayCategoryFilter, setPaypayCategoryFilter] = useState('all')
  const [paypayNameFilter, setPaypayNameFilter] = useState('')
  const [paypayActiveTab, setPaypayActiveTab] = useState<'sales' | 'expenses'>('sales')
  
  const [showPaypaySaleForm, setShowPaypaySaleForm] = useState(false)
  const [showPaypayExpenseForm, setShowPaypayExpenseForm] = useState(false)
  const [editingPaypayExpense, setEditingPaypayExpense] = useState<any | null>(null)
  const [showPaypayUploadDialog, setShowPaypayUploadDialog] = useState(false)
  const [paypayUploadPreview, setPaypayUploadPreview] = useState<any[]>([])

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        await Promise.all([
          fetchPaypaySummary(),
          fetchPaypaySales(),
          fetchPaypayExpenses()
        ])
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [paypayStartDate, paypayEndDate, paypayCategoryFilter, paypayNameFilter])

  const fetchPaypaySummary = useCallback(async () => {
    try {
      const response = await api.get('/paypay/summary')
      setPaypaySummary(response.data)
    } catch (error) {
      console.error('PayPay summary fetch error:', error)
    }
  }, [])

  const fetchPaypaySales = useCallback(async () => {
    try {
      let categoryParam = undefined
      if (paypayCategoryFilter !== 'all') {
        categoryParam = paypayCategoryFilter
      }
      
      const response = await api.get('/paypay/sales', {
        params: {
          startDate: paypayStartDate,
          endDate: paypayEndDate,
          category: categoryParam,
          name: paypayNameFilter || undefined
        }
      })
      setPaypaySales(response.data)
    } catch (error) {
      console.error('PayPay sales fetch error:', error)
    }
  }, [paypayStartDate, paypayEndDate, paypayCategoryFilter, paypayNameFilter])

  const fetchPaypayExpenses = useCallback(async () => {
    try {
      const response = await api.get('/paypay/expenses', {
        params: { startDate: paypayStartDate, endDate: paypayEndDate }
      })
      setPaypayExpenses(response.data)
    } catch (error) {
      console.error('PayPay expenses fetch error:', error)
    }
  }, [paypayStartDate, paypayEndDate, paypayCategoryFilter, paypayNameFilter])

  const handlePaypayPreviousMonth = () => {
    // 현재 선택된 시작일 기준으로 이전 월 계산
    const [year, month] = paypayStartDate.split('-').map(Number)
    const prevMonth = month === 1 ? 12 : month - 1
    const prevYear = month === 1 ? year - 1 : year
    
    const firstDay = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`
    const lastDay = new Date(prevYear, prevMonth, 0).getDate()
    const lastDayString = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    setPaypayStartDate(firstDay)
    setPaypayEndDate(lastDayString)
  }

  const handlePaypayCurrentMonth = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    const firstDay = `${year}-${String(month + 1).padStart(2, '0')}-01`
    const lastDay = new Date(year, month + 1, 0).getDate()
    const lastDayString = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    setPaypayStartDate(firstDay)
    setPaypayEndDate(lastDayString)
  }

  const handlePaypayNextMonth = () => {
    // 현재 선택된 시작일 기준으로 다음 월 계산
    const [year, month] = paypayStartDate.split('-').map(Number)
    const nextMonth = month === 12 ? 1 : month + 1
    const nextYear = month === 12 ? year + 1 : year
    
    const firstDay = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`
    const lastDay = new Date(nextYear, nextMonth, 0).getDate()
    const lastDayString = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    setPaypayStartDate(firstDay)
    setPaypayEndDate(lastDayString)
  }

  const handlePaypayCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      const lines = text.split('\n').filter(line => line.trim())
      const dataLines = lines.slice(1)
      
      const parsedData = dataLines.map(line => {
        const values = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g)?.map(v => v.replace(/^"|"$/g, '').trim()) || []
        if (values.length < 15) return null
        
        const dateStr = values[12] || ''
        const applicantName = values[2] || ''
        const amountStr = values[11]?.replace(/,/g, '') || '0'
        const amount = parseFloat(amountStr)
        
        return {
          date: dateStr,
          category: applicantName,
          user_id: values[1] || '',
          name: values[6] || '',
          receipt_number: '',
          amount: amount
        }
      }).filter(Boolean)
      
      setPaypayUploadPreview(parsedData)
      setShowPaypayUploadDialog(true)
    }
    
    reader.readAsText(file, 'UTF-8')
    e.target.value = ''
  }

  const handlePaypaySaveUpload = async () => {
    try {
      await api.post('/paypay/sales/bulk', { sales: paypayUploadPreview })
      alert(language === 'ja' ? 'アップロードしました' : '업로드되었습니다')
      setShowPaypayUploadDialog(false)
      setPaypayUploadPreview([])
      fetchPaypaySummary()
      fetchPaypaySales()
    } catch (error) {
      console.error('PayPay upload error:', error)
      alert(language === 'ja' ? 'アップロードに失敗しました' : '업로드에 실패했습니다')
    }
  }

  const handleSavePaypaySale = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    try {
      await api.post('/paypay/sales', {
        date: formData.get('date'),
        category: formData.get('category'),
        user_id: formData.get('user_id') || '',
        name: formData.get('name'),
        receipt_number: formData.get('receipt_number') || '',
        amount: Number(formData.get('amount')),
        memo: formData.get('memo') || ''
      })
      setShowPaypaySaleForm(false)
      fetchPaypaySummary()
      fetchPaypaySales()
      alert(language === 'ja' ? '保存しました' : '저장되었습니다')
    } catch (error) {
      console.error('PayPay sale save error:', error)
      alert(language === 'ja' ? '保存に失敗しました' : '저장에 실패했습니다')
    }
  }

  const handlePaypaySaleDelete = async (id: string) => {
    if (!confirm(language === 'ja' ? '削除しますか？' : '삭제하시겠습니까?')) return
    try {
      await api.delete(`/paypay/sales/${id}`)
      fetchPaypaySummary()
      fetchPaypaySales()
    } catch (error) {
      console.error('PayPay sale delete error:', error)
      alert(language === 'ja' ? '削除に失敗しました' : '삭제에 실패했습니다')
    }
  }

  const handlePaypayExpenseSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    try {
      const payload = {
        date: formData.get('date'),
        item: formData.get('item'),
        amount: Number(formData.get('amount')),
        memo: formData.get('memo') || ''
      }
      
      if (editingPaypayExpense) {
        await api.put(`/paypay/expenses/${editingPaypayExpense.id}`, payload)
      } else {
        await api.post('/paypay/expenses', payload)
      }
      
      setShowPaypayExpenseForm(false)
      setEditingPaypayExpense(null)
      fetchPaypaySummary()
      fetchPaypayExpenses()
    } catch (error) {
      console.error('PayPay expense save error:', error)
      alert(language === 'ja' ? '保存に失敗しました' : '저장에 실패했습니다')
    }
  }

  const handlePaypayExpenseDelete = async (id: string) => {
    if (!confirm(language === 'ja' ? '削除しますか？' : '삭제하시겠습니까?')) return
    try {
      await api.delete(`/paypay/expenses/${id}`)
      fetchPaypaySummary()
      fetchPaypayExpenses()
    } catch (error) {
      console.error('PayPay expense delete error:', error)
      alert(language === 'ja' ? '削除に失敗しました' : '삭제에 실패했습니다')
    }
  }

  const handlePaypaySaleMemo = async (sale: any) => {
    const memo = prompt(language === 'ja' ? 'メモを入力してください' : '메모를 입력하세요', sale.memo || '')
    if (memo === null) return
    try {
      await api.put(`/paypay/sales/${sale.id}`, { memo })
      fetchPaypaySales()
      alert(language === 'ja' ? '保存しました' : '저장되었습니다')
    } catch (error) {
      console.error('PayPay sale memo update error:', error)
      alert(language === 'ja' ? '保存に失敗しました' : '저장에 실패했습니다')
    }
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-600">{language === 'ja' ? '売上合計' : '매출 합계'}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(paypaySummary.totalSales)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-600">{language === 'ja' ? '支出合計' : '지출 합계'}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(paypaySummary.totalExpenses)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-600">{language === 'ja' ? '残高' : '잔액'}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-600">{formatCurrency(paypaySummary.balance)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-3 items-end">
            <div className="flex-1 grid grid-cols-5 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">{language === 'ja' ? '開始日' : '시작일'}</label>
                <DatePickerInput value={paypayStartDate} onChange={setPaypayStartDate} className="h-9" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{language === 'ja' ? '終了日' : '종료일'}</label>
                <DatePickerInput value={paypayEndDate} onChange={setPaypayEndDate} className="h-9" />
              </div>
              <div className="flex items-end gap-2">
                <Button size="sm" variant="outline" onClick={handlePaypayPreviousMonth} className="h-9">
                  {language === 'ja' ? '前月' : '전월'}
                </Button>
                <Button size="sm" variant="outline" onClick={handlePaypayCurrentMonth} className="h-9">
                  {language === 'ja' ? '当月' : '당월'}
                </Button>
                <Button size="sm" variant="outline" onClick={handlePaypayNextMonth} className="h-9">
                  {language === 'ja' ? '来月' : '내월'}
                </Button>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{language === 'ja' ? 'カテゴリ' : '카테고리'}</label>
                <select className="w-full border rounded-md px-2 py-1.5 text-sm h-9" value={paypayCategoryFilter} 
                        onChange={(e) => setPaypayCategoryFilter(e.target.value)}>
                  <option value="all">{language === 'ja' ? '全て' : '전체'}</option>
                  <option value="셀마플">{language === 'ja' ? 'セルマプル' : '셀마플'}</option>
                  <option value="JEYI">JEYI</option>
                  <option value="石井ひとみ">石井ひとみ</option>
                  <option value="山下南">山下南</option>
                  <option value="山﨑水優">山﨑水優</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{language === 'ja' ? '名前' : '이름'}</label>
                <Input placeholder={language === 'ja' ? '名前で検索' : '이름으로 검색'} value={paypayNameFilter} 
                       onChange={(e) => setPaypayNameFilter(e.target.value)} className="h-9" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex gap-2">
        <Button variant={paypayActiveTab === 'sales' ? 'default' : 'outline'} onClick={() => setPaypayActiveTab('sales')}>
          {language === 'ja' ? '売上' : '매출'}
        </Button>
        <Button variant={paypayActiveTab === 'expenses' ? 'default' : 'outline'} onClick={() => setPaypayActiveTab('expenses')}>
          {language === 'ja' ? '支出' : '지출'}
        </Button>
      </div>

      {/* Sales Tab */}
      {paypayActiveTab === 'sales' && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>{language === 'ja' ? 'PayPay 売上' : 'PayPay 매출'}</CardTitle>
              <div className="flex gap-2">
                <label className="cursor-pointer">
                  <Button size="sm" variant="outline" asChild>
                    <span><Upload className="h-4 w-4 mr-1" />{language === 'ja' ? 'CSV' : 'CSV'}</span>
                  </Button>
                  <input type="file" accept=".csv" className="hidden" onChange={handlePaypayCSVUpload} />
                </label>
                <Button size="sm" onClick={() => setShowPaypaySaleForm(true)}>
                  <Plus className="h-4 w-4 mr-1" />{language === 'ja' ? '追加' : '추가'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left">{language === 'ja' ? '日付' : '날짜'}</th>
                    <th className="px-4 py-3 text-left">{language === 'ja' ? 'カテゴリ' : '카테고리'}</th>
                    <th className="px-4 py-3 text-left">{language === 'ja' ? 'ユーザーID' : '사용자 ID'}</th>
                    <th className="px-4 py-3 text-left">{language === 'ja' ? '名前' : '이름'}</th>
                    <th className="px-4 py-3 text-right">{language === 'ja' ? '金額' : '금액'}</th>
                    <th className="px-4 py-3 text-center">{language === 'ja' ? '操作' : '조작'}</th>
                  </tr>
                </thead>
                <tbody>
                  {paypaySales.map((sale) => (
                    <tr key={sale.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3">{sale.date}</td>
                      <td className="px-4 py-3">{sale.category}</td>
                      <td className="px-4 py-3">{sale.user_id}</td>
                      <td className="px-4 py-3">{sale.name}</td>
                      <td className="px-4 py-3 text-right font-medium">{formatCurrency(sale.amount)}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex gap-1 justify-center">
                          <Button size="icon" variant="ghost" onClick={() => handlePaypaySaleMemo(sale)}>
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => handlePaypaySaleDelete(sale.id)}>
                            <Trash2 className="h-4 w-4 text-red-600" />
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

      {/* Expenses Tab */}
      {paypayActiveTab === 'expenses' && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>{language === 'ja' ? 'PayPay 支出' : 'PayPay 지출'}</CardTitle>
              <Button size="sm" onClick={() => { setShowPaypayExpenseForm(true); setEditingPaypayExpense(null); }}>
                <Plus className="h-4 w-4 mr-1" />{language === 'ja' ? '追加' : '추가'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {showPaypayExpenseForm && (
              <Card className="mb-4 border-blue-200 bg-blue-50">
                <CardContent className="p-4">
                  <form onSubmit={handlePaypayExpenseSubmit} className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">{language === 'ja' ? '日付' : '날짜'}</label>
                      <Input type="date" name="date" required defaultValue={editingPaypayExpense?.date || ''} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">{language === 'ja' ? '項目' : '항목'}</label>
                      <Input type="text" name="item" required defaultValue={editingPaypayExpense?.item || ''} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">{language === 'ja' ? '金額' : '금액'}</label>
                      <Input type="number" name="amount" required defaultValue={editingPaypayExpense?.amount || ''} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">{language === 'ja' ? 'メモ' : '메모'}</label>
                      <Input type="text" name="memo" defaultValue={editingPaypayExpense?.memo || ''} />
                    </div>
                    <div className="col-span-2 flex gap-2">
                      <Button type="submit">{language === 'ja' ? '保存' : '저장'}</Button>
                      <Button type="button" variant="ghost" onClick={() => { setShowPaypayExpenseForm(false); setEditingPaypayExpense(null); }}>
                        {language === 'ja' ? 'キャンセル' : '취소'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left">{language === 'ja' ? '日付' : '날짜'}</th>
                    <th className="px-4 py-3 text-left">{language === 'ja' ? '項目' : '항목'}</th>
                    <th className="px-4 py-3 text-right">{language === 'ja' ? '金額' : '금액'}</th>
                    <th className="px-4 py-3 text-left">{language === 'ja' ? 'メモ' : '메모'}</th>
                    <th className="px-4 py-3 text-center">{language === 'ja' ? '操作' : '조작'}</th>
                  </tr>
                </thead>
                <tbody>
                  {paypayExpenses.map((expense) => (
                    <tr key={expense.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3">{expense.date}</td>
                      <td className="px-4 py-3">{expense.item}</td>
                      <td className="px-4 py-3 text-right font-medium">{formatCurrency(expense.amount)}</td>
                      <td className="px-4 py-3 text-gray-600">{expense.memo || '-'}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex gap-1 justify-center">
                          <Button size="icon" variant="ghost" onClick={() => { setEditingPaypayExpense(expense); setShowPaypayExpenseForm(true); }}>
                            <Pencil className="h-4 w-4 text-emerald-600" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => handlePaypayExpenseDelete(expense.id)}>
                            <Trash2 className="h-4 w-4 text-red-600" />
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

      {/* CSV Upload Dialog */}
      {showPaypayUploadDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-auto">
            <h3 className="text-lg font-bold mb-4">{language === 'ja' ? 'CSVアップロード プレビュー' : 'CSV 업로드 미리보기'}</h3>
            <div className="mb-4 max-h-96 overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-2 py-2 text-left">{language === 'ja' ? '日付' : '날짜'}</th>
                    <th className="px-2 py-2 text-left">{language === 'ja' ? 'カテゴリ' : '카테고리'}</th>
                    <th className="px-2 py-2 text-left">{language === 'ja' ? 'ユーザーID' : '사용자 ID'}</th>
                    <th className="px-2 py-2 text-left">{language === 'ja' ? '名前' : '이름'}</th>
                    <th className="px-2 py-2 text-right">{language === 'ja' ? '金額' : '금액'}</th>
                  </tr>
                </thead>
                <tbody>
                  {paypayUploadPreview.map((row, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="px-2 py-2">{row.date}</td>
                      <td className="px-2 py-2">{row.category}</td>
                      <td className="px-2 py-2">{row.user_id}</td>
                      <td className="px-2 py-2">{row.name}</td>
                      <td className="px-2 py-2 text-right">{formatCurrency(row.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setShowPaypayUploadDialog(false); setPaypayUploadPreview([]); }}>
                {language === 'ja' ? 'キャンセル' : '취소'}
              </Button>
              <Button onClick={handlePaypaySaveUpload}>
                {language === 'ja' ? 'アップロード' : '업로드'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Sale Form Dialog */}
      {showPaypaySaleForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">{language === 'ja' ? '売上追加' : '매출 추가'}</h3>
            <form onSubmit={handleSavePaypaySale} className="grid gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">{language === 'ja' ? '日付' : '날짜'}</label>
                <Input type="date" name="date" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{language === 'ja' ? 'カテゴリ' : '카테고리'}</label>
                <Input type="text" name="category" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{language === 'ja' ? 'ユーザーID' : '사용자 ID'}</label>
                <Input type="text" name="user_id" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{language === 'ja' ? '名前' : '이름'}</label>
                <Input type="text" name="name" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{language === 'ja' ? '金額' : '금액'}</label>
                <Input type="number" name="amount" required />
              </div>
              <div className="flex gap-2">
                <Button type="submit">{language === 'ja' ? '保存' : '저장'}</Button>
                <Button type="button" variant="ghost" onClick={() => setShowPaypaySaleForm(false)}>
                  {language === 'ja' ? 'キャンセル' : '취소'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default PayPayTab

