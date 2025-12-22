import { useState } from 'react'
import { X, Phone, FileText, Instagram, MessageCircle, Loader2 } from 'lucide-react'
import { Button } from './ui/button'
import api from '../lib/api'
import { useToast } from './ui/toast'
import { useI18nStore } from '../i18n'

interface Props {
  restaurantId: number
  restaurantName: string
  onClose: () => void
  onSuccess: () => void
}

const CONTACT_METHODS = [
  { id: 'form', labelKey: 'form', icon: FileText, color: 'bg-blue-500 hover:bg-blue-600' },
  { id: 'phone', labelKey: 'phoneCall', icon: Phone, color: 'bg-green-500 hover:bg-green-600' },
  { id: 'instagram', labelKey: 'instagram', icon: Instagram, color: 'bg-pink-500 hover:bg-pink-600' },
  { id: 'line', labelKey: 'line', icon: MessageCircle, color: 'bg-emerald-500 hover:bg-emerald-600' },
] as const

export default function SalesActivityModal({ restaurantId, restaurantName, onClose, onSuccess }: Props) {
  const { showToast } = useToast()
  const { t } = useI18nStore()
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [step, setStep] = useState<'select' | 'confirm'>('select')

  const handleMethodSelect = (methodId: string) => {
    setSelectedMethod(methodId)
    setStep('confirm')
  }

  const handleSubmit = async () => {
    if (!selectedMethod) return

    try {
      setIsSubmitting(true)
      await api.post(`/restaurants/${restaurantId}/sales-activity`, {
        contact_method: selectedMethod,
        notes: notes || null
      })
      
      showToast(t('salesHistoryRegistered'), 'success')
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Failed to create sales activity:', error)
      showToast(t('salesHistoryRegisterFailed'), 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedMethodInfo = CONTACT_METHODS.find(m => m.id === selectedMethod)

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Modal */}
        <div 
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-bold">{t('registerSalesHistory')}</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Restaurant Name */}
            <div className="mb-6 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">{t('store')}</p>
              <p className="font-semibold truncate">{restaurantName}</p>
            </div>

            {step === 'select' ? (
              <>
                <p className="text-gray-600 mb-4">{t('selectSalesMethod')}</p>
                
                {/* Method Selection */}
                <div className="grid grid-cols-2 gap-3">
                  {CONTACT_METHODS.map((method) => {
                    const Icon = method.icon
                    return (
                      <button
                        key={method.id}
                        onClick={() => handleMethodSelect(method.id)}
                        className={`
                          flex flex-col items-center justify-center gap-2 p-6
                          ${method.color} text-white rounded-xl
                          transition-all duration-200 transform hover:scale-105
                          shadow-lg hover:shadow-xl
                        `}
                      >
                        <Icon className="w-8 h-8" />
                        <span className="font-medium">{t(method.labelKey)}</span>
                      </button>
                    )
                  })}
                </div>
              </>
            ) : (
              <>
                {/* Confirm Step */}
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-3 p-4 bg-gray-50 rounded-lg">
                    {selectedMethodInfo && (
                      <>
                        <div className={`p-3 rounded-full ${selectedMethodInfo.color} text-white`}>
                          <selectedMethodInfo.icon className="w-6 h-6" />
                        </div>
                        <span className="text-lg font-semibold">
                          {t(selectedMethodInfo.labelKey)}{t('salesWith')}
                        </span>
                      </>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('memoOptional')}
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={t('enterAdditionalMemo')}
                      className="w-full h-24 p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-800">
                      <strong>{t('confirmNote')}:</strong> {t('willBeAssigned')}
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          {step === 'confirm' && (
            <div className="flex gap-3 p-4 border-t bg-gray-50">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setStep('select')}
                disabled={isSubmitting}
              >
                {t('back')}
              </Button>
              <Button 
                className="flex-1"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('registering')}
                  </>
                ) : (
                  t('registerSalesHistory')
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

