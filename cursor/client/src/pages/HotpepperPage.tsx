import { useState, useEffect, useCallback, useRef } from 'react'
import api from '../lib/api'
import { useToast } from '../components/ui/toast'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import RestaurantDrawer from '../components/RestaurantDrawer'
import SalesActivityModal from '../components/SalesActivityModal'
import { useI18nStore } from '../i18n'
import { 
  Search, Phone, Globe, Instagram, Mail, ChevronRight, 
  Loader2, Copy, ExternalLink, ChevronDown, X, AlertTriangle,
  Users, Filter, RefreshCw
} from 'lucide-react'

// User type for assignee filter
interface User {
  id: string
  name: string
}

// Types
interface Restaurant {
  id: number
  shop_id: string
  name: string
  tel_original?: string
  tel_confirmed?: string
  prefecture: string
  areas?: string[]
  genres?: string[]
  homepage?: string
  instagram?: string
  hotpepper?: string
  is_contactable: boolean
  is_unusable: boolean
  status: string
  last_contacted_at?: string
  assignee_id?: string
  assignee_name?: string
  activity_count: number
}

interface Prefectures {
  [region: string]: string[]
}

interface Stats {
  total: number
  with_original_phone: number
  with_homepage: number
  contactable: number
  with_instagram: number
  status_new: number
  status_contacted: number
}

// Region labels for display (language-aware)
const REGION_LABELS_JA: Record<string, string> = {
  '北海道': '北海道',
  '東北': '東北',
  '関東': '関東',
  '中部': '中部',
  '近畿': '近畿',
  '中国': '中国',
  '四国': '四国',
  '九州・沖縄': '九州・沖縄'
}

const REGION_LABELS_KO: Record<string, string> = {
  '北海道': '홋카이도',
  '東北': '도호쿠',
  '関東': '간토',
  '中部': '주부',
  '近畿': '긴키',
  '中国': '주고쿠',
  '四国': '시코쿠',
  '九州・沖縄': '규슈·오키나와'
}

export default function HotpepperPage() {
  const { showToast } = useToast()
  const { t, language } = useI18nStore()
  
  // Get region labels based on current language
  const REGION_LABELS = language === 'ja' ? REGION_LABELS_JA : REGION_LABELS_KO

  // Data states
  const [prefectures, setPrefectures] = useState<Prefectures>({})
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [areas, setAreas] = useState<string[]>([])
  const [genres, setGenres] = useState<string[]>([])
  const [users, setUsers] = useState<User[]>([])

  // Filter states
  const [selectedPrefecture, setSelectedPrefecture] = useState<string>('')
  const [selectedArea, setSelectedArea] = useState<string>('')
  const [selectedGenre, setSelectedGenre] = useState<string>('')
  const [selectedAssignee, setSelectedAssignee] = useState<string>('none') // Default to "no assignee"
  const [searchQuery, setSearchQuery] = useState('')
  const [showUnusable, setShowUnusable] = useState(false)

  // Quick filters
  const [hasOriginalPhone, setHasOriginalPhone] = useState(false)
  const [hasHomepage, setHasHomepage] = useState(false)
  const [canContact, setCanContact] = useState(false)
  const [hasInstagram, setHasInstagram] = useState(false)

  // UI states
  const [isLoading, setIsLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [expandedRegion, setExpandedRegion] = useState<string | null>(null)
  
  // Ref for prefecture dropdown (to detect outside click)
  const prefectureDropdownRef = useRef<HTMLDivElement>(null)

  // Modal states
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<number | null>(null)
  const [salesActivityTarget, setSalesActivityTarget] = useState<{ id: number; name: string } | null>(null)

  // Load prefectures on mount and set default to Hokkaido
  useEffect(() => {
    loadPrefectures()
    loadGenres()
    loadUsers()
    // Set default prefecture to Hokkaido
    setSelectedPrefecture('北海道')
  }, [])

  // Close prefecture dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (prefectureDropdownRef.current && !prefectureDropdownRef.current.contains(event.target as Node)) {
        setExpandedRegion(null)
      }
    }

    if (expandedRegion) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [expandedRegion])

  // Load restaurants when filters change
  useEffect(() => {
    if (selectedPrefecture) {
      loadRestaurants()
      loadAreas()
      loadStats()
    } else {
      setRestaurants([])
      setAreas([])
      setStats(null)
    }
  }, [selectedPrefecture, selectedArea, selectedGenre, selectedAssignee, hasOriginalPhone, hasHomepage, canContact, hasInstagram, showUnusable, page])

  const loadPrefectures = async () => {
    try {
      const response = await api.get('/restaurants/prefectures')
      setPrefectures(response.data.prefectures)
    } catch (error) {
      console.error('Failed to load prefectures:', error)
    }
  }

  const loadAreas = async () => {
    if (!selectedPrefecture) return
    try {
      const response = await api.get('/restaurants/areas', {
        params: { prefecture: selectedPrefecture }
      })
      setAreas(response.data.areas || [])
    } catch (error) {
      console.error('Failed to load areas:', error)
    }
  }

  const loadGenres = async () => {
    try {
      const response = await api.get('/restaurants/genres')
      setGenres(response.data.genres || [])
    } catch (error) {
      console.error('Failed to load genres:', error)
    }
  }

  const loadUsers = async () => {
    try {
      const response = await api.get('/auth/users')
      // Only show marketers in assignee filter
      const marketers = (response.data || []).filter((user: User & { role?: string }) => user.role === 'marketer')
      setUsers(marketers)
    } catch (error) {
      console.error('Failed to load users:', error)
    }
  }

  const loadStats = async () => {
    if (!selectedPrefecture) return
    try {
      const response = await api.get('/restaurants/stats/summary', {
        params: { prefecture: selectedPrefecture }
      })
      setStats(response.data)
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }

  const loadRestaurants = async () => {
    if (!selectedPrefecture) return
    
    try {
      setIsLoading(true)
      const response = await api.get('/restaurants', {
        params: {
          prefecture: selectedPrefecture,
          area: selectedArea || undefined,
          genre: selectedGenre || undefined,
          assignee_id: selectedAssignee === 'none' ? 'none' : (selectedAssignee || undefined),
          has_original_phone: hasOriginalPhone || undefined,
          has_homepage: hasHomepage || undefined,
          can_contact: canContact || undefined,
          has_instagram: hasInstagram || undefined,
          show_unusable: showUnusable ? 'true' : undefined,
          search: searchQuery || undefined,
          page,
          limit: 50
        }
      })
      
      setRestaurants(response.data.restaurants)
      setTotal(response.data.total)
      setTotalPages(response.data.totalPages)
    } catch (error) {
      console.error('Failed to load restaurants:', error)
      showToast(t('failedToLoadData'), 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = () => {
    setPage(1)
    loadRestaurants()
  }

  const handlePrefectureSelect = (pref: string) => {
    setSelectedPrefecture(pref)
    setSelectedArea('')
    setSelectedGenre('')
    setPage(1)
    setExpandedRegion(null)
  }

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text)
    showToast(t('phoneCopied'), 'success')
  }, [showToast, t])

  const handleRefresh = () => {
    loadRestaurants()
    loadStats()
  }

  const clearFilters = () => {
    setSelectedArea('')
    setSelectedGenre('')
    setSelectedAssignee('')
    setSearchQuery('')
    setHasOriginalPhone(false)
    setHasHomepage(false)
    setCanContact(false)
    setHasInstagram(false)
    setShowUnusable(false)
    setPage(1)
  }

  const activeFiltersCount = [
    selectedArea,
    selectedGenre,
    selectedAssignee,
    searchQuery,
    hasOriginalPhone,
    hasHomepage,
    canContact,
    hasInstagram,
    showUnusable
  ].filter(Boolean).length

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-[1600px] mx-auto p-4 lg:p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-800 mb-2">
            {t('restaurantCrmTitle')}
          </h1>
          <p className="text-slate-600">
            {t('restaurantCrmSubtitle')}
          </p>
        </div>

        {/* Prefecture Selector */}
        <div className="bg-white rounded-2xl shadow-sm border p-4 lg:p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800">{t('prefectureSelect')}</h2>
            {selectedPrefecture && (
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                {selectedPrefecture} {t('selected')}
              </span>
            )}
          </div>

          <div ref={prefectureDropdownRef} className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            {Object.entries(prefectures).map(([region, prefs]) => (
              <div key={region} className="relative">
                <button
                  onClick={() => setExpandedRegion(expandedRegion === region ? null : region)}
                  className={`
                    w-full px-3 py-2.5 rounded-lg text-sm font-medium
                    transition-all duration-200
                    ${prefs.includes(selectedPrefecture) 
                      ? 'bg-blue-600 text-white shadow-md' 
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}
                  `}
                >
                  <span className="block text-xs opacity-70">{REGION_LABELS[region] || region}</span>
                  <span className="flex items-center justify-center gap-1">
                    {region}
                    <ChevronDown className={`w-3 h-3 transition-transform ${expandedRegion === region ? 'rotate-180' : ''}`} />
                  </span>
                </button>
                
                {/* Prefecture Dropdown */}
                {expandedRegion === region && (
                  <div className="absolute z-20 top-full left-0 mt-1 bg-white rounded-lg shadow-xl border p-2 min-w-[160px] max-h-[300px] overflow-y-auto">
                    {prefs.map(pref => (
                      <button
                        key={pref}
                        onClick={() => handlePrefectureSelect(pref)}
                        className={`
                          w-full text-left px-3 py-2 rounded-md text-sm
                          transition-colors
                          ${selectedPrefecture === pref 
                            ? 'bg-blue-600 text-white' 
                            : 'hover:bg-slate-100'}
                        `}
                      >
                        {pref}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Stats & Filters */}
        {selectedPrefecture && (
          <>
            {/* Stats Bar */}
            {stats && (
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
                <div className="bg-white rounded-xl p-4 shadow-sm border">
                  <p className="text-2xl font-bold text-slate-800">{stats.total.toLocaleString()}</p>
                  <p className="text-xs text-slate-500">{t('all')}</p>
                </div>
                <div className="bg-orange-50 rounded-xl p-4 shadow-sm border border-orange-100">
                  <p className="text-2xl font-bold text-orange-600">{stats.with_original_phone.toLocaleString()}</p>
                  <p className="text-xs text-orange-600/70">📞 {t('withOriginalPhone')}</p>
                </div>
                <div className="bg-green-50 rounded-xl p-4 shadow-sm border border-green-100">
                  <p className="text-2xl font-bold text-green-600">{stats.with_homepage.toLocaleString()}</p>
                  <p className="text-xs text-green-600/70">🏠 {t('homepage')}</p>
                </div>
                <div className="bg-purple-50 rounded-xl p-4 shadow-sm border border-purple-100">
                  <p className="text-2xl font-bold text-purple-600">{stats.contactable.toLocaleString()}</p>
                  <p className="text-xs text-purple-600/70">📧 {t('canContact')}</p>
                </div>
                <div className="bg-pink-50 rounded-xl p-4 shadow-sm border border-pink-100">
                  <p className="text-2xl font-bold text-pink-600">{stats.with_instagram.toLocaleString()}</p>
                  <p className="text-xs text-pink-600/70">📷 {t('instagram')}</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-4 shadow-sm border border-blue-100">
                  <p className="text-2xl font-bold text-blue-600">{stats.status_new.toLocaleString()}</p>
                  <p className="text-xs text-blue-600/70">🆕 {t('statusNew')}</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-4 shadow-sm border border-emerald-100">
                  <p className="text-2xl font-bold text-emerald-600">{stats.status_contacted.toLocaleString()}</p>
                  <p className="text-xs text-emerald-600/70">✅ {t('statusInSales')}</p>
                </div>
              </div>
            )}

            {/* Filters */}
            <div className="bg-white rounded-2xl shadow-sm border p-4 lg:p-6 mb-6">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  {t('filter')}
                </h3>
                {activeFiltersCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
                  >
                    <X className="w-3 h-3" />
                    {t('clearFilters')} ({activeFiltersCount})
                  </button>
                )}
              </div>

              {/* Quick Filters */}
              <div className="flex flex-wrap gap-2 mb-4">
                <button
                  onClick={() => setHasOriginalPhone(!hasOriginalPhone)}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                    transition-all duration-200 border
                    ${hasOriginalPhone 
                      ? 'bg-orange-500 text-white border-orange-500 shadow-md' 
                      : 'bg-white text-slate-700 hover:bg-orange-50 border-slate-200'}
                  `}
                >
                  <Phone className="w-4 h-4" />
                  {t('phoneImportant')}
                </button>
                <button
                  onClick={() => setHasHomepage(!hasHomepage)}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                    transition-all duration-200 border
                    ${hasHomepage 
                      ? 'bg-green-500 text-white border-green-500 shadow-md' 
                      : 'bg-white text-slate-700 hover:bg-green-50 border-slate-200'}
                  `}
                >
                  <Globe className="w-4 h-4" />
                  {t('hasHomepage')}
                </button>
                <button
                  onClick={() => setCanContact(!canContact)}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                    transition-all duration-200 border
                    ${canContact 
                      ? 'bg-purple-500 text-white border-purple-500 shadow-md' 
                      : 'bg-white text-slate-700 hover:bg-purple-50 border-slate-200'}
                  `}
                >
                  <Mail className="w-4 h-4" />
                  📧 {t('canContact')}
                </button>
                <button
                  onClick={() => setHasInstagram(!hasInstagram)}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                    transition-all duration-200 border
                    ${hasInstagram 
                      ? 'bg-pink-500 text-white border-pink-500 shadow-md' 
                      : 'bg-white text-slate-700 hover:bg-pink-50 border-slate-200'}
                  `}
                >
                  <Instagram className="w-4 h-4" />
                  {t('hasInstagram')}
                </button>
                <button
                  onClick={() => setShowUnusable(!showUnusable)}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                    transition-all duration-200 border
                    ${showUnusable 
                      ? 'bg-red-500 text-white border-red-500 shadow-md' 
                      : 'bg-white text-slate-700 hover:bg-red-50 border-slate-200'}
                  `}
                >
                  <AlertTriangle className="w-4 h-4" />
                  {t('includeUnusable')}
                </button>
              </div>

              {/* Search & Dropdowns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder={t('searchStoreName')}
                    className="pl-10"
                  />
                </div>

                <select
                  value={selectedArea}
                  onChange={(e) => { setSelectedArea(e.target.value); setPage(1); }}
                  className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">{t('allAreas')}</option>
                  {areas.map(area => (
                    <option key={area} value={area}>{area}</option>
                  ))}
                </select>

                <select
                  value={selectedGenre}
                  onChange={(e) => { setSelectedGenre(e.target.value); setPage(1); }}
                  className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">{t('allGenres')}</option>
                  {genres.map(genre => (
                    <option key={genre} value={genre}>{genre}</option>
                  ))}
                </select>

                <select
                  value={selectedAssignee}
                  onChange={(e) => { setSelectedAssignee(e.target.value); setPage(1); }}
                  className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">{t('allAssignees')}</option>
                  <option value="none">{t('noAssignee')}</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>{user.name}</option>
                  ))}
                </select>

                <div className="flex gap-2">
                  <Button onClick={handleSearch} className="flex-1">
                    <Search className="w-4 h-4 mr-2" />
                    {t('search')}
                  </Button>
                  <Button onClick={handleRefresh} variant="outline">
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Results */}
            <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
              {/* Results Header */}
              <div className="flex items-center justify-between p-4 border-b bg-slate-50">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-slate-800">{t('searchResults')}</h3>
                  <span className="text-sm text-slate-500">{total.toLocaleString()}{t('items')}</span>
                </div>
                <div className="text-sm text-slate-500">
                  {t('page')} {page} / {totalPages}
                </div>
              </div>

              {/* Table */}
              {isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : restaurants.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                  <Search className="w-12 h-12 mb-4 opacity-30" />
                  <p>{selectedPrefecture ? t('noSearchResults') : t('selectPrefecture')}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 text-sm text-slate-600">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium">{t('storeName')}</th>
                        <th className="text-left px-4 py-3 font-medium">{t('phoneNumber')}</th>
                        <th className="text-center px-4 py-3 font-medium">{t('link')}</th>
                        <th className="text-center px-4 py-3 font-medium">{t('statusLabel')}</th>
                        <th className="text-center px-4 py-3 font-medium">{t('assignee')}</th>
                        <th className="text-center px-4 py-3 font-medium">{t('salesAction')}</th>
                        <th className="text-center px-4 py-3 font-medium w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {restaurants.map((restaurant) => (
                        <tr 
                          key={restaurant.id} 
                          className={`
                            hover:bg-slate-50 transition-colors
                            ${restaurant.is_unusable ? 'opacity-50 bg-red-50' : ''}
                          `}
                        >
                          {/* Name */}
                          <td className="px-4 py-3">
                            <div 
                              className="font-medium text-slate-800 truncate max-w-[200px] cursor-pointer hover:text-blue-600"
                              onClick={() => setSelectedRestaurantId(restaurant.id)}
                              title={restaurant.name}
                            >
                              {restaurant.name}
                            </div>
                            {restaurant.genres && restaurant.genres.length > 0 && (
                              <div className="text-xs text-slate-400 truncate max-w-[200px]">
                                {restaurant.genres.slice(0, 2).join(', ')}
                              </div>
                            )}
                          </td>

                          {/* Phone */}
                          <td className="px-4 py-3">
                            {restaurant.tel_original ? (
                              <button
                                onClick={() => copyToClipboard(restaurant.tel_original!)}
                                className="flex items-center gap-2 group"
                              >
                                <span className="px-2 py-0.5 bg-orange-500 text-white text-xs font-bold rounded">
                                  {t('important')}
                                </span>
                                <span className="font-mono text-sm group-hover:text-blue-600">
                                  {restaurant.tel_original}
                                </span>
                                <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 text-blue-600" />
                              </button>
                            ) : restaurant.tel_confirmed ? (
                              <button
                                onClick={() => copyToClipboard(restaurant.tel_confirmed!)}
                                className="flex items-center gap-2 group"
                              >
                                <span className="font-mono text-sm text-slate-600 group-hover:text-blue-600">
                                  {restaurant.tel_confirmed}
                                </span>
                                <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 text-blue-600" />
                              </button>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>

                          {/* Links */}
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-2">
                              {restaurant.homepage ? (
                                <a
                                  href={restaurant.homepage}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 rounded-full hover:bg-green-100 text-green-600"
                                  title="홈페이지"
                                >
                                  <Globe className="w-4 h-4" />
                                </a>
                              ) : (
                                <span className="p-1.5 text-slate-200">
                                  <Globe className="w-4 h-4" />
                                </span>
                              )}
                              {restaurant.instagram ? (
                                <a
                                  href={restaurant.instagram}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 rounded-full hover:bg-pink-100 text-pink-600"
                                  title="인스타그램"
                                >
                                  <Instagram className="w-4 h-4" />
                                </a>
                              ) : (
                                <span className="p-1.5 text-slate-200">
                                  <Instagram className="w-4 h-4" />
                                </span>
                              )}
                              {restaurant.hotpepper ? (
                                <a
                                  href={restaurant.hotpepper}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 rounded-full hover:bg-orange-100 text-orange-600"
                                  title="핫페퍼"
                                >
                                  <span className="text-sm">🌶️</span>
                                </a>
                              ) : (
                                <span className="p-1.5 text-slate-200 text-sm">🌶️</span>
                              )}
                              {restaurant.is_contactable && (
                                <span className="p-1.5 text-purple-600" title="문의 가능">
                                  <Mail className="w-4 h-4" />
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3 text-center">
                            <span className={`
                              inline-flex px-2 py-1 rounded-full text-xs font-medium
                              ${restaurant.status === 'new' ? 'bg-slate-100 text-slate-600' : ''}
                              ${restaurant.status === 'contacted' ? 'bg-blue-100 text-blue-700' : ''}
                              ${restaurant.status === 'contracted' ? 'bg-green-100 text-green-700' : ''}
                            `}>
                              {restaurant.status === 'new' && t('statusNew')}
                              {restaurant.status === 'contacted' && t('statusInSales')}
                              {restaurant.status === 'contracted' && t('statusContracted')}
                            </span>
                            {restaurant.activity_count > 0 && (
                              <span className="ml-1 text-xs text-slate-400">
                                ({restaurant.activity_count})
                              </span>
                            )}
                          </td>

                          {/* Assignee */}
                          <td className="px-4 py-3 text-center">
                            {restaurant.assignee_name ? (
                              <div className="flex items-center justify-center gap-1">
                                <Users className="w-3 h-3 text-slate-400" />
                                <span className="text-sm text-slate-600">{restaurant.assignee_name}</span>
                              </div>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>

                          {/* Sales Button */}
                          <td className="px-4 py-3 text-center">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSalesActivityTarget({ id: restaurant.id, name: restaurant.name })}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              {t('doSales')}
                            </Button>
                          </td>

                          {/* Detail */}
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => setSelectedRestaurantId(restaurant.id)}
                              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                            >
                              <ChevronRight className="w-4 h-4 text-slate-400" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 p-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    {t('previous')}
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number
                      if (totalPages <= 5) {
                        pageNum = i + 1
                      } else if (page <= 3) {
                        pageNum = i + 1
                      } else if (page >= totalPages - 2) {
                        pageNum = totalPages - 4 + i
                      } else {
                        pageNum = page - 2 + i
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          className={`
                            w-8 h-8 rounded-lg text-sm font-medium
                            ${page === pageNum 
                              ? 'bg-blue-600 text-white' 
                              : 'hover:bg-slate-100 text-slate-600'}
                          `}
                        >
                          {pageNum}
                        </button>
                      )
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    {t('next')}
                  </Button>
                </div>
              )}
            </div>
          </>
        )}

        {/* Empty State */}
        {!selectedPrefecture && (
          <div className="bg-white rounded-2xl shadow-sm border p-12 text-center">
            <div className="text-6xl mb-4">🗾</div>
            <h3 className="text-xl font-semibold text-slate-800 mb-2">
              {t('selectPrefecture')}
            </h3>
            <p className="text-slate-500">
              {t('selectPrefectureDesc')}
            </p>
          </div>
        )}
      </div>

      {/* Restaurant Drawer */}
      {selectedRestaurantId && (
        <RestaurantDrawer
          restaurantId={selectedRestaurantId}
          onClose={() => setSelectedRestaurantId(null)}
          onUpdate={handleRefresh}
        />
      )}

      {/* Sales Activity Modal */}
      {salesActivityTarget && (
        <SalesActivityModal
          restaurantId={salesActivityTarget.id}
          restaurantName={salesActivityTarget.name}
          onClose={() => setSalesActivityTarget(null)}
          onSuccess={handleRefresh}
        />
      )}
    </div>
  )
}
