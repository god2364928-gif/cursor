import dotenv from 'dotenv'

dotenv.config()

const HOTPEPPER_API_KEY = process.env.HOTPEPPER_API_KEY || ''
const HOTPEPPER_API_BASE = 'http://webservice.recruit.co.jp/hotpepper/gourmet/v1'

export interface HotpepperSearchParams {
  keyword?: string        // キーワード検索
  large_area?: string     // 大エリアコード (e.g., Z011: 東京)
  middle_area?: string    // 中エリアコード
  lat?: number            // 緯度
  lng?: number            // 経度
  range?: 1 | 2 | 3 | 4 | 5  // 検索範囲 (1: 300m, 2: 500m, 3: 1000m, 4: 2000m, 5: 3000m)
  count?: number          // 取得件数 (default: 10, max: 100)
  start?: number          // 検索開始位置 (default: 1)
}

export interface HotpepperRestaurant {
  id: string              // HotPepper店舗ID
  name: string            // 店舗名
  name_kana?: string      // 店舗名カナ
  tel?: string            // 電話番号
  address: string         // 住所
  lat?: number            // 緯度
  lng?: number            // 経度
  genre?: {
    name: string
    catch: string
  }
  budget?: {
    average?: string      // 平均予算
    name?: string
    code?: string
  }
  catch: string           // キャッチコピー
  urls?: {
    pc?: string           // PC用URL
  }
  photo?: {
    pc?: {
      l?: string          // 写真URL (large)
      m?: string          // 写真URL (medium)
      s?: string          // 写真URL (small)
    }
    mobile?: {
      l?: string
      s?: string
    }
  }
  open?: string           // 営業時間
  close?: string          // 定休日
  parking?: string        // 駐車場
  capacity?: number       // 席数
  card?: string           // カード利用
  non_smoking?: string    // 禁煙・喫煙
  station_name?: string   // 最寄駅
  private_room?: string   // 個室
  coupon_urls?: {
    pc?: string
    sp?: string
  }
}

export interface HotpepperSearchResult {
  results: {
    api_version: string
    results_available: number  // 総検索数
    results_returned: number   // 返却数
    results_start: number      // 検索開始位置
    shop?: HotpepperRestaurant[]
  }
}

/**
 * HotPepper API で店舗を検索
 */
export async function searchRestaurants(params: HotpepperSearchParams): Promise<HotpepperSearchResult> {
  if (!HOTPEPPER_API_KEY) {
    throw new Error('HOTPEPPER_API_KEY is not configured')
  }

  const url = new URL(HOTPEPPER_API_BASE)
  
  // 必須パラメータ
  url.searchParams.set('key', HOTPEPPER_API_KEY)
  url.searchParams.set('format', 'json')
  
  // 検索条件
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
  
  // ページング
  url.searchParams.set('count', String(params.count || 100))  // デフォルト100件
  url.searchParams.set('start', String(params.start || 1))

  console.log(`🍜 Calling HotPepper API: ${url.toString().replace(HOTPEPPER_API_KEY, '***')}`)

  try {
    const response = await fetch(url.toString())

    if (!response.ok) {
      const text = await response.text()
      console.error(`❌ HotPepper API error: ${response.status}`, text)
      throw new Error(`HotPepper API error: ${response.status} ${text}`)
    }

    const data = await response.json() as HotpepperSearchResult
    
    const shopCount = data.results?.shop?.length || 0
    const totalAvailable = data.results?.results_available || 0
    
    console.log(`✅ HotPepper API response: ${shopCount} shops returned, ${totalAvailable} total available`)
    
    return data
  } catch (error: any) {
    console.error('HotPepper API call failed:', error)
    throw error
  }
}

/**
 * 主要エリアコード (参考用)
 */
export const AREA_CODES = {
  // 大エリアコード
  TOKYO: 'Z011',           // 東京
  OSAKA: 'Z014',           // 大阪
  KYOTO: 'Z015',           // 京都
  KOBE: 'Z016',            // 神戸
  NAGOYA: 'Z012',          // 名古屋
  FUKUOKA: 'Z092',         // 福岡
  SAPPORO: 'Z001',         // 札幌
  SENDAI: 'Z041',          // 仙台
  HIROSHIMA: 'Z081',       // 広島
  YOKOHAMA: 'Z021',        // 横浜
} as const

/**
 * 検索結果をデータベース用にフォーマット
 */
export function formatRestaurantForDB(
  shop: HotpepperRestaurant, 
  searchKeyword?: string, 
  searchArea?: string
) {
  return {
    hotpepper_id: shop.id,
    name: shop.name,
    tel: shop.tel || null,
    address: shop.address,
    budget_average: shop.budget?.average || shop.budget?.name || null,
    catch_phrase: shop.catch || null,
    shop_url: shop.urls?.pc || null,
    search_keyword: searchKeyword || null,
    search_area: searchArea || null,
  }
}

