import React, { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import api from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatCurrency } from './utils'
import { RecurringExpense } from './types'

interface RecurringTabProps {
  language: 'ja' | 'ko'
  isAdmin: boolean
}

const RecurringTab: React.FC<RecurringTabProps> = ({ language, isAdmin }) => {
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([])
  const [showRecurringForm, setShowRecurringForm] = useState(false)
  const [editingRecurring, setEditingRecurring] = useState<RecurringExpense | null>(null)

  useEffect(() => {
    fetchRecurringExpenses()
  }, [])

  const fetchRecurringExpenses = async () => {
    try {
      const response = await api.get('/accounting/recurring-expenses')
      setRecurringExpenses(response.data)
    } catch (error) {
      console.error('Recurring expenses fetch error:', error)
    }
  }

  const openRecurringForm = (exp?: RecurringExpense) => {
    if (exp) {
      setEditingRecurring(exp)
    } else {
      setEditingRecurring(null)
    }
    setShowRecurringForm(true)
  }

  const closeRecurringForm = () => {
    setShowRecurringForm(false)
    setEditingRecurring(null)
  }

  const handleSubmitRecurring = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    try {
      const payload = {
        itemName: formData.get('itemName'),
        monthlyAmount: Number(formData.get('monthlyAmount')),
        paymentDay: Number(formData.get('paymentDay')),
        paymentMethod: formData.get('paymentMethod'),
        isActive: true,
      }

      if (editingRecurring) {
        await api.put(`/accounting/recurring-expenses/${editingRecurring.id}`, payload)
      } else {
        await api.post('/accounting/recurring-expenses', payload)
      }

      closeRecurringForm()
      fetchRecurringExpenses()
    } catch (error) {
      console.error('Recurring create error:', error)
      alert(language === 'ja' ? '追加に失敗しました' : '추가에 실패했습니다')
    }
  }

  const handleDeleteRecurring = async (id: string) => {
    if (!confirm(language === 'ja' ? '削除しますか？' : '삭제하시겠습니까?')) return
    try {
      await api.delete(`/accounting/recurring-expenses/${id}`)
      if (editingRecurring?.id === id) {
        closeRecurringForm()
      }
      fetchRecurringExpenses()
    } catch (error) {
      console.error('Recurring delete error:', error)
      alert(language === 'ja' ? '削除に失敗しました' : '삭제에 실패했습니다')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end items-center">
        <Button
          onClick={() => {
            if (showRecurringForm && !editingRecurring) {
              closeRecurringForm()
            } else {
              openRecurringForm()
            }
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          {language === 'ja' ? '追加' : '추가'}
        </Button>
      </div>

      {showRecurringForm && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">
              {editingRecurring
                ? language === 'ja'
                  ? '定期支出を修正'
                  : '정기지출 수정'
                : language === 'ja'
                ? '定期支出を追加'
                : '정기지출 추가'}
            </h3>
            <form
              key={editingRecurring?.id || 'new-recurring'}
              onSubmit={handleSubmitRecurring}
              className="grid grid-cols-2 gap-4"
            >
              <div>
                <label className="block text-sm font-medium mb-1">{language === 'ja' ? '項目名' : '항목명'}</label>
                <Input type="text" name="itemName" required defaultValue={editingRecurring?.itemName || ''} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{language === 'ja' ? '月額' : '월액'}</label>
                <Input
                  type="number"
                  name="monthlyAmount"
                  required
                  defaultValue={editingRecurring ? String(editingRecurring.monthlyAmount) : ''}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{language === 'ja' ? '支払日' : '지급일'}</label>
                <Input
                  type="number"
                  name="paymentDay"
                  min="1"
                  max="31"
                  required
                  defaultValue={editingRecurring ? String(editingRecurring.paymentDay) : ''}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{language === 'ja' ? '決済手段' : '결제수단'}</label>
                <select
                  name="paymentMethod"
                  className="w-full border rounded px-3 py-2"
                  required
                  defaultValue={editingRecurring?.paymentMethod || '계좌'}
                >
                  <option value="계좌">{language === 'ja' ? '口座' : '계좌'}</option>
                  <option value="PayPay">PayPay</option>
                  <option value="카드">{language === 'ja' ? 'カード' : '카드'}</option>
                </select>
              </div>
              <div className="col-span-2 flex gap-2">
                <Button type="submit">
                  {editingRecurring
                    ? language === 'ja'
                      ? '修正を保存'
                      : '수정 저장'
                    : language === 'ja'
                    ? '保存'
                    : '저장'}
                </Button>
                <Button type="button" variant="ghost" onClick={closeRecurringForm}>
                  {language === 'ja' ? 'キャンセル' : '취소'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="border rounded-lg overflow-hidden bg-white">
        <table className="w-full table-fixed">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-1/6">
                {language === 'ja' ? '支払日' : '지급일'}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-1/4">
                {language === 'ja' ? '項目名' : '항목명'}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-1/6">
                {language === 'ja' ? '月額' : '월액'}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-1/6">
                {language === 'ja' ? '決済手段' : '결제수단'}
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase w-1/6">
                {language === 'ja' ? '作業' : '작업'}
              </th>
            </tr>
          </thead>
          <tbody>
            {recurringExpenses.map((exp) => (
              <tr key={exp.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3 text-sm truncate overflow-hidden">
                  {exp.paymentDay}{language === 'ja' ? '日' : '일'}
                </td>
                <td className="px-4 py-3 text-sm truncate overflow-hidden">{exp.itemName}</td>
                <td className="px-4 py-3 text-sm truncate overflow-hidden">{formatCurrency(exp.monthlyAmount)}</td>
                <td className="px-4 py-3 text-sm truncate overflow-hidden">{exp.paymentMethod}</td>
                <td className="px-4 py-3 text-center">
                  <div className="flex gap-1 justify-center">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => openRecurringForm(exp)}
                      aria-label={language === 'ja' ? '修正' : '수정'}
                    >
                      <Pencil className="h-4 w-4 text-emerald-600" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDeleteRecurring(exp.id)}
                      aria-label={language === 'ja' ? '削除' : '삭제'}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            <tr className="border-t bg-gray-50 font-bold">
              <td className="px-4 py-3 text-sm" colSpan={2}>
                {language === 'ja' ? '合計' : '합계'}
              </td>
              <td className="px-4 py-3 text-sm">
                {formatCurrency(recurringExpenses.reduce((sum, exp) => sum + exp.monthlyAmount, 0))}
              </td>
              <td className="px-4 py-3" colSpan={2}></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default RecurringTab

