import React, { useState, useEffect, useMemo } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import api from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatCurrency } from './utils'
import { CapitalBalance, Deposit } from './types'

interface CapitalTabProps {
  language: 'ja' | 'ko'
  isAdmin: boolean
}

const CapitalTab: React.FC<CapitalTabProps> = ({ language, isAdmin }) => {
  // State
  const [capitalBalances, setCapitalBalances] = useState<CapitalBalance[]>([])
  const [deposits, setDeposits] = useState<Deposit[]>([])
  const [capitalOffset, setCapitalOffset] = useState(0)
  const [capitalTotal, setCapitalTotal] = useState(0)
  
  const [showCapitalForm, setShowCapitalForm] = useState(false)
  const [showDepositForm, setShowDepositForm] = useState(false)
  const [editingCapital, setEditingCapital] = useState<CapitalBalance | null>(null)
  const [editingDeposit, setEditingDeposit] = useState<Deposit | null>(null)

  // 보증금 합계 계산 (메모이제이션)
  const totalDeposits = useMemo(() => {
    return deposits.reduce((sum, d) => sum + Number(d.amount || 0), 0)
  }, [deposits])

  // Data fetching
  useEffect(() => {
    fetchCapitalBalances()
  }, [capitalOffset])

  useEffect(() => {
    fetchDeposits()
  }, [])

  const fetchCapitalBalances = async () => {
    try {
      const response = await api.get('/accounting/capital-balance', {
        params: { limit: 12, offset: capitalOffset }
      })
      setCapitalBalances(response.data.data)
      setCapitalTotal(response.data.total)
    } catch (error) {
      console.error('Capital balances fetch error:', error)
    }
  }

  const fetchDeposits = async () => {
    try {
      const response = await api.get('/accounting/deposits')
      setDeposits(response.data)
    } catch (error) {
      console.error('Deposits fetch error:', error)
    }
  }

  // Capital form handlers
  const openCapitalForm = (capital?: CapitalBalance) => {
    setEditingCapital(capital || null)
    setShowCapitalForm(true)
  }

  const closeCapitalForm = () => {
    setEditingCapital(null)
    setShowCapitalForm(false)
  }

  const handleSubmitCapital = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    try {
      const payload = {
        balanceDate: formData.get('balanceDate'),
        amount: Number(formData.get('amount')),
        note: formData.get('note') || null
      }

      if (editingCapital) {
        await api.put(`/accounting/capital-balance/${editingCapital.id}`, payload)
      } else {
        await api.post('/accounting/capital-balance', payload)
      }

      closeCapitalForm()
      fetchCapitalBalances()
    } catch (error: any) {
      console.error('Capital create error:', error)
      alert(error.response?.data?.error || (language === 'ja' ? '処理に失敗しました' : '처리에 실패했습니다'))
    }
  }

  const handleDeleteCapital = async (id: string) => {
    if (!confirm(language === 'ja' ? '削除しますか？' : '삭제하시겠습니까?')) return
    try {
      await api.delete(`/accounting/capital-balance/${id}`)
      if (editingCapital?.id === id) {
        closeCapitalForm()
      }
      fetchCapitalBalances()
    } catch (error) {
      console.error('Capital delete error:', error)
      alert(language === 'ja' ? '削除に失敗しました' : '삭제에 실패했습니다')
    }
  }

  // Deposit form handlers
  const openDepositForm = (deposit?: Deposit) => {
    setEditingDeposit(deposit || null)
    setShowDepositForm(true)
  }

  const closeDepositForm = () => {
    setEditingDeposit(null)
    setShowDepositForm(false)
  }

  const handleSubmitDeposit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    try {
      const payload = {
        itemName: formData.get('itemName'),
        amount: Number(formData.get('amount')),
        note: formData.get('note') || null
      }

      if (editingDeposit) {
        await api.put(`/accounting/deposits/${editingDeposit.id}`, payload)
      } else {
        await api.post('/accounting/deposits', payload)
      }

      closeDepositForm()
      fetchDeposits()
    } catch (error: any) {
      console.error('Deposit create error:', error)
      alert(error.response?.data?.error || (language === 'ja' ? '処理に失敗しました' : '처리에 실패했습니다'))
    }
  }

  const handleDeleteDeposit = async (id: string) => {
    if (!confirm(language === 'ja' ? '削除しますか？' : '삭제하시겠습니까?')) return
    try {
      await api.delete(`/accounting/deposits/${id}`)
      if (editingDeposit?.id === id) {
        closeDepositForm()
      }
      fetchDeposits()
    } catch (error) {
      console.error('Deposit delete error:', error)
      alert(language === 'ja' ? '削除に失敗しました' : '삭제에 실패했습니다')
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Capital Balance Section */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>{language === 'ja' ? '資本金（口座残高）' : '자본금 (계좌 잔액)'}</CardTitle>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => openCapitalForm()}>
                  <Plus className="h-4 w-4 mr-1" />
                  {language === 'ja' ? '追加' : '추가'}
                </Button>
                {capitalOffset > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCapitalOffset(Math.max(0, capitalOffset - 12))}
                  >
                    {language === 'ja' ? '前の12ヶ月' : '이전 12개월'}
                  </Button>
                )}
                {capitalOffset + 12 < capitalTotal && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCapitalOffset(capitalOffset + 12)}
                  >
                    {language === 'ja' ? '次の12ヶ月' : '다음 12개월'}
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {showCapitalForm && (
              <Card className="mb-4 border-blue-200 bg-blue-50">
                <CardContent className="p-4">
                  <h3 className="text-lg font-semibold mb-4">
                    {editingCapital
                      ? (language === 'ja' ? '残高を修正' : '잔액 수정')
                      : (language === 'ja' ? '残高を追加' : '잔액 추가')}
                  </h3>
                  <form onSubmit={handleSubmitCapital} className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        {language === 'ja' ? '日付（毎月1日）' : '날짜 (매월 1일)'}
                      </label>
                      <Input
                        type="date"
                        name="balanceDate"
                        required
                        defaultValue={editingCapital?.balance_date || ''}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        {language === 'ja' ? '残高' : '잔액'}
                      </label>
                      <Input
                        type="number"
                        name="amount"
                        required
                        defaultValue={editingCapital ? String(editingCapital.amount) : ''}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        {language === 'ja' ? 'メモ' : '메모'}
                      </label>
                      <Input
                        type="text"
                        name="note"
                        defaultValue={editingCapital?.note || ''}
                      />
                    </div>
                    <div className="col-span-3 flex gap-2">
                      <Button type="submit">
                        {language === 'ja' ? '保存' : '저장'}
                      </Button>
                      <Button type="button" variant="ghost" onClick={closeCapitalForm}>
                        {language === 'ja' ? 'キャンセル' : '취소'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {language === 'ja' ? '日付' : '날짜'}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      {language === 'ja' ? '残高' : '잔액'}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {language === 'ja' ? 'メモ' : '메모'}
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      {language === 'ja' ? '作業' : '작업'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {capitalBalances.map((balance) => (
                    <tr key={balance.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">
                        {new Date(balance.balance_date).toLocaleDateString('ja-JP', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit'
                        })}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium">
                        {formatCurrency(balance.amount)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 truncate">
                        {balance.note || '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex gap-1 justify-center">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openCapitalForm(balance)}
                            aria-label={language === 'ja' ? '修正' : '수정'}
                          >
                            <Pencil className="h-4 w-4 text-emerald-600" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDeleteCapital(balance.id)}
                            aria-label={language === 'ja' ? '削除' : '삭제'}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 text-sm text-gray-600 text-center">
              {language === 'ja'
                ? `全 ${capitalTotal} 件のうち ${capitalOffset + 1} - ${Math.min(capitalOffset + 12, capitalTotal)} 件を表示中`
                : `전체 ${capitalTotal}건 중 ${capitalOffset + 1} - ${Math.min(capitalOffset + 12, capitalTotal)}건 표시 중`}
            </div>
          </CardContent>
        </Card>

        {/* Deposit Section */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>{language === 'ja' ? '保証金' : '보증금'}</CardTitle>
              <Button size="sm" onClick={() => openDepositForm()}>
                <Plus className="h-4 w-4 mr-1" />
                {language === 'ja' ? '追加' : '추가'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {showDepositForm && (
              <Card className="mb-4 border-blue-200 bg-blue-50">
                <CardContent className="p-4">
                  <h3 className="text-lg font-semibold mb-4">
                    {editingDeposit
                      ? (language === 'ja' ? '保証金を修正' : '보증금 수정')
                      : (language === 'ja' ? '保証金を追加' : '보증금 추가')}
                  </h3>
                  <form onSubmit={handleSubmitDeposit} className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        {language === 'ja' ? '項目' : '항목'}
                      </label>
                      <Input
                        type="text"
                        name="itemName"
                        required
                        defaultValue={editingDeposit?.item_name || ''}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        {language === 'ja' ? '金額' : '금액'}
                      </label>
                      <Input
                        type="number"
                        name="amount"
                        required
                        defaultValue={editingDeposit ? String(editingDeposit.amount) : ''}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        {language === 'ja' ? 'メモ' : '메모'}
                      </label>
                      <Input
                        type="text"
                        name="note"
                        defaultValue={editingDeposit?.note || ''}
                      />
                    </div>
                    <div className="col-span-3 flex gap-2">
                      <Button type="submit">
                        {language === 'ja' ? '保存' : '저장'}
                      </Button>
                      <Button type="button" variant="ghost" onClick={closeDepositForm}>
                        {language === 'ja' ? 'キャンセル' : '취소'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {language === 'ja' ? '項目' : '항목'}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      {language === 'ja' ? '金額' : '금액'}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {language === 'ja' ? 'メモ' : '메모'}
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      {language === 'ja' ? '作業' : '작업'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {deposits.map((deposit) => (
                    <tr key={deposit.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium">{deposit.item_name}</td>
                      <td className="px-4 py-3 text-sm text-right">{formatCurrency(deposit.amount)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 truncate">
                        {deposit.note || '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex gap-1 justify-center">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openDepositForm(deposit)}
                            aria-label={language === 'ja' ? '修正' : '수정'}
                          >
                            <Pencil className="h-4 w-4 text-emerald-600" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDeleteDeposit(deposit.id)}
                            aria-label={language === 'ja' ? '削除' : '삭제'}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t bg-gray-50 font-bold">
                    <td className="px-4 py-3 text-sm">{language === 'ja' ? '合計' : '합계'}</td>
                    <td className="px-4 py-3 text-sm text-right">
                      {formatCurrency(totalDeposits)}
                    </td>
                    <td className="px-4 py-3" colSpan={2}></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default CapitalTab

