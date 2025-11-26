import { useState, useEffect } from 'react'
import api from '../lib/api'
import { useAuthStore } from '../store/authStore'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent } from '../components/ui/card'
import { useToast } from '../components/ui/toast'
import { Search, Trash2, ExternalLink, Phone, MapPin, DollarSign, MessageSquare, Loader2 } from 'lucide-react'

interface HotpepperRestaurant {
  id: string
  hotpepper_id: string
  name: string
  tel?: string
  address: string
  budget_average?: string
  catch_phrase?: string
  shop_url?: string
  search_keyword?: string
  search_area?: string
  notes?: string
  collected_at: string
}

interface AreaOption {
  code: string
  name: string
  name_ko: string
}

export default function HotpepperPage() {
  const user = useAuthStore(state => state.user)
  const { showToast } = useToast()
  
  const [keyword, setKeyword] = useState('')
  const [selectedArea, setSelectedArea] = useState('')
  const [areas, setAreas] = useState<AreaOption[]>([])
  const [restaurants, setRestaurants] = useState<HotpepperRestaurant[]>([])
  const [selectedRestaurants, setSelectedRestaurants] = useState<Set<string>>(new Set())
  const [isSearching, setIsSearching] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [searchFilter, setSearchFilter] = useState('')
  const [totalCount, setTotalCount] = useState(0)

  // 지역 목록 로드
  useEffect(() => {
    loadAreas()
    loadRestaurants()
  }, [])

  const loadAreas = async () => {
    try {
      const response = await api.get('/hotpepper/areas')
      setAreas(response.data.areas)
    } catch (error) {
      console.error('지역 목록 로드 실패:', error)
    }
  }

  const loadRestaurants = async () => {
    try {
      setIsLoading(true)
      const response = await api.get('/hotpepper/restaurants', {
        params: {
          search: searchFilter || undefined,
          limit: 100,
        }
      })
      setRestaurants(response.data.restaurants)
      setTotalCount(response.data.total)
    } catch (error) {
      console.error('맛집 목록 로드 실패:', error)
      showToast('목록 불러오기에 실패했습니다', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = async () => {
    if (!keyword && !selectedArea) {
      showToast('키워드 또는 지역을 선택해주세요', 'error')
      return
    }

    try {
      setIsSearching(true)
      const response = await api.post('/hotpepper/search', {
        keyword: keyword || undefined,
        area: selectedArea || undefined,
        count: 100,
      })

      if (response.data.success) {
        showToast(
          `${response.data.saved}개 신규 저장, ${response.data.updated}개 업데이트됨`,
          'success'
        )
        // 목록 새로고침
        await loadRestaurants()
      }
    } catch (error: any) {
      console.error('검색 실패:', error)
      showToast(
        error.response?.data?.message || '검색에 실패했습니다',
        'error'
      )
    } finally {
      setIsSearching(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('이 맛집 정보를 삭제하시겠습니까?')) {
      return
    }

    try {
      await api.delete(`/hotpepper/restaurants/${id}`)
      showToast('삭제되었습니다', 'success')
      await loadRestaurants()
    } catch (error) {
      console.error('삭제 실패:', error)
      showToast('삭제에 실패했습니다', 'error')
    }
  }

  const handleBulkDelete = async () => {
    if (selectedRestaurants.size === 0) {
      showToast('삭제할 항목을 선택해주세요', 'error')
      return
    }

    if (!confirm(`선택한 ${selectedRestaurants.size}개 항목을 삭제하시겠습니까?`)) {
      return
    }

    try {
      await api.post('/hotpepper/restaurants/bulk-delete', {
        ids: Array.from(selectedRestaurants)
      })
      showToast(`${selectedRestaurants.size}개 항목이 삭제되었습니다`, 'success')
      setSelectedRestaurants(new Set())
      await loadRestaurants()
    } catch (error) {
      console.error('대량 삭제 실패:', error)
      showToast('삭제에 실패했습니다', 'error')
    }
  }

  const toggleSelectAll = () => {
    if (selectedRestaurants.size === restaurants.length) {
      setSelectedRestaurants(new Set())
    } else {
      setSelectedRestaurants(new Set(restaurants.map(r => r.id)))
    }
  }

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedRestaurants)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedRestaurants(newSet)
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">리쿠르트 검색</h1>
        <p className="text-gray-600">일본 음식점 정보를 검색하고 저장합니다 (뷰티, 숙박 등 향후 추가 예정)</p>
      </div>

      {/* 검색 폼 */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">지역</label>
              <select
                value={selectedArea}
                onChange={(e) => setSelectedArea(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">전체 지역</option>
                {areas.map(area => (
                  <option key={area.code} value={area.code}>
                    {area.name_ko} ({area.name})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">키워드</label>
              <Input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="라멘, 스시, 이자카야 등"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearch()
                }}
              />
            </div>

            <div className="flex items-end">
              <Button
                onClick={handleSearch}
                disabled={isSearching || (!keyword && !selectedArea)}
                className="w-full"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    검색 중...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    검색 및 저장
                  </>
                )}
              </Button>
            </div>
          </div>

          <p className="text-sm text-gray-500">
            * 검색 결과는 자동으로 데이터베이스에 저장됩니다 (최대 100개)
          </p>
        </CardContent>
      </Card>

      {/* 저장된 맛집 목록 */}
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-semibold">저장된 맛집 목록</h2>
              <span className="text-sm text-gray-500">총 {totalCount}개</span>
            </div>
            <div className="flex gap-2">
              <Input
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="가게명, 주소로 검색..."
                className="w-64"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') loadRestaurants()
                }}
              />
              <Button onClick={loadRestaurants} variant="outline">
                <Search className="w-4 h-4" />
              </Button>
              {selectedRestaurants.size > 0 && (
                <Button onClick={handleBulkDelete} variant="destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  선택 삭제 ({selectedRestaurants.size})
                </Button>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-gray-400" />
              <p className="text-gray-500">로딩 중...</p>
            </div>
          ) : restaurants.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>저장된 맛집이 없습니다</p>
              <p className="text-sm mt-2">위에서 검색하여 맛집을 저장해보세요</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedRestaurants.size === restaurants.length && restaurants.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">가게명</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">전화번호</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">주소</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">평균 예산</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">홍보 문구</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">검색 정보</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">수집 일시</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">작업</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {restaurants.map((restaurant) => (
                    <tr key={restaurant.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedRestaurants.has(restaurant.id)}
                          onChange={() => toggleSelect(restaurant.id)}
                          className="rounded"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{restaurant.name}</div>
                      </td>
                      <td className="px-4 py-3">
                        {restaurant.tel ? (
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="w-3 h-3" />
                            {restaurant.tel}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-sm max-w-xs">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate" title={restaurant.address}>
                            {restaurant.address}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {restaurant.budget_average ? (
                          <div className="flex items-center gap-1 text-sm">
                            <DollarSign className="w-3 h-3" />
                            {restaurant.budget_average}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {restaurant.catch_phrase ? (
                          <div className="flex items-center gap-1 text-sm max-w-xs">
                            <MessageSquare className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate" title={restaurant.catch_phrase}>
                              {restaurant.catch_phrase}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm">
                          {restaurant.search_area && (
                            <div className="text-blue-600">
                              지역: {areas.find(a => a.code === restaurant.search_area)?.name_ko || restaurant.search_area}
                            </div>
                          )}
                          {restaurant.search_keyword && (
                            <div className="text-green-600">
                              키워드: {restaurant.search_keyword}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {new Date(restaurant.collected_at).toLocaleDateString('ko-KR')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {restaurant.shop_url && (
                            <a
                              href={restaurant.shop_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800"
                              title="핫페퍼에서 보기"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                          <button
                            onClick={() => handleDelete(restaurant.id)}
                            className="text-red-600 hover:text-red-800"
                            title="삭제"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 안내 정보 */}
      <Card className="mt-6">
        <CardContent className="p-6">
          <h3 className="font-semibold mb-3">사용 방법</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li>• <strong>지역 검색:</strong> 지역을 선택하고 검색 버튼을 누르면 해당 지역의 음식점이 검색됩니다</li>
            <li>• <strong>키워드 검색:</strong> 라멘, 스시 등 음식 종류나 가게명을 입력하여 검색할 수 있습니다</li>
            <li>• <strong>복합 검색:</strong> 지역과 키워드를 함께 사용하면 더 정확한 결과를 얻을 수 있습니다</li>
            <li>• <strong>자동 저장:</strong> 검색 결과는 자동으로 데이터베이스에 저장됩니다 (중복 시 업데이트)</li>
            <li>• <strong>최대 수집:</strong> 한 번에 최대 100개 음식점까지 수집됩니다</li>
          </ul>
          
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              <strong>💡 참고:</strong> 핫페퍼 구루메 API는 일일 호출 제한이 있습니다 (약 3,000~10,000건).
              제한에 도달하면 다음 날까지 기다려야 합니다.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

