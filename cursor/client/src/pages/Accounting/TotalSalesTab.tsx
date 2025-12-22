import React, { useState, useEffect } from 'react'
import api from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency } from './utils'

interface TotalSalesTabProps {
  language: 'ja' | 'ko'
  isAdmin: boolean
}

interface RawDataRow {
  fiscal_year: number
  month: number
  payment_method: string
  amount: string
  is_fee: boolean
}

const TotalSalesTab: React.FC<TotalSalesTabProps> = ({ language, isAdmin }) => {
  const [rawData, setRawData] = useState<RawDataRow[]>([])
  const [totalSalesYear, setTotalSalesYear] = useState<number>(2026)
  const [editingCell, setEditingCell] = useState<{ paymentMethod: string; isFee: boolean; month: number } | null>(null)
  const [editingValue, setEditingValue] = useState<string>('')

  const months = [10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9]

  useEffect(() => {
    fetchTotalSales()
  }, [totalSalesYear])

  const fetchTotalSales = async () => {
    try {
      const response = await api.get(`/total-sales/${totalSalesYear}`)
      setRawData(response.data || [])
    } catch (error) {
      console.error('Total sales fetch error:', error)
    }
  }
  
  // 특정 결제수단 + 수수료여부 + 월에 해당하는 금액 가져오기
  const getAmount = (paymentMethod: string, isFee: boolean, month: number): number => {
    const row = rawData.find(
      r => r.payment_method === paymentMethod && r.is_fee === isFee && r.month === month
    )
    return row ? parseFloat(row.amount) : 0
  }
  
  // 결제수단별 합계 (모든 월)
  const getRowTotal = (paymentMethod: string, isFee: boolean): number => {
    return months.reduce((sum, month) => sum + getAmount(paymentMethod, isFee, month), 0)
  }
  
  // 월별 합계 (모든 결제수단)
  const getMonthTotal = (month: number): number => {
    return rawData
      .filter(r => r.month === month)
      .reduce((sum, r) => {
        const amount = parseFloat(r.amount) || 0
        return sum + (r.is_fee ? -amount : amount)
      }, 0)
  }
  
  // 전체 합계
  const getGrandTotal = (): number => {
    return rawData.reduce((sum, r) => {
      const amount = parseFloat(r.amount) || 0
      return sum + (r.is_fee ? -amount : amount)
    }, 0)
  }

  const handleCellClick = (paymentMethod: string, isFee: boolean, month: number, currentValue: number) => {
    setEditingCell({ paymentMethod, isFee, month })
    setEditingValue(String(currentValue || 0))
  }

  const handleCellSave = async () => {
    if (!editingCell) return

    try {
      await api.put(`/total-sales/update`, {
        fiscalYear: totalSalesYear,
        month: editingCell.month,
        paymentMethod: editingCell.paymentMethod,
        isFee: editingCell.isFee,
        amount: parseFloat(editingValue) || 0
      })
      setEditingCell(null)
      setEditingValue('')
      fetchTotalSales()
    } catch (error) {
      console.error('Total sales update error:', error)
      alert(language === 'ja' ? '更新に失敗しました' : '업데이트에 실패했습니다')
    }
  }

  const handleCellCancel = () => {
    setEditingCell(null)
    setEditingValue('')
  }

  const renderEditableCell = (paymentMethod: string, isFee: boolean, month: number, className: string = '') => {
    const value = getAmount(paymentMethod, isFee, month)
    const isEditing = editingCell?.paymentMethod === paymentMethod && 
                     editingCell?.isFee === isFee && 
                     editingCell?.month === month

    return (
      <td
        key={`${paymentMethod}-${isFee}-${month}`}
        className={`px-2 py-2 text-right cursor-pointer hover:bg-blue-50 text-xs ${className}`}
        onClick={() => handleCellClick(paymentMethod, isFee, month, value)}
      >
        {isEditing ? (
          <input
            type="number"
            step="1"
            value={editingValue}
            onChange={(e) => setEditingValue(e.target.value)}
            onFocus={(e) => e.target.select()}
            onBlur={handleCellSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCellSave()
              if (e.key === 'Escape') handleCellCancel()
              if (e.key === '.' || e.key === ',') e.preventDefault()
            }}
            autoFocus
            className="w-full text-right border rounded px-1 text-xs"
          />
        ) : (
          formatCurrency(value)
        )}
      </td>
    )
  }
  
  const renderPaymentRow = (label: string, paymentMethod: string, isFee: boolean, bgColor: string = '') => (
    <tr key={`${paymentMethod}-${isFee}`} className={`border-t ${bgColor}`}>
      <td className="px-4 py-2 font-medium text-sm">{label}</td>
      {months.map(month => renderEditableCell(paymentMethod, isFee, month))}
      <td className="px-4 py-2 text-right font-semibold text-sm bg-gray-100">
        {formatCurrency(getRowTotal(paymentMethod, isFee))}
      </td>
    </tr>
  )

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>{language === 'ja' ? '全体売上管理' : '전체매출'}</CardTitle>
            <div className="flex gap-2 items-center">
              <label className="text-sm font-medium">{language === 'ja' ? '年度' : '연도'}:</label>
              <select
                className="border rounded px-3 py-2"
                value={totalSalesYear}
                onChange={(e) => setTotalSalesYear(Number(e.target.value))}
              >
                {[2023, 2024, 2025, 2026, 2027, 2028].map((year) => (
                  <option key={year} value={year}>
                    {year}{language === 'ja' ? '年度 (令和' : '년도 ('}
                    {year === 2023 ? '5' : year === 2024 ? '6' : year === 2025 ? '7' : year === 2026 ? '8' : year === 2027 ? '9' : '10'}
                    {language === 'ja' ? '年)' : '호평)'}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left border">{language === 'ja' ? '項目' : '항목'}</th>
                  {months.map(month => (
                    <th key={month} className="px-2 py-2 text-center border">
                      {month}
                    </th>
                  ))}
                  <th className="px-4 py-2 text-center border font-bold">{language === 'ja' ? '合計' : '합계'}</th>
                </tr>
              </thead>
              <tbody>
                {renderPaymentRow(language === 'ja' ? '口座振込' : '계좌이체', '口座振込', false, 'bg-blue-50')}
                {renderPaymentRow('PayPay', 'PayPay', false, 'bg-green-50')}
                {renderPaymentRow('PayPal', 'PayPal', false, 'bg-purple-50')}
                {renderPaymentRow(language === 'ja' ? 'PayPal 手数料' : 'PayPal 수수료', 'PayPal', true)}
                {renderPaymentRow('strip', 'strip', false, 'bg-yellow-50')}
                {renderPaymentRow(language === 'ja' ? 'strip 手数料' : 'strip 수수료', 'strip', true)}
                {renderPaymentRow('strip1', 'strip1', false, 'bg-orange-50')}
                {renderPaymentRow(language === 'ja' ? 'strip1 手数料' : 'strip1 수수료', 'strip1', true)}
                {renderPaymentRow(language === 'ja' ? 'ココナラ' : '코코나라', 'ココナラ', false, 'bg-pink-50')}
                
                {/* 매출 합계 행 */}
                <tr className="border-t-2 bg-red-100 font-bold">
                  <td className="px-4 py-2 text-sm">{language === 'ja' ? '売上' : '매출'}</td>
                  {months.map(month => {
                    const sales = rawData
                      .filter(r => r.month === month && !r.is_fee)
                      .reduce((sum, r) => sum + parseFloat(r.amount), 0)
                    return (
                      <td key={month} className="px-2 py-2 text-right text-sm border">
                        {formatCurrency(sales)}
                      </td>
                    )
                  })}
                  <td className="px-4 py-2 text-right text-sm bg-red-200 border">
                    {formatCurrency(rawData.filter(r => !r.is_fee).reduce((sum, r) => sum + parseFloat(r.amount), 0))}
                  </td>
                </tr>
                
                {/* 수수료 합계 행 */}
                <tr className="bg-yellow-100 font-bold">
                  <td className="px-4 py-2 text-sm">{language === 'ja' ? '手数料' : '수수료'}</td>
                  {months.map(month => {
                    const fees = rawData
                      .filter(r => r.month === month && r.is_fee)
                      .reduce((sum, r) => sum + parseFloat(r.amount), 0)
                    return (
                      <td key={month} className="px-2 py-2 text-right text-sm border">
                        {formatCurrency(fees)}
                      </td>
                    )
                  })}
                  <td className="px-4 py-2 text-right text-sm bg-yellow-200 border">
                    {formatCurrency(rawData.filter(r => r.is_fee).reduce((sum, r) => sum + parseFloat(r.amount), 0))}
                  </td>
                </tr>
                
                {/* 매출합계 (매출 - 수수료) 행 */}
                <tr className="bg-green-100 font-bold border-t-2">
                  <td className="px-4 py-2 text-sm">{language === 'ja' ? '売上合計' : '매출합계'}</td>
                  {months.map(month => (
                    <td key={month} className="px-2 py-2 text-right text-sm border">
                      {formatCurrency(getMonthTotal(month))}
                    </td>
                  ))}
                  <td className="px-4 py-2 text-right text-sm bg-green-200 border font-extrabold">
                    {formatCurrency(getGrandTotal())}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default TotalSalesTab

