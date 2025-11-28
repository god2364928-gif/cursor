import { useState, useEffect } from 'react'
import { X, Phone, Globe, Instagram, ExternalLink, Mail, MapPin, Clock, User, MessageSquare, AlertTriangle } from 'lucide-react'
import { Button } from './ui/button'
import api from '../lib/api'
import { useToast } from './ui/toast'

interface Restaurant {
  id: number
  shop_id: string
  name: string
  tel_original?: string
  tel_confirmed?: string
  address?: string
  prefecture: string
  areas?: string[]
  genres?: string[]
  homepage?: string
  homepage_status?: string
  instagram?: string
  hotpepper?: string
  is_contactable: boolean
  is_unusable: boolean
  unusable_reason?: string
  unusable_by_name?: string
  unusable_at?: string
  status: string
  assignee_id?: string
  assignee_name?: string
  last_contacted_at?: string
  last_contacted_by_name?: string
  memo?: string
  created_at: string
  updated_at: string
}

interface SalesActivity {
  id: string
  user_name: string
  contact_method: string
  notes?: string
  created_at: string
}

interface Props {
  restaurantId: number | null
  onClose: () => void
  onUpdate?: () => void
}

const CONTACT_METHOD_LABELS: Record<string, { label: string; icon: string }> = {
  form: { label: '폼', icon: '📝' },
  phone: { label: '전화', icon: '📞' },
  instagram: { label: '인스타그램', icon: '📷' },
  line: { label: '라인', icon: '💬' }
}

export default function RestaurantDrawer({ restaurantId, onClose, onUpdate }: Props) {
  const { showToast } = useToast()
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [activities, setActivities] = useState<SalesActivity[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [memo, setMemo] = useState('')
  const [isSavingMemo, setIsSavingMemo] = useState(false)
  const [unusableReason, setUnusableReason] = useState('')
  const [showUnusableConfirm, setShowUnusableConfirm] = useState(false)

  useEffect(() => {
    if (restaurantId) {
      loadRestaurant()
    }
  }, [restaurantId])

  const loadRestaurant = async () => {
    if (!restaurantId) return
    
    try {
      setIsLoading(true)
      const response = await api.get(`/restaurants/${restaurantId}`)
      setRestaurant(response.data.restaurant)
      setActivities(response.data.activities || [])
      setMemo(response.data.restaurant.memo || '')
    } catch (error) {
      console.error('Failed to load restaurant:', error)
      showToast('가게 정보를 불러오는데 실패했습니다', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveMemo = async () => {
    if (!restaurant) return
    
    try {
      setIsSavingMemo(true)
      await api.patch(`/restaurants/${restaurant.id}`, { memo })
      showToast('메모가 저장되었습니다', 'success')
    } catch (error) {
      console.error('Failed to save memo:', error)
      showToast('메모 저장에 실패했습니다', 'error')
    } finally {
      setIsSavingMemo(false)
    }
  }

  const handleMarkUnusable = async () => {
    if (!restaurant) return
    
    try {
      await api.post(`/restaurants/${restaurant.id}/unusable`, { 
        reason: unusableReason 
      })
      showToast('쓸 수 없는 가게로 표시되었습니다', 'success')
      setShowUnusableConfirm(false)
      onUpdate?.()
      onClose()
    } catch (error) {
      console.error('Failed to mark as unusable:', error)
      showToast('처리에 실패했습니다', 'error')
    }
  }

  const handleRestoreUsable = async () => {
    if (!restaurant) return
    
    try {
      await api.delete(`/restaurants/${restaurant.id}/unusable`)
      showToast('가게가 복원되었습니다', 'success')
      loadRestaurant()
      onUpdate?.()
    } catch (error) {
      console.error('Failed to restore:', error)
      showToast('처리에 실패했습니다', 'error')
    }
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    showToast(`${label} 복사됨`, 'success')
  }

  if (!restaurantId) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-white shadow-2xl z-50 overflow-hidden flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <h2 className="text-lg font-bold truncate">
            {isLoading ? '로딩 중...' : restaurant?.name || '가게 상세'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : restaurant ? (
            <>
              {/* 쓸 수 없는 가게 경고 */}
              {restaurant.is_unusable && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-red-800">쓸 수 없는 가게</p>
                      {restaurant.unusable_reason && (
                        <p className="text-sm text-red-600 mt-1">{restaurant.unusable_reason}</p>
                      )}
                      <p className="text-xs text-red-500 mt-2">
                        {restaurant.unusable_by_name} • {restaurant.unusable_at && new Date(restaurant.unusable_at).toLocaleDateString('ko-KR')}
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-3"
                        onClick={handleRestoreUsable}
                      >
                        복원하기
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* 상태 배지 */}
              <div className="flex flex-wrap gap-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  restaurant.status === 'new' ? 'bg-gray-100 text-gray-700' :
                  restaurant.status === 'contacted' ? 'bg-blue-100 text-blue-700' :
                  restaurant.status === 'contracted' ? 'bg-green-100 text-green-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {restaurant.status === 'new' ? '신규' :
                   restaurant.status === 'contacted' ? '영업 진행' :
                   restaurant.status === 'contracted' ? '계약 완료' :
                   restaurant.status}
                </span>
                {restaurant.is_contactable && (
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-700">
                    📧 문의 가능
                  </span>
                )}
              </div>

              {/* 연락처 정보 */}
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  연락처
                </h3>
                
                {restaurant.tel_original && (
                  <div 
                    className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg cursor-pointer hover:bg-orange-100 transition-colors"
                    onClick={() => copyToClipboard(restaurant.tel_original!, '전화번호(기존)')}
                  >
                    <span className="px-2 py-0.5 bg-orange-500 text-white text-xs font-bold rounded">중요</span>
                    <span className="font-mono text-lg">{restaurant.tel_original}</span>
                    <span className="text-xs text-gray-500 ml-auto">클릭해서 복사</span>
                  </div>
                )}
                
                {restaurant.tel_confirmed && (
                  <div 
                    className="flex items-center gap-2 p-3 bg-gray-50 border rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => copyToClipboard(restaurant.tel_confirmed!, '전화번호(확인됨)')}
                  >
                    <span className="font-mono text-lg">{restaurant.tel_confirmed}</span>
                    <span className="text-xs text-gray-500 ml-auto">클릭해서 복사</span>
                  </div>
                )}

                {!restaurant.tel_original && !restaurant.tel_confirmed && (
                  <p className="text-gray-500 text-sm">전화번호 정보 없음</p>
                )}
              </div>

              {/* 링크 */}
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  링크
                </h3>
                
                <div className="grid grid-cols-1 gap-2">
                  {restaurant.homepage && (
                    <a
                      href={restaurant.homepage}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                    >
                      <Globe className="w-5 h-5 text-green-600" />
                      <span className="flex-1 truncate">{restaurant.homepage}</span>
                      <ExternalLink className="w-4 h-4 text-gray-400" />
                    </a>
                  )}
                  
                  {restaurant.instagram && (
                    <a
                      href={restaurant.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-pink-50 border border-pink-200 rounded-lg hover:bg-pink-100 transition-colors"
                    >
                      <Instagram className="w-5 h-5 text-pink-600" />
                      <span className="flex-1 truncate">{restaurant.instagram}</span>
                      <ExternalLink className="w-4 h-4 text-gray-400" />
                    </a>
                  )}
                  
                  {restaurant.hotpepper && (
                    <a
                      href={restaurant.hotpepper}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors"
                    >
                      <span className="text-xl">🌶️</span>
                      <span className="flex-1">핫페퍼에서 보기</span>
                      <ExternalLink className="w-4 h-4 text-gray-400" />
                    </a>
                  )}
                </div>
              </div>

              {/* 주소 */}
              {restaurant.address && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    주소
                  </h3>
                  <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{restaurant.address}</p>
                </div>
              )}

              {/* 장르 */}
              {restaurant.genres && restaurant.genres.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-900">장르</h3>
                  <div className="flex flex-wrap gap-2">
                    {restaurant.genres.map((genre, idx) => (
                      <span 
                        key={idx}
                        className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm"
                      >
                        {genre}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 담당자 정보 */}
              {(restaurant.assignee_name || restaurant.last_contacted_at) && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    담당자 정보
                  </h3>
                  <div className="bg-gray-50 p-3 rounded-lg space-y-1">
                    {restaurant.assignee_name && (
                      <p className="text-sm">
                        <span className="text-gray-500">담당자:</span> {restaurant.assignee_name}
                      </p>
                    )}
                    {restaurant.last_contacted_at && (
                      <p className="text-sm">
                        <span className="text-gray-500">마지막 연락:</span>{' '}
                        {new Date(restaurant.last_contacted_at).toLocaleDateString('ko-KR')}
                        {restaurant.last_contacted_by_name && ` (${restaurant.last_contacted_by_name})`}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* 메모 */}
              <div className="space-y-2">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  메모
                </h3>
                <textarea
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="메모를 입력하세요..."
                  className="w-full h-24 p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Button 
                  onClick={handleSaveMemo} 
                  disabled={isSavingMemo}
                  className="w-full"
                >
                  {isSavingMemo ? '저장 중...' : '메모 저장'}
                </Button>
              </div>

              {/* 영업 이력 */}
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  영업 이력
                </h3>
                
                {activities.length === 0 ? (
                  <p className="text-gray-500 text-sm">아직 영업 이력이 없습니다</p>
                ) : (
                  <div className="space-y-2">
                    {activities.map((activity) => (
                      <div 
                        key={activity.id}
                        className="p-3 bg-gray-50 rounded-lg border"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">
                            {CONTACT_METHOD_LABELS[activity.contact_method]?.icon || '📌'}
                          </span>
                          <span className="font-medium">
                            {CONTACT_METHOD_LABELS[activity.contact_method]?.label || activity.contact_method}
                          </span>
                          <span className="text-gray-500 text-sm ml-auto">
                            {activity.user_name}
                          </span>
                        </div>
                        {activity.notes && (
                          <p className="text-sm text-gray-600 mt-1">{activity.notes}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-2">
                          {new Date(activity.created_at).toLocaleString('ko-KR')}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 쓸 수 없음 버튼 */}
              {!restaurant.is_unusable && (
                <div className="pt-4 border-t">
                  {showUnusableConfirm ? (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-600">이 가게를 쓸 수 없는 것으로 표시하시겠습니까?</p>
                      <input
                        type="text"
                        value={unusableReason}
                        onChange={(e) => setUnusableReason(e.target.value)}
                        placeholder="사유 입력 (선택)"
                        className="w-full p-2 border rounded-lg"
                      />
                      <div className="flex gap-2">
                        <Button 
                          variant="destructive" 
                          className="flex-1"
                          onClick={handleMarkUnusable}
                        >
                          확인
                        </Button>
                        <Button 
                          variant="outline" 
                          className="flex-1"
                          onClick={() => setShowUnusableConfirm(false)}
                        >
                          취소
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button 
                      variant="outline" 
                      className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => setShowUnusableConfirm(true)}
                    >
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      쓸 수 없는 가게로 표시
                    </Button>
                  )}
                </div>
              )}
            </>
          ) : (
            <p className="text-center text-gray-500 py-12">가게 정보를 찾을 수 없습니다</p>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
      `}</style>
    </>
  )
}

