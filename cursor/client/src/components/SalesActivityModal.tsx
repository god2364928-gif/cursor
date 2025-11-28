import { useState } from 'react'
import { X, Phone, FileText, Instagram, MessageCircle, Loader2 } from 'lucide-react'
import { Button } from './ui/button'
import api from '../lib/api'
import { useToast } from './ui/toast'

interface Props {
  restaurantId: number
  restaurantName: string
  onClose: () => void
  onSuccess: () => void
}

const CONTACT_METHODS = [
  { id: 'form', label: '폼', icon: FileText, color: 'bg-blue-500 hover:bg-blue-600' },
  { id: 'phone', label: '전화', icon: Phone, color: 'bg-green-500 hover:bg-green-600' },
  { id: 'instagram', label: '인스타그램', icon: Instagram, color: 'bg-pink-500 hover:bg-pink-600' },
  { id: 'line', label: '라인', icon: MessageCircle, color: 'bg-emerald-500 hover:bg-emerald-600' },
] as const

export default function SalesActivityModal({ restaurantId, restaurantName, onClose, onSuccess }: Props) {
  const { showToast } = useToast()
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
      
      showToast('영업 이력이 등록되었습니다', 'success')
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Failed to create sales activity:', error)
      showToast('영업 이력 등록에 실패했습니다', 'error')
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
            <h2 className="text-lg font-bold">영업 이력 등록</h2>
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
              <p className="text-sm text-gray-500">가게</p>
              <p className="font-semibold truncate">{restaurantName}</p>
            </div>

            {step === 'select' ? (
              <>
                <p className="text-gray-600 mb-4">영업 방식을 선택해주세요</p>
                
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
                        <span className="font-medium">{method.label}</span>
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
                          {selectedMethodInfo.label}로 영업
                        </span>
                      </>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      메모 (선택)
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="추가 메모를 입력하세요..."
                      className="w-full h-24 p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-800">
                      <strong>확인:</strong> 이 가게에 영업 이력을 등록하면 담당자로 지정됩니다.
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
                뒤로
              </Button>
              <Button 
                className="flex-1"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    등록 중...
                  </>
                ) : (
                  '영업 이력 등록'
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

