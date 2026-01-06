import React, { useState, useEffect, useCallback } from 'react'
import api from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency } from './utils'

interface TotalSalesTabProps {
  language: 'ja' | 'ko'
  isAdmin: boolean
}

interface MonthlyData {
  id: string
  month: number
  bank_transfer: number
  bank_transfer_fee: number
  paypay: number
  paypay_fee: number
  paypal: number
  paypal_fee: number
  strip: number
  strip_fee: number
  strip1: number
  strip1_fee: number
  coconala: number
}

const TotalSalesTab: React.FC<TotalSalesTabProps> = ({ language, isAdmin }) => {
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])
  const [totalSalesYear, setTotalSalesYear] = useState<number>(2026)
  const [editingCell, setEditingCell] = useState<{ month: number; field: string } | null>(null)
  const [editingValue, setEditingValue] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const months = [10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9]

  useEffect(() => {
    fetchTotalSales()
  }, [totalSalesYear])

  const fetchTotalSales = useCallback(async () => {
    setLoading(true)
    try {
      const response = await api.get(`/total-sales/${totalSalesYear}`)
      console.log('Total sales API response:', response.data)
      console.log('First row:', response.data[0])
      console.log('First row bank_transfer:', response.data[0]?.bank_transfer)
      setMonthlyData(response.data || [])
    } catch (error) {
      console.error('Total sales fetch error:', error)
    } finally {
      setLoading(false)
    }
  }, [totalSalesYear])
  
  // 특정 월의 데이터 가져오기
  const getMonthData = (month: number): MonthlyData | null => {
    return monthlyData.find(d => d.month === month) || null
  }
  
  // 특정 필드의 값 가져오기
  const getValue = (month: number, field: keyof MonthlyData): number => {
    const data = getMonthData(month)
    if (!data) return 0
    const value = data[field]
    return typeof value === 'number' ? value : parseFloat(String(value)) || 0
  }
  
  // 행 합계 (모든 월)
  const getRowTotal = (field: keyof MonthlyData): number => {
    return monthlyData.reduce((sum, data) => {
      const value = data[field]
      return sum + (typeof value === 'number' ? value : parseFloat(String(value)) || 0)
    }, 0)
  }

  const handleCellClick = (month: number, field: string, currentValue: number) => {
    setEditingCell({ month, field })
    setEditingValue(String(currentValue || 0))
  }

  const handleCellSave = async () => {
    if (!editingCell) return
    
    try {
      // field명을 payment_method와 is_fee로 변환
      const fieldMapping: { [key: string]: { paymentMethod: string; isFee: boolean } } = {
        'bank_transfer': { paymentMethod: '계좌이체', isFee: false },
        'bank_transfer_fee': { paymentMethod: '계좌이체', isFee: true },
        'paypay': { paymentMethod: 'paypay', isFee: false },
        'paypay_fee': { paymentMethod: 'paypay', isFee: true },
        'paypal': { paymentMethod: 'paypal', isFee: false },
        'paypal_fee': { paymentMethod: 'paypal', isFee: true },
        'strip': { paymentMethod: 'strip', isFee: false },
        'strip_fee': { paymentMethod: 'strip', isFee: true },
        'strip1': { paymentMethod: 'strip1', isFee: false },
        'strip1_fee': { paymentMethod: 'strip1', isFee: true },
        'coconala': { paymentMethod: 'coconala', isFee: false },
      }
      
      const mapping = fieldMapping[editingCell.field]
      if (!mapping) {
        console.error('Invalid field:', editingCell.field)
        return
      }
      
      await api.put('/total-sales/update', {
        fiscalYear: totalSalesYear,
        month: editingCell.month,
        paymentMethod: mapping.paymentMethod,
        isFee: mapping.isFee,
        amount: parseFloat(editingValue) || 0
      })
      
      setEditingCell(null)
      setEditingValue('')
      fetchTotalSales()
    } catch (error) {
      console.error('Cell update error:', error)
      alert(language === 'ja' ? '更新に失敗しました' : '업데이트에 실패했습니다')
    }
  }

  const handleCellCancel = () => {
    setEditingCell(null)
    setEditingValue('')
  }

  const renderEditableCell = (month: number, field: keyof MonthlyData, className: string = '') => {
    const value = getValue(month, field)
    const isEditing = editingCell?.month === month && editingCell?.field === field

    return (
      <td
        key={`${month}-${field}`}
        className={`px-2 py-2 text-right cursor-pointer hover:bg-blue-50 text-xs border ${className}`}
        onClick={() => handleCellClick(month, field, value)}
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
  
  const renderPaymentRow = (label: string, field: keyof MonthlyData, bgColor: string = '') => (
    <tr key={field} className={`border-t ${bgColor}`}>
      <td className="px-4 py-2 font-medium text-sm border">{label}</td>
      {months.map(month => renderEditableCell(month, field))}
      <td className="px-4 py-2 text-right font-semibold text-sm bg-gray-100 border">
        {formatCurrency(getRowTotal(field))}
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
                {renderPaymentRow(language === 'ja' ? '口座振込' : '계좌이체', 'bank_transfer')}
                {renderPaymentRow('PayPay', 'paypay')}
                {renderPaymentRow('PayPal', 'paypal')}
                {renderPaymentRow(language === 'ja' ? 'PayPal 手数料' : 'PayPal 수수료', 'paypal_fee')}
                {renderPaymentRow('strip', 'strip')}
                {renderPaymentRow(language === 'ja' ? 'strip 手数料' : 'strip 수수료', 'strip_fee')}
                {renderPaymentRow('strip1', 'strip1')}
                {renderPaymentRow(language === 'ja' ? 'strip1 手数料' : 'strip1 수수료', 'strip1_fee')}
                {renderPaymentRow(language === 'ja' ? 'ココナラ' : '코코나라', 'coconala')}
                
                {/* 매출 합계 행 */}
                <tr className="border-t-2 bg-red-100 font-bold">
                  <td className="px-4 py-2 text-sm border">{language === 'ja' ? '売上' : '매출'}</td>
                  {months.map(month => {
                    const sales = getValue(month, 'bank_transfer') + getValue(month, 'paypay') + 
                                 getValue(month, 'paypal') + getValue(month, 'strip') + 
                                 getValue(month, 'strip1') + getValue(month, 'coconala')
                    return (
                      <td key={month} className="px-2 py-2 text-right text-sm border">
                        {formatCurrency(sales)}
                      </td>
                    )
                  })}
                  <td className="px-4 py-2 text-right text-sm bg-red-200 border">
                    {formatCurrency(
                      getRowTotal('bank_transfer') + getRowTotal('paypay') + 
                      getRowTotal('paypal') + getRowTotal('strip') + 
                      getRowTotal('strip1') + getRowTotal('coconala')
                    )}
                  </td>
                </tr>
                
                {/* 수수료 합계 행 */}
                <tr className="bg-yellow-100 font-bold">
                  <td className="px-4 py-2 text-sm border">{language === 'ja' ? '手数料' : '수수료'}</td>
                  {months.map(month => {
                    const fees = getValue(month, 'bank_transfer_fee') + getValue(month, 'paypay_fee') + 
                                getValue(month, 'paypal_fee') + getValue(month, 'strip_fee') + 
                                getValue(month, 'strip1_fee')
                    return (
                      <td key={month} className="px-2 py-2 text-right text-sm border">
                        {formatCurrency(fees)}
                      </td>
                    )
                  })}
                  <td className="px-4 py-2 text-right text-sm bg-yellow-200 border">
                    {formatCurrency(
                      getRowTotal('bank_transfer_fee') + getRowTotal('paypay_fee') + 
                      getRowTotal('paypal_fee') + getRowTotal('strip_fee') + 
                      getRowTotal('strip1_fee')
                    )}
                  </td>
                </tr>
                
                {/* 매출합계 (매출 - 수수료) 행 */}
                <tr className="bg-green-100 font-bold border-t-2">
                  <td className="px-4 py-2 text-sm border">{language === 'ja' ? '売上合計' : '매출합계'}</td>
                  {months.map(month => {
                    const data = getMonthData(month)
                    if (!data) return <td key={month} className="px-2 py-2 text-right text-sm border">¥0</td>
                    
                    const sales = getValue(month, 'bank_transfer') + getValue(month, 'paypay') + 
                                 getValue(month, 'paypal') + getValue(month, 'strip') + 
                                 getValue(month, 'strip1') + getValue(month, 'coconala')
                    const fees = getValue(month, 'bank_transfer_fee') + getValue(month, 'paypay_fee') + 
                                getValue(month, 'paypal_fee') + getValue(month, 'strip_fee') + 
                                getValue(month, 'strip1_fee')
                    
                    return (
                      <td key={month} className="px-2 py-2 text-right text-sm border">
                        {formatCurrency(sales - fees)}
                      </td>
                    )
                  })}
                  <td className="px-4 py-2 text-right text-sm bg-green-200 border font-extrabold">
                    {formatCurrency(
                      (getRowTotal('bank_transfer') + getRowTotal('paypay') + getRowTotal('paypal') + getRowTotal('strip') + getRowTotal('strip1') + getRowTotal('coconala')) -
                      (getRowTotal('bank_transfer_fee') + getRowTotal('paypay_fee') + getRowTotal('paypal_fee') + getRowTotal('strip_fee') + getRowTotal('strip1_fee'))
                    )}
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

