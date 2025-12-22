import React, { useState, useEffect } from 'react'
import api from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency } from './utils'

interface TotalSalesTabProps {
  language: 'ja' | 'ko'
  isAdmin: boolean
}

const TotalSalesTab: React.FC<TotalSalesTabProps> = ({ language, isAdmin }) => {
  const [totalSalesData, setTotalSalesData] = useState<any[]>([])
  const [totalSalesYear, setTotalSalesYear] = useState<number>(2026)
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null)
  const [editingValue, setEditingValue] = useState<string>('')

  useEffect(() => {
    fetchTotalSales()
  }, [totalSalesYear])

  const fetchTotalSales = async () => {
    try {
      const response = await api.get(`/total-sales/${totalSalesYear}`)
      setTotalSalesData(response.data)
    } catch (error) {
      console.error('Total sales fetch error:', error)
    }
  }

  const handleCellClick = (id: string, field: string, currentValue: any) => {
    setEditingCell({ id, field })
    setEditingValue(String(currentValue || 0))
  }

  const handleCellSave = async () => {
    if (!editingCell) return

    try {
      await api.put(`/total-sales/${editingCell.id}`, {
        field: editingCell.field,
        value: editingValue
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

  const renderEditableCell = (row: any, field: string, value: any, className: string = '') => {
    const isEditing = editingCell?.id === row.id && editingCell?.field === field

    return (
      <td
        className={`px-4 py-3 text-right cursor-pointer hover:bg-blue-50 ${className}`}
        onClick={() => handleCellClick(row.id, field, value)}
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
            className="w-full text-right border rounded px-1"
          />
        ) : (
          formatCurrency(value || 0)
        )}
      </td>
    )
  }

  // Calculate totals for each payment method
  const calculateTotals = (field: string) => {
    return totalSalesData.reduce((sum, row) => sum + (parseFloat(row[field]) || 0), 0)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>{language === 'ja' ? '全体売上管理' : '전체 매출 관리'}</CardTitle>
            <div className="flex gap-2 items-center">
              <label className="text-sm font-medium">{language === 'ja' ? '年度' : '연도'}:</label>
              <select
                className="border rounded px-3 py-2"
                value={totalSalesYear}
                onChange={(e) => setTotalSalesYear(Number(e.target.value))}
              >
                {[2024, 2025, 2026, 2027, 2028].map((year) => (
                  <option key={year} value={year}>
                    {year}{language === 'ja' ? '年度' : '년도'}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">{language === 'ja' ? '月' : '월'}</th>
                  <th className="px-4 py-3 text-right bg-blue-50">{language === 'ja' ? '口座振込' : '계좌이체'}</th>
                  <th className="px-4 py-3 text-right">{language === 'ja' ? '手数料' : '수수료'}</th>
                  <th className="px-4 py-3 text-right bg-green-50">PayPay</th>
                  <th className="px-4 py-3 text-right">{language === 'ja' ? '手数料' : '수수료'}</th>
                  <th className="px-4 py-3 text-right bg-purple-50">PayPal</th>
                  <th className="px-4 py-3 text-right">{language === 'ja' ? '手数料' : '수수료'}</th>
                  <th className="px-4 py-3 text-right bg-yellow-50">Stripe</th>
                  <th className="px-4 py-3 text-right">{language === 'ja' ? '手数料' : '수수료'}</th>
                  <th className="px-4 py-3 text-right font-semibold bg-emerald-50">{language === 'ja' ? '合計' : '합계'}</th>
                </tr>
              </thead>
              <tbody>
                {totalSalesData.map((row) => {
                  const total =
                    (parseFloat(row.bank_transfer) || 0) -
                    (parseFloat(row.bank_transfer_fee) || 0) +
                    (parseFloat(row.paypay) || 0) -
                    (parseFloat(row.paypay_fee) || 0) +
                    (parseFloat(row.paypal) || 0) -
                    (parseFloat(row.paypal_fee) || 0) +
                    (parseFloat(row.stripe) || 0) -
                    (parseFloat(row.stripe_fee) || 0)

                  return (
                    <tr key={row.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">
                        {row.month}{language === 'ja' ? '月' : '월'}
                      </td>
                      {renderEditableCell(row, 'bank_transfer', row.bank_transfer, 'bg-blue-50')}
                      {renderEditableCell(row, 'bank_transfer_fee', row.bank_transfer_fee)}
                      {renderEditableCell(row, 'paypay', row.paypay, 'bg-green-50')}
                      {renderEditableCell(row, 'paypay_fee', row.paypay_fee)}
                      {renderEditableCell(row, 'paypal', row.paypal, 'bg-purple-50')}
                      {renderEditableCell(row, 'paypal_fee', row.paypal_fee)}
                      {renderEditableCell(row, 'stripe', row.stripe, 'bg-yellow-50')}
                      {renderEditableCell(row, 'stripe_fee', row.stripe_fee)}
                      <td className="px-4 py-3 text-right font-semibold bg-emerald-50">
                        {formatCurrency(total)}
                      </td>
                    </tr>
                  )
                })}
                {/* Total Row */}
                <tr className="border-t-2 bg-gray-50 font-bold">
                  <td className="px-4 py-3">{language === 'ja' ? '合計' : '합계'}</td>
                  <td className="px-4 py-3 text-right bg-blue-100">
                    {formatCurrency(calculateTotals('bank_transfer'))}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {formatCurrency(calculateTotals('bank_transfer_fee'))}
                  </td>
                  <td className="px-4 py-3 text-right bg-green-100">
                    {formatCurrency(calculateTotals('paypay'))}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {formatCurrency(calculateTotals('paypay_fee'))}
                  </td>
                  <td className="px-4 py-3 text-right bg-purple-100">
                    {formatCurrency(calculateTotals('paypal'))}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {formatCurrency(calculateTotals('paypal_fee'))}
                  </td>
                  <td className="px-4 py-3 text-right bg-yellow-100">
                    {formatCurrency(calculateTotals('stripe'))}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {formatCurrency(calculateTotals('stripe_fee'))}
                  </td>
                  <td className="px-4 py-3 text-right bg-emerald-100">
                    {formatCurrency(
                      calculateTotals('bank_transfer') -
                      calculateTotals('bank_transfer_fee') +
                      calculateTotals('paypay') -
                      calculateTotals('paypay_fee') +
                      calculateTotals('paypal') -
                      calculateTotals('paypal_fee') +
                      calculateTotals('stripe') -
                      calculateTotals('stripe_fee')
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

