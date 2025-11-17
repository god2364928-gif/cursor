import { useNavigate } from 'react-router-dom'
import { RetargetingCustomer } from '../types'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { AlertTriangle, X } from 'lucide-react'
import { useI18nStore } from '../i18n'
import { useEffect } from 'react'

interface RetargetingAlertModalProps {
  customers: RetargetingCustomer[]
  onClose: () => void
  onHideToday: () => void
  userId: string
}

export default function RetargetingAlertModal({ customers, onClose, onHideToday, userId }: RetargetingAlertModalProps) {
  const navigate = useNavigate()
  const { t } = useI18nStore()

  // ESC 키 처리
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && customers.length > 0) {
        onClose()
      }
    }
    
    if (customers.length > 0) {
      window.addEventListener('keydown', handleEscape)
    }
    
    return () => {
      window.removeEventListener('keydown', handleEscape)
    }
  }, [customers.length, onClose])

  const getDaysSinceLastContact = (lastContactDate: string) => {
    const diff = Date.now() - new Date(lastContactDate).getTime()
    return Math.floor(diff / (1000 * 60 * 60 * 24))
  }

  const handleCustomerClick = (customer: RetargetingCustomer) => {
    navigate('/retargeting', {
      state: {
        selectedId: customer.id,
        searchQuery: ''
      }
    })
    onClose()
  }

  if (customers.length === 0) return null

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        // 배경 클릭 시에만 닫기 (모달 내부 클릭은 제외)
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <Card className="w-full max-w-2xl max-h-[80vh] flex flex-col">
        <CardHeader className="flex-shrink-0 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-6 w-6" />
              {t('retargetingAlertTitle')} ({customers.length}{t('retargetingAlertCount')})
            </CardTitle>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label={t('close')}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {customers.map((customer) => {
              const days = getDaysSinceLastContact(customer.lastContactDate!)
              return (
                <div
                  key={customer.id}
                  onClick={() => handleCustomerClick(customer)}
                  className="p-4 border rounded-lg cursor-pointer hover:bg-red-50 hover:border-red-300 transition-colors bg-red-50/30 border-red-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">
                        {customer.companyName}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {t('customerName')}: {customer.customerName}
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-lg font-bold text-red-600">
                        {days}{t('retargetingAlertDaysAgo')}
                      </div>
                      <div className="text-xs text-gray-500">
                        {t('retargetingAlertLastContact')}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>

        <div className="flex-shrink-0 border-t p-4 flex gap-2 justify-end">
          <Button
            variant="outline"
            onClick={() => {
              onHideToday()
              onClose()
            }}
          >
            {t('retargetingAlertHideToday')}
          </Button>
          <Button onClick={onClose}>
            {t('close')}
          </Button>
        </div>
      </Card>
    </div>
  )
}

