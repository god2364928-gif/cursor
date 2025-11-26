import dotenv from 'dotenv'

dotenv.config()

const RECRUIT_API_KEY = process.env.HOTPEPPER_API_KEY || process.env.RECRUIT_API_KEY || ''

// API 타입 정의
export type RecruitAPIType = 'gourmet' | 'beauty' | 'hotel' | 'golf'

// API 설정
const API_CONFIG = {
  gourmet: {
    baseUrl: 'https://webservice.recruit.co.jp/hotpepper/gourmet/v1/',
    dataKey: 'shop',
    enabled: true,
  },
  beauty: {
    baseUrl: 'https://webservice.recruit.co.jp/beauty/salon/v1/',
    dataKey: 'salon',
    enabled: false, // 엔드포인트 확인 필요
  },
  hotel: {
    baseUrl: 'https://webservice.recruit.co.jp/jalan/hotel/v1/',
    dataKey: 'hotel',
    enabled: false, // 엔드포인트 확인 필요
  },
  golf: {
    baseUrl: 'https://webservice.recruit.co.jp/jalan/golf/v1/',
    dataKey: 'golf',
    enabled: false, // 엔드포인트 확인 필요
  },
} as const

// 공통 검색 파라미터
export interface RecruitSearchParams {
  apiType: RecruitAPIType
  keyword?: string
  large_area?: string
  middle_area?: string
  lat?: number
  lng?: number
  range?: 1 | 2 | 3 | 4 | 5
  count?: number
  start?: number
}

// 공통 장소 인터페이스 (모든 API의 응답을 정규화)
export interface RecruitPlace {
  id: string
  name: string
  tel?: string
  address: string
  lat?: number
  lng?: number
  genre?: string
  category?: string
  budget?: string
  catch?: string
  urls?: {
    pc?: string
  }
  photo?: {
    pc?: {
      l?: string
      m?: string
      s?: string
    }
  }
  open?: string
  close?: string
  parking?: string
  capacity?: number
  card?: string
  raw?: any  // 원본 데이터
}

export interface RecruitSearchResult {
  results: {
    api_version?: string
    results_available: number
    results_returned: number
    results_start: number
    data?: RecruitPlace[]
  }
}

/**
 * 통합 검색 함수
 */
export async function searchRecruit(params: RecruitSearchParams): Promise<RecruitSearchResult> {
  if (!RECRUIT_API_KEY) {
    throw new Error('RECRUIT_API_KEY is not configured')
  }

  const config = API_CONFIG[params.apiType]
  
  if (!config.enabled) {
    throw new Error(`${params.apiType} API is not available yet. Only 'gourmet' is currently supported.`)
  }

  const url = new URL(config.baseUrl)
  
  // 필수 파라미터
  url.searchParams.set('key', RECRUIT_API_KEY)
  url.searchParams.set('format', 'json')
  
  // 검색 조건
  if (params.keyword) {
    url.searchParams.set('keyword', params.keyword)
  }
  if (params.large_area) {
    url.searchParams.set('large_area', params.large_area)
  }
  if (params.middle_area) {
    url.searchParams.set('middle_area', params.middle_area)
  }
  if (params.lat !== undefined) {
    url.searchParams.set('lat', String(params.lat))
  }
  if (params.lng !== undefined) {
    url.searchParams.set('lng', String(params.lng))
  }
  if (params.range) {
    url.searchParams.set('range', String(params.range))
  }
  
  // 페이징
  url.searchParams.set('count', String(params.count || 100))
  url.searchParams.set('start', String(params.start || 1))

  console.log(`🔍 Calling Recruit ${params.apiType} API: ${url.toString().replace(RECRUIT_API_KEY, '***')}`)

  try {
    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
    })

    if (!response.ok) {
      const text = await response.text()
      console.error(`❌ Recruit API error: ${response.status}`, text.substring(0, 200))
      throw new Error(`Recruit API error: ${response.status}`)
    }

    const data: any = await response.json()
    
    // 데이터 정규화
    const dataKey = config.dataKey
    const rawItems = data.results?.[dataKey] || []
    
    const normalizedData = rawItems.map((item: any) => 
      normalizeItem(item, params.apiType)
    )
    
    const result: RecruitSearchResult = {
      results: {
        api_version: data.results?.api_version,
        results_available: data.results?.results_available || 0,
        results_returned: data.results?.results_returned || 0,
        results_start: data.results?.results_start || 1,
        data: normalizedData,
      }
    }
    
    console.log(`✅ Recruit API response: ${normalizedData.length} items returned, ${result.results.results_available} total available`)
    
    return result
  } catch (error: any) {
    console.error('Recruit API call failed:', error)
    throw error
  }
}

/**
 * API별 응답 데이터 정규화
 */
function normalizeItem(item: any, apiType: RecruitAPIType): RecruitPlace {
  switch (apiType) {
    case 'gourmet':
      return {
        id: item.id,
        name: item.name,
        tel: item.tel || item.mobile,
        address: item.address,
        lat: item.lat ? parseFloat(item.lat) : undefined,
        lng: item.lng ? parseFloat(item.lng) : undefined,
        genre: item.genre?.name,
        category: item.genre?.catch,
        budget: item.budget?.average || item.budget?.name,
        catch: item.catch,
        urls: { pc: item.urls?.pc },
        photo: {
          pc: {
            l: item.photo?.pc?.l,
            m: item.photo?.pc?.m,
            s: item.photo?.pc?.s,
          }
        },
        open: item.open,
        close: item.close,
        parking: item.parking,
        capacity: item.capacity,
        card: item.card,
        raw: item,
      }
    
    case 'beauty':
      // Beauty API 응답 형식 (나중에 추가)
      return {
        id: item.id,
        name: item.name || item.salon_name,
        tel: item.tel,
        address: item.address,
        lat: item.lat,
        lng: item.lng,
        genre: item.middle_area?.name,
        category: item.service_name,
        budget: item.budget,
        catch: item.catch,
        urls: { pc: item.urls?.pc },
        raw: item,
      }
    
    case 'hotel':
      // Jalan Hotel API 응답 형식 (나중에 추가)
      return {
        id: item.id,
        name: item.hotel_name || item.name,
        tel: item.tel,
        address: item.address,
        lat: item.lat,
        lng: item.lng,
        budget: item.room_price,
        catch: item.catch_copy,
        urls: { pc: item.hotel_url },
        raw: item,
      }
    
    case 'golf':
      // Golf API 응답 형식 (나중에 추가)
      return {
        id: item.id,
        name: item.golf_name || item.name,
        tel: item.tel,
        address: item.address,
        catch: item.caption,
        urls: { pc: item.golf_url },
        raw: item,
      }
    
    default:
      return {
        id: item.id,
        name: item.name,
        address: item.address || '',
        raw: item,
      }
  }
}

/**
 * 지역 코드 (모든 API 공통)
 */
export const AREA_CODES = {
  // 大エリアコード (HotPepper 기준)
  TOKYO: 'Z011',
  OSAKA: 'Z014',
  KYOTO: 'Z015',
  KOBE: 'Z016',
  NAGOYA: 'Z012',
  FUKUOKA: 'Z092',
  SAPPORO: 'Z001',
  SENDAI: 'Z041',
  HIROSHIMA: 'Z081',
  YOKOHAMA: 'Z021',
} as const

/**
 * API별 카테고리 목록
 */
export const CATEGORIES = {
  gourmet: [],  // 장르는 자동 분류
  beauty: [
    { code: 'hair', name: 'ヘアサロン', name_ko: '헤어 살롱' },
    { code: 'nail', name: 'ネイル', name_ko: '네일' },
    { code: 'eyelash', name: 'まつげ', name_ko: '속눈썹' },
    { code: 'esthe', name: 'エステ', name_ko: '에스테틱' },
    { code: 'relaxation', name: 'リラクゼーション', name_ko: '릴랙세이션' },
  ],
  hotel: [
    { code: 'hotel', name: 'ホテル', name_ko: '호텔' },
    { code: 'ryokan', name: '旅館', name_ko: '료칸' },
    { code: 'onsen', name: '温泉', name_ko: '온천' },
  ],
  golf: [],  // 카테고리 없음
} as const

/**
 * 데이터베이스 저장용 포맷
 */
export function formatPlaceForDB(
  place: RecruitPlace,
  apiType: RecruitAPIType,
  searchKeyword?: string,
  searchArea?: string
) {
  return {
    recruit_id: place.id,
    api_type: apiType,
    name: place.name,
    tel: place.tel || null,
    address: place.address,
    latitude: place.lat || null,
    longitude: place.lng || null,
    genre: place.genre || null,
    category: place.category || null,
    budget_average: place.budget || null,
    catch_phrase: place.catch || null,
    shop_url: place.urls?.pc || null,
    image_url: place.photo?.pc?.l || place.photo?.pc?.m || null,
    business_hours: place.open || null,
    holiday: place.close || null,
    parking: place.parking || null,
    capacity: place.capacity || null,
    card_accepted: place.card || null,
    search_keyword: searchKeyword || null,
    search_area: searchArea || null,
  }
}

/**
 * API 활성화 상태 확인
 */
export function getAvailableAPIs(): RecruitAPIType[] {
  return Object.entries(API_CONFIG)
    .filter(([_, config]) => config.enabled)
    .map(([type, _]) => type as RecruitAPIType)
}

/**
 * 특정 API 사용 가능 여부 확인
 */
export function isAPIAvailable(apiType: RecruitAPIType): boolean {
  return API_CONFIG[apiType]?.enabled || false
}

