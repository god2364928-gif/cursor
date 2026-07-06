import dotenv from 'dotenv'
import { pool } from '../db'
import { generateInvoicePdf } from '../utils/pdfGenerator'

dotenv.config()

const FREEE_CLIENT_ID = process.env.FREEE_CLIENT_ID || '632732953685764'
const FREEE_CLIENT_SECRET = process.env.FREEE_CLIENT_SECRET || 'An9MEyDAacju9EyiLx3jZKeKpqC-aYdkhDGvwsGwHFoQmiwm6jeAVzJyuBo8ttJ0Dj0OOYboVjImkZLoLNeJeQ'
const FREEE_REDIRECT_URI = process.env.FREEE_REDIRECT_URI || 'urn:ietf:wg:oauth:2.0:oob'
const FREEE_API_BASE = 'https://api.freee.co.jp/api/1'  // freee会計 API
const FREEE_INVOICE_API_BASE = 'https://api.freee.co.jp/iv'  // freee請求書 API (수정: /invoice → /iv)
const FREEE_AUTH_BASE = 'https://accounts.secure.freee.co.jp'

// 메모리 캐시 (DB 조회 최소화)
let cachedToken: {
  accessToken: string
  refreshToken: string
  expiresAt: number
} | null = null

// 동시 갱신 직렬화 (single-flight): 여러 요청이 동시에 refresh를 호출해
// 서로의 회전 토큰을 무효화하지 않도록 진행 중인 갱신 프라미스를 공유
let refreshInFlight: Promise<boolean> | null = null

export interface FreeeInvoiceLineItem {
  name: string
  quantity: number
  unit_price: number
  tax: number
  tax_rate?: number  // 품목별 세율 (옵션)
}

export interface FreeeInvoiceRequest {
  company_id: number
  partner_id?: number  // 선택적: 기존 거래처 ID
  partner_name: string
  partner_title?: '御中' | '様' | ''
  invoice_title?: string
  invoice_date: string
  due_date: string
  tax_entry_method?: 'inclusive' | 'exclusive'
  invoice_contents: FreeeInvoiceLineItem[]
  payment_bank_info?: string
  memo?: string  // 추가: 비고
}

// 영수증 요청 인터페이스
export interface FreeeReceiptRequest {
  company_id: number
  partner_id?: number
  partner_name: string
  partner_title?: '御中' | '様' | ''
  receipt_title?: string
  issue_date: string  // 영수일 (사용자가 직접 입력)
  receipt_date: string  // 청구일과 동일
  tax_entry_method?: 'inclusive' | 'exclusive'
  receipt_contents: FreeeInvoiceLineItem[]
  payment_bank_info?: string
}

/**
 * DB에서 토큰 로드
 */
async function loadTokenFromDB(): Promise<boolean> {
  try {
    const result = await pool.query(
      'SELECT access_token, refresh_token, expires_at FROM freee_tokens ORDER BY id DESC LIMIT 1'
    )
    
    if (result.rows.length === 0) {
      return false
    }
    
    const row = result.rows[0]
    cachedToken = {
      accessToken: row.access_token,
      refreshToken: row.refresh_token,
      expiresAt: parseInt(row.expires_at),
    }
    
    console.log('✅ freee token loaded from DB')
    return true
  } catch (error) {
    console.error('Error loading token from DB:', error)
    return false
  }
}

/**
 * DB에 토큰 저장
 */
async function saveTokenToDB(accessToken: string, refreshToken: string, expiresAt: number): Promise<void> {
  try {
    // 기존 토큰 삭제 후 새로 삽입 — 단일 트랜잭션으로 원자성 보장
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query('DELETE FROM freee_tokens')
      await client.query(
        'INSERT INTO freee_tokens (access_token, refresh_token, expires_at) VALUES ($1, $2, $3)',
        [accessToken, refreshToken, expiresAt]
      )
      await client.query('COMMIT')
    } catch (e) {
      await client.query('ROLLBACK')
      throw e
    } finally {
      client.release()
    }

    // 캐시 업데이트 (커밋 후)
    cachedToken = { accessToken, refreshToken, expiresAt }

    console.log('✅ freee token saved to DB')
  } catch (error) {
    console.error('Error saving token to DB:', error)
    throw error
  }
}

/**
 * OAuth 인증 URL 생성
 */
export function getAuthorizationUrl(): string {
  const url = new URL(`${FREEE_AUTH_BASE}/public_api/authorize`)
  url.searchParams.set('client_id', FREEE_CLIENT_ID)
  url.searchParams.set('redirect_uri', FREEE_REDIRECT_URI)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('prompt', 'select_company')
  // freee会計 API 권한 (거래 생성에 필요)
  url.searchParams.set('scope', 'read write')
  
  console.log('🔗 Authorization URL:', url.toString())
  
  return url.toString()
}

/**
 * 인증 코드로 액세스 토큰 교환
 */
export async function exchangeCodeForToken(code: string): Promise<{ success: boolean; error?: string }> {
  try {
    const url = `${FREEE_AUTH_BASE}/public_api/token`
    
    const params = new URLSearchParams()
    params.set('grant_type', 'authorization_code')
    params.set('client_id', FREEE_CLIENT_ID)
    params.set('client_secret', FREEE_CLIENT_SECRET)
    params.set('code', code)
    params.set('redirect_uri', FREEE_REDIRECT_URI)

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
      signal: AbortSignal.timeout(15000),
    })

    if (!response.ok) {
      const text = await response.text()
      console.error('Token exchange failed:', response.status, text)
      return { success: false, error: `Token exchange failed: ${response.status}` }
    }

    const data: any = await response.json()
    
    const expiresAt = Date.now() + (data.expires_in * 1000)
    
    // DB에 저장
    await saveTokenToDB(data.access_token, data.refresh_token, expiresAt)
    
    console.log('✅ freee token obtained and saved successfully')
    return { success: true }
  } catch (error) {
    console.error('Token exchange error:', error)
    return { success: false, error: String(error) }
  }
}

/**
 * 토큰 갱신
 */
async function refreshAccessToken(): Promise<boolean> {
  if (!cachedToken) {
    console.error('No cached token available')
    return false
  }

  try {
    const url = `${FREEE_AUTH_BASE}/public_api/token`
    
    const params = new URLSearchParams()
    params.set('grant_type', 'refresh_token')
    params.set('client_id', FREEE_CLIENT_ID)
    params.set('client_secret', FREEE_CLIENT_SECRET)
    params.set('refresh_token', cachedToken.refreshToken)

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
      signal: AbortSignal.timeout(15000),
    })

    if (!response.ok) {
      const body = await response.text()
      console.error('Token refresh failed:', response.status, body)
      // 400/401 = invalid_grant (회전/만료된 refresh token) → 복구 불가, 죽은 토큰 제거
      if (response.status === 400 || response.status === 401) {
        cachedToken = null
        try {
          await pool.query('DELETE FROM freee_tokens')
        } catch (delErr) {
          console.error('Error clearing dead token from DB:', delErr)
        }
      }
      return false
    }

    const data: any = await response.json()

    const expiresAt = Date.now() + (data.expires_in * 1000)

    // DB에 저장
    await saveTokenToDB(data.access_token, data.refresh_token, expiresAt)

    console.log('✅ freee token refreshed and saved successfully')
    return true
  } catch (error) {
    // 5xx/네트워크/타임아웃 등 일시적 오류 — 토큰 유지, 재시도 가능
    console.error('Token refresh error:', error)
    return false
  }
}

/**
 * 유효한 액세스 토큰 확인 및 갱신
 */
async function ensureValidToken(): Promise<string | null> {
  // 캐시가 없으면 DB에서 로드
  if (!cachedToken) {
    const loaded = await loadTokenFromDB()
    if (!loaded) {
      return null
    }
  }

  // 토큰이 여전히 없으면 인증 필요
  if (!cachedToken) {
    return null
  }

  // 토큰이 5분 이내에 만료되면 갱신 (single-flight로 동시 갱신 직렬화)
  if (cachedToken.expiresAt - Date.now() < 5 * 60 * 1000) {
    let refreshed: boolean
    if (refreshInFlight) {
      refreshed = await refreshInFlight
    } else {
      try {
        refreshInFlight = refreshAccessToken()
        refreshed = await refreshInFlight
      } finally {
        refreshInFlight = null
      }
    }
    if (!refreshed || !cachedToken) {
      return null
    }
  }

  return cachedToken.accessToken
}

/**
 * 유효한 freee 토큰 반환 (인터페이스 계약 §5)
 * 토큰이 없거나 재인증이 필요하면 Error('FREEE_REAUTH_REQUIRED') throw
 */
export async function getValidFreeeToken(): Promise<string> {
  const t = await ensureValidToken()
  if (!t) throw new Error('FREEE_REAUTH_REQUIRED')
  return t
}

/**
 * freee API 호출 헬퍼
 */
async function callFreeeAPI(endpoint: string, options: RequestInit = {}): Promise<any> {
  const token = await ensureValidToken()
  
  if (!token) {
    throw new Error('No valid access token. Please authenticate first.')
  }

  const url = `${FREEE_API_BASE}${endpoint}`
  
  console.log(`🌐 Calling freee API: ${url}`)
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(15000),
  })

  if (!response.ok) {
    const text = await response.text()
    console.error(`❌ freee API error: ${response.status}`, text)
    throw new Error(`freee API error: ${response.status} ${text}`)
  }

  const data = await response.json()
  console.log('✅ freee API response:', JSON.stringify(data, null, 2))
  return data
}

/**
 * 사업소 목록 조회 (회계 API 사용)
 */
export async function getCompanies(): Promise<any> {
  // 회계 API를 사용하여 사업소 목록 조회
  const token = await ensureValidToken()
  
  if (!token) {
    throw new Error('No valid access token. Please authenticate first.')
  }

  const url = 'https://api.freee.co.jp/api/1/companies'
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(15000),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`freee API error: ${response.status} ${text}`)
  }

  return response.json()
}

/**
 * 청구서 템플릿 목록 조회 (freee請求書 API)
 */
export async function getInvoiceTemplates(companyId: number): Promise<any> {
  const token = await ensureValidToken()
  
  if (!token) {
    throw new Error('No valid access token. Please authenticate first.')
  }

  const url = `${FREEE_INVOICE_API_BASE}/invoices/templates?company_id=${companyId}`
  
  console.log(`📋 Fetching invoice templates from: ${url}`)
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(15000),
  })

  if (!response.ok) {
    const text = await response.text()
    console.error(`❌ Template fetch error: ${response.status}`, text)
    throw new Error(`freee API error: ${response.status} ${text}`)
  }

  const data = await response.json()
  console.log('✅ Templates fetched:', JSON.stringify(data, null, 2))
  return data
}

/**
 * 거래처 목록 조회 (freee会計 API)
 * 페이지네이션을 사용해서 모든 거래처를 가져옵니다
 */
export async function getPartners(companyId: number, keyword?: string): Promise<any> {
  const token = await ensureValidToken()
  
  if (!token) {
    throw new Error('No valid access token.')
  }

  let allPartners: any[] = []
  let offset = 0
  const limit = 100
  let hasMore = true

  // keyword가 있으면 페이지네이션 없이 한 번만 요청
  if (keyword) {
    const url = `${FREEE_API_BASE}/partners?company_id=${companyId}&limit=${limit}&keyword=${encodeURIComponent(keyword)}`
    console.log(`📋 Fetching partners from: ${url}`)
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(15000),
    })

    if (!response.ok) {
      const text = await response.text()
      console.error(`❌ Partners fetch error: ${response.status}`, text)
      throw new Error(`freee API error: ${response.status} ${text}`)
    }

    const data: any = await response.json()
    console.log(`✅ Partners fetched with keyword: ${data.partners?.length || 0} items`)
    return data
  }

  // keyword가 없으면 모든 거래처를 페이지네이션으로 가져오기
  console.log(`📋 Fetching all partners with pagination...`)
  
  while (hasMore) {
    const url = `${FREEE_API_BASE}/partners?company_id=${companyId}&limit=${limit}&offset=${offset}`
    console.log(`📋 Fetching page: offset=${offset}, limit=${limit}`)
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(15000),
    })

    if (!response.ok) {
      const text = await response.text()
      console.error(`❌ Partners fetch error: ${response.status}`, text)
      throw new Error(`freee API error: ${response.status} ${text}`)
    }

    const data: any = await response.json()
    const partners = data.partners || []
    
    allPartners = allPartners.concat(partners)
    
    console.log(`📋 Fetched ${partners.length} partners (total so far: ${allPartners.length})`)
    
    // 더 이상 데이터가 없으면 중단
    if (partners.length < limit) {
      hasMore = false
    } else {
      offset += limit
    }
  }
  
  console.log(`✅ All partners fetched: ${allPartners.length} items`)
  
  // 처음 5개와 마지막 5개 거래처 이름 출력 (디버깅용)
  if (allPartners.length > 0) {
    const firstFive = allPartners.slice(0, 5).map((p: any) => p.name).join(', ')
    const lastFive = allPartners.slice(-5).map((p: any) => p.name).join(', ')
    console.log(`📋 First 5 partners: ${firstFive}`)
    console.log(`📋 Last 5 partners: ${lastFive}`)
    
    // test1, test2 있는지 확인
    const testPartners = allPartners.filter((p: any) => 
      p.name.toLowerCase().includes('test')
    )
    if (testPartners.length > 0) {
      console.log(`🔍 Test partners found: ${testPartners.map((p: any) => p.name).join(', ')}`)
    } else {
      console.log(`⚠️ No test partners found in API response`)
    }
  }
  
  return { partners: allPartners }
}

/**
 * 거래처 생성 (freee会計 API)
 */
export async function createPartner(companyId: number, partnerName: string): Promise<any> {
  const token = await ensureValidToken()
  
  if (!token) {
    throw new Error('No valid access token.')
  }
  
  console.log(`📋 Creating partner: ${partnerName}`)
  
  // freee会計 API로 거래처 생성 (code 없이 - 자동 관리 설정 때문)
  const response = await fetch(`${FREEE_API_BASE}/partners`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      company_id: companyId,
      name: partnerName,
      // code는 보내지 않음 - freee가 자동으로 관리
    }),
    signal: AbortSignal.timeout(15000),
  })

  if (!response.ok) {
    const text = await response.text()
    console.error(`❌ Partner creation error: ${response.status}`, text)
    throw new Error(`Failed to create partner: ${response.status} ${text}`)
  }

  const data: any = await response.json()
  console.log(`✅ Partner created: ID=${data.partner.id}`)
  return data.partner
}

/**
 * 거래처 검색 또는 생성 (내부 사용)
 */
async function getOrCreatePartner(companyId: number, partnerName: string): Promise<number> {
  console.log(`🔍 Searching for existing partner: ${partnerName}`)
  
  try {
    // 1. 기존 거래처 검색 (keyword로 검색)
    const partnersData = await getPartners(companyId, partnerName)
    
    if (partnersData.partners && partnersData.partners.length > 0) {
      // 완전 일치하는 거래처 찾기 (대소문자 무시)
      const exactMatch = partnersData.partners.find((p: any) => 
        p.name.toLowerCase() === partnerName.toLowerCase()
      )
      
      if (exactMatch) {
        console.log(`✅ Found existing partner: ID=${exactMatch.id}, name=${exactMatch.name}`)
        return exactMatch.id
      }
      
      // 경칭 제외하고 비교 (御中, 様 등) - 대소문자 무시
      const partnerNameWithoutTitle = partnerName.replace(/[御中様]+$/, '').toLowerCase()
      const matchWithoutTitle = partnersData.partners.find((p: any) => {
        const pNameWithoutTitle = p.name.replace(/[御中様]+$/, '').toLowerCase()
        return pNameWithoutTitle === partnerNameWithoutTitle
      })
      
      if (matchWithoutTitle) {
        console.log(`✅ Found existing partner (without title): ID=${matchWithoutTitle.id}, name=${matchWithoutTitle.name}`)
        return matchWithoutTitle.id
      }
    }
    
    // 2. 없으면 새로 생성
    console.log(`📋 Partner not found, creating new: ${partnerName}`)
    const partner = await createPartner(companyId, partnerName)
    return partner.id
  } catch (error: any) {
    // 생성 시도 중 "이미 존재" 오류가 발생하면 다시 검색
    if (error.message.includes('既に使用されています') || error.message.includes('already')) {
      console.log(`⚠️ Partner creation failed (already exists), searching again...`)
      
      // 모든 거래처 목록 조회 (keyword 없이)
      const allPartnersData = await getPartners(companyId)
      
      if (allPartnersData.partners && allPartnersData.partners.length > 0) {
        // 완전 일치 검색 (대소문자 무시)
        const exactMatch = allPartnersData.partners.find((p: any) => 
          p.name.toLowerCase() === partnerName.toLowerCase()
        )
        if (exactMatch) {
          console.log(`✅ Found existing partner on retry: ID=${exactMatch.id}`)
          return exactMatch.id
        }
        
        // 경칭 제외하고 검색 (대소문자 무시)
        const partnerNameWithoutTitle = partnerName.replace(/[御中様]+$/, '').toLowerCase()
        const matchWithoutTitle = allPartnersData.partners.find((p: any) => {
          const pNameWithoutTitle = p.name.replace(/[御中様]+$/, '').toLowerCase()
          return pNameWithoutTitle === partnerNameWithoutTitle
        })
        
        if (matchWithoutTitle) {
          console.log(`✅ Found existing partner on retry (without title): ID=${matchWithoutTitle.id}`)
          return matchWithoutTitle.id
        }
      }
    }
    
    throw error
  }
}

/**
 * 청구書 생성 (freee請求書 API 사용)
 */
export async function createInvoice(invoiceData: FreeeInvoiceRequest): Promise<any> {
  const token = await ensureValidToken()
  
  if (!token) {
    throw new Error('No valid access token. Please authenticate first.')
  }

  // 1. 거래처 ID 확정 (선택된 partner_id 또는 신규 생성)
  let partnerId: number
  if (invoiceData.partner_id) {
    // 이미 선택된 거래처 ID 사용
    partnerId = invoiceData.partner_id
    console.log(`📋 Using existing partner ID: ${partnerId}`)
  } else {
    // 거래처 이름으로 신규 생성
    try {
      const partnerName = invoiceData.partner_name
      partnerId = await getOrCreatePartner(invoiceData.company_id, partnerName)
    } catch (error) {
      console.error('⚠️ Failed to create partner:', error)
      throw error
    }
  }

  // 2. 템플릿 조회
  let templateId: number | undefined
  try {
    const templates = await getInvoiceTemplates(invoiceData.company_id)
    if (templates && templates.templates && templates.templates.length > 0) {
      templateId = templates.templates[0].id  // 첫 번째 템플릿 사용
      console.log(`📋 Using template ID: ${templateId}`)
    }
  } catch (error) {
    console.error('⚠️ Failed to fetch templates, continuing without template_id:', error)
  }

  const partnerName = invoiceData.partner_name + (invoiceData.partner_title || '')
  
  // 청구서 번호 자동 생성 (YYYYMMDDHHMMSS 형식, 한국시간 KST, 초까지 — 분 단위 충돌 방지)
  const now = new Date()
  const kstOffset = 9 * 60 // KST는 UTC+9
  const kstTime = new Date(now.getTime() + kstOffset * 60 * 1000)
  const invoiceNumber = kstTime.toISOString().replace(/[-:T]/g, '').slice(0, 14) // YYYYMMDDHHMMSS
  
  // freee請求書 API 페이로드 (공식 스펙에 따라 필수 필드 포함)
  const freeePayload: any = {
    company_id: invoiceData.company_id,
    invoice_number: invoiceNumber,  // 필수: 청구서 번호
    partner_id: partnerId,  // 필수: 거래처 ID
    partner_name: partnerName,
    partner_title: invoiceData.partner_title || '御中',
    billing_date: invoiceData.invoice_date,  // 필수: 청구일
    due_date: invoiceData.due_date,
    tax_entry_method: invoiceData.tax_entry_method === 'inclusive' ? 'in' : 'out',  // 필수: in/out
    tax_fraction: 'floor',  // 필수: 세금 단수 처리 — 앱/PDF(현행 floor)와 통일
    withholding_tax_entry_method: invoiceData.tax_entry_method === 'inclusive' ? 'in' : 'out',  // 필수: 원천징수 표시 방법 (tax_entry_method와 동일해야 함)
    lines: invoiceData.invoice_contents.map((item) => ({  // 필수: lines (invoice_contents 대신)
      description: item.name,
      quantity: String(item.quantity),  // 문자열로 변환
      unit_price: String(item.unit_price),  // 문자열로 변환
      tax_rate: item.tax_rate ?? 10,  // 세율 (0, 8, 10) — 0% 라인 보존을 위해 ??
    })),
  }

  // 템플릿 ID가 있으면 추가
  if (templateId) {
    freeePayload.template_id = templateId
  }

  if (invoiceData.invoice_title) {
    freeePayload.invoice_title = invoiceData.invoice_title
  }
  
  if (invoiceData.payment_bank_info) {
    freeePayload.payment_bank_info = invoiceData.payment_bank_info
  }
  
  // memo는 freee API에 전달하지 않음 (PDF에만 표시)

  console.log('📤 Sending to freee請求書 API:', JSON.stringify(freeePayload, null, 2))

  const url = `${FREEE_INVOICE_API_BASE}/invoices`
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(freeePayload),
    signal: AbortSignal.timeout(15000),
  })

  if (!response.ok) {
    const text = await response.text()
    console.error(`❌ freee請求書 API error: ${response.status}`, text)
    throw new Error(`freee API error: ${response.status} ${text}`)
  }

  const data: any = await response.json()
  console.log('✅ freee請求書 API response:', JSON.stringify(data, null, 2))
  
  // freee請求書 API 응답 구조: { invoice: { ... } }
  return {
    success: true,
    invoice: data.invoice || data,  // invoice 객체가 있으면 사용, 없으면 data 자체
  }
}

/**
 * 청구서 PDF 다운로드 (freee請求書 API)
 * freee 請求書 API는 /reports/ 경로를 사용
 */
export async function downloadInvoicePdf(companyId: number, invoiceId: number, dueDateFromDb?: string, memoFromDb?: string, paymentBankInfoFromDb?: string, taxEntryMethodFromDb?: string, fallbackLines?: Array<{ description: string; quantity: number; unit_price: number; tax_rate: number }>, dbFallback?: { partner_name?: string; invoice_number?: string; billing_date?: string; total_amount?: number; amount_tax?: number }): Promise<Buffer> {
  console.log(`📥 [downloadInvoicePdf] company_id=${companyId}, invoice_id=${invoiceId}, due_date=${dueDateFromDb}, memo=${memoFromDb ? 'present' : 'none'}, payment_info=${paymentBankInfoFromDb ? 'custom' : 'default'}, tax_entry_method=${taxEntryMethodFromDb}`)

  // 1단계: freee 청구서 상세 조회.
  // PDF는 서버에서 로컬 생성(generateInvoicePdf)하므로 freee 조회는 "보강용"이다.
  // 조회가 실패(403/404/네트워크/토큰없음)해도 dbFallback이 있으면 죽지 않고 DB 값으로 PDF를 만든다.
  let invoice: any = null
  try {
    const token = await ensureValidToken()

    if (!token) {
      throw new Error('No valid access token. Please authenticate first.')
    }

    console.log(`📋 Step 1: Fetching invoice details...`)
    const detailUrl = `${FREEE_INVOICE_API_BASE}/invoices/${invoiceId}?company_id=${companyId}`

    const detailResponse = await fetch(detailUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      signal: AbortSignal.timeout(15000),
    })

    if (!detailResponse.ok) {
      const errorText = await detailResponse.text()
      console.error(`❌ Failed to fetch invoice: ${detailResponse.status}`, errorText)
      // errorText를 메시지에 포함 → 상위/로그에서 freee 실제 사유 확인 가능 (regex는 상태코드만 캡처)
      throw new Error(`Failed to fetch invoice: ${detailResponse.status} ${errorText}`)
    }

    const data: any = await detailResponse.json()
    invoice = data.invoice
    console.log(`📋 Invoice: ${invoice?.invoice_number}`)
  } catch (fetchErr: any) {
    // 폴백 정보가 없으면(예: 영수증 경로) 기존 동작 유지 — 상위 라우트가 상태코드로 매핑
    if (!dbFallback) {
      throw fetchErr
    }
    console.warn(`⚠️ [downloadInvoicePdf] freee 상세조회 실패 → DB 저장값으로 PDF 생성: ${fetchErr.message}`)
    invoice = null
  }

  // freee 상세조회에 lines가 있으면 그 값, 없으면 DB 저장 품목(fallbackLines)으로 폴백
  const rawLines = (invoice?.lines && invoice.lines.length > 0) ? invoice.lines : (fallbackLines ?? [])

  // 2단계: 청구서 데이터로 직접 PDF 생성
  console.log(`📄 Step 2: Generating PDF from invoice data...`)

  try {
    // DB의 payment_bank_info 우선 사용, 없으면 기본값
    const defaultPaymentInfo = '三井住友銀行\nトランクＮＯＲＴＨ支店（403）\n普通　0122078\n(株) ホットセラー'
    const paymentInfo = paymentBankInfoFromDb || invoice?.bank_account_to_transfer || defaultPaymentInfo

    console.log(`💳 Using payment info: ${paymentInfo.substring(0, 30)}...`)

    // freee 상세(invoice)가 있으면 그 값, 없으면(조회 실패) DB 저장값(dbFallback)을 사용
    const totalAmount = invoice ? invoice.total_amount : (dbFallback?.total_amount ?? 0)
    const amountTax = invoice ? invoice.amount_tax : (dbFallback?.amount_tax ?? 0)

    const pdfBuffer = await generateInvoicePdf({
      invoice_number: invoice ? invoice.invoice_number : (dbFallback?.invoice_number || ''),
      company_name: invoice?.company_name || '株式会社ホットセラー',
      company_address: invoice?.company_description || '〒104-0053\n東京都中央区晴海一丁目8番10号\n晴海アイランドトリトンスクエア\nオフィスタワーX棟8階',
      // DB partner_name에는 이미 敬称(御中 등)이 포함되어 저장되므로, 폴백 시 partner_title은 비워 중복 방지
      partner_name: invoice ? (invoice.partner_display_name || invoice.partner_name) : (dbFallback?.partner_name || ''),
      partner_title: invoice ? (invoice.partner_title || '御中') : '',
      billing_date: invoice ? invoice.billing_date : (dbFallback?.billing_date || ''),
      due_date: dueDateFromDb || invoice?.due_date || '',
      total_amount: totalAmount,
      amount_tax: amountTax,
      amount_excluding_tax: invoice?.amount_excluding_tax ?? (Number(totalAmount || 0) - Number(amountTax || 0)),
      lines: rawLines.map((l: any) => ({
        description: String(l.description ?? ''),
        quantity: Number(l.quantity) || 0,
        unit_price: Number(l.unit_price) || 0,
        tax_rate: Number(l.tax_rate) || 10,
      })),
      payment_bank_info: paymentInfo,  // DB의 payment_bank_info 사용
      invoice_registration_number: invoice?.template?.invoice_registration_number || 'T5013301050765',
      memo: memoFromDb || '',  // DB의 memo 사용
      tax_entry_method: (taxEntryMethodFromDb === 'inclusive' ? 'inclusive' : 'exclusive') as 'inclusive' | 'exclusive',  // DB의 tax_entry_method 사용 (기본값: 외세)
      invoice_title: invoice?.invoice_title || invoice?.title,  // 件名 (freee 응답값, 없으면 PDF에서 기본 문구로 fallback)
    })

    console.log(`✅ PDF generated successfully: ${pdfBuffer.length} bytes`)
    return pdfBuffer
  } catch (error: any) {
    console.error(`❌ PDF generation failed:`, error)
    throw new Error(`Failed to generate PDF: ${error.message}`)
  }
}

/**
 * 인증 상태 확인
 */
export async function isAuthenticated(): Promise<boolean> {
  // 캐시가 없으면 DB에서 로드
  if (!cachedToken) {
    const loaded = await loadTokenFromDB()
    if (!loaded) {
      return false
    }
  }
  
  // 토큰이 없으면 인증 필요
  if (!cachedToken) {
    return false
  }
  
  // 토큰이 이미 만료되었거나 5분 이내에 만료되면 갱신 시도
  if (cachedToken.expiresAt - Date.now() < 5 * 60 * 1000) {
    console.log('🔄 Token expired or expiring soon, attempting refresh...')
    const refreshed = await refreshAccessToken()
    
    if (!refreshed) {
      console.log('❌ Token refresh failed, re-authentication required')
      return false
    }
    
    console.log('✅ Token refreshed successfully')
  }
  
  return cachedToken !== null && cachedToken.expiresAt > Date.now()
}

/**
 * 캐시 초기화 (재인증 시 사용)
 */
export function clearTokenCache(): void {
  cachedToken = null
  console.log('🗑️ Token cache cleared')
}

/**
 * 영수증 생성 (freee請求書 API - 청구서를 영수증으로 생성)
 * freee에는 별도의 영수증 API가 없으므로 청구서(invoice)를 "領収書" 타이틀로 생성
 */
export async function createReceipt(receiptData: FreeeReceiptRequest): Promise<any> {
  const token = await ensureValidToken()
  
  if (!token) {
    throw new Error('No valid access token. Please authenticate first.')
  }

  // 1. 거래처 ID 확정
  let partnerId: number
  if (receiptData.partner_id) {
    partnerId = receiptData.partner_id
    console.log(`📋 Using existing partner ID: ${partnerId}`)
  } else {
    const partnerName = receiptData.partner_name
    partnerId = await getOrCreatePartner(receiptData.company_id, partnerName)
  }

  // 2. 템플릿 조회
  let templateId: number | undefined
  try {
    const templates = await getInvoiceTemplates(receiptData.company_id)
    if (templates && templates.templates && templates.templates.length > 0) {
      templateId = templates.templates[0].id
      console.log(`📋 Using template ID: ${templateId}`)
    }
  } catch (error) {
    console.error('⚠️ Failed to fetch templates, continuing without template_id:', error)
  }

  const partnerName = receiptData.partner_name + (receiptData.partner_title || '')
  
  // 영수증 번호 자동 생성 (YYYYMMDDHHMM 형식, 한국시간 KST, 분까지만)
  const now = new Date()
  const kstOffset = 9 * 60
  const kstTime = new Date(now.getTime() + kstOffset * 60 * 1000)
  const receiptNumber = kstTime.toISOString().replace(/[-:T]/g, '').slice(0, 12)
  
  // freee請求書 API 페이로드 (청구서를 영수증으로 생성)
  const freeePayload: any = {
    company_id: receiptData.company_id,
    invoice_number: receiptNumber,  // 청구서 번호 (필수)
    partner_id: partnerId,
    partner_name: partnerName,
    partner_title: receiptData.partner_title || '御中',
    billing_date: receiptData.issue_date,  // 영수일을 청구일로 사용
    due_date: receiptData.issue_date,  // 영수증은 지불일과 동일
    tax_entry_method: receiptData.tax_entry_method === 'inclusive' ? 'in' : 'out',
    tax_fraction: 'round',
    withholding_tax_entry_method: receiptData.tax_entry_method === 'inclusive' ? 'in' : 'out',
    lines: receiptData.receipt_contents.map((item) => ({
      description: item.name,
      quantity: String(item.quantity),
      unit_price: String(item.unit_price),
      tax_rate: item.tax_rate || 10,
    })),
  }

  if (templateId) {
    freeePayload.template_id = templateId
  }

  // 영수증 타이틀 설정
  if (receiptData.receipt_title) {
    freeePayload.invoice_title = receiptData.receipt_title  // invoice_title로 설정
  }
  
  if (receiptData.payment_bank_info) {
    freeePayload.payment_bank_info = receiptData.payment_bank_info
  }

  console.log('📤 Sending to freee請求書 API (as receipt):', JSON.stringify(freeePayload, null, 2))

  // 청구서 엔드포인트 사용
  const url = `${FREEE_INVOICE_API_BASE}/invoices`
  console.log('📍 API URL:', url)
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(freeePayload),
    signal: AbortSignal.timeout(15000),
  })

  if (!response.ok) {
    const text = await response.text()
    console.error(`❌ freee請求書 API error: ${response.status}`, text)
    throw new Error(`freee Invoice API error: ${response.status} ${text}`)
  }

  const data: any = await response.json()
  console.log('✅ freee請求書 API response (receipt as invoice):', JSON.stringify(data, null, 2))
  
  return {
    success: true,
    receipt: data.invoice || data,  // invoice 객체를 receipt로 반환
  }
}

/**
 * 영수증 PDF 다운로드 (청구서 API 사용)
 */
export async function downloadReceiptPdf(companyId: number, receiptId: number): Promise<Buffer> {
  // 영수증은 청구서로 저장되므로, downloadInvoicePdf와 동일한 로직 사용
  return downloadInvoicePdf(companyId, receiptId)
}

// ============================================================
// 経費申請・精算 (expense reimbursement) — freee会計 API 확장 (design §3)
// ============================================================

// 기본 사업소 id 캐시 (모듈 레벨, DB/API 조회 최소화)
let cachedDefaultCompanyId: number | null = null

/**
 * 기본 사업소 id — 캐시. env FREEE_COMPANY_ID 우선, 없으면 GET /companies 첫 사업소
 */
export async function getDefaultCompanyId(): Promise<number> {
  if (cachedDefaultCompanyId !== null) {
    return cachedDefaultCompanyId
  }

  // env 지정이 있으면 우선 사용
  const envCompanyId = process.env.FREEE_COMPANY_ID
  if (envCompanyId) {
    const parsed = parseInt(envCompanyId, 10)
    if (!Number.isNaN(parsed)) {
      cachedDefaultCompanyId = parsed
      console.log(`✅ freee default company id (env): ${parsed}`)
      return parsed
    }
  }

  const token = await ensureValidToken()

  if (!token) {
    throw new Error('No valid access token. Please authenticate first.')
  }

  const url = `${FREEE_API_BASE}/companies`
  console.log(`🌐 Fetching default company id: ${url}`)

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(15000),
  })

  if (!response.ok) {
    const text = await response.text()
    console.error(`❌ freee API error: ${response.status}`, text)
    throw new Error(`freee API error: ${response.status} ${text}`)
  }

  const data: any = await response.json()
  const companies = data.companies || []

  if (companies.length === 0) {
    throw new Error('freee API error: no companies found')
  }

  const companyId = companies[0].id as number
  cachedDefaultCompanyId = companyId
  console.log(`✅ freee default company id: ${companyId}`)
  return companyId
}

/**
 * 파일박스 영수증 업로드 (멀티파트) → { id, status }
 * POST /api/1/receipts  (company_id, receipt=file, description?)
 * Content-Type 미지정 — undici가 multipart boundary 설정
 */
export async function uploadReceiptToFileBox(
  companyId: number,
  file: { buffer: Buffer; filename: string; mimeType: string },
  opts?: { description?: string }
): Promise<{ id: number; status: string }> {
  const token = await ensureValidToken()

  if (!token) {
    throw new Error('No valid access token. Please authenticate first.')
  }

  console.log(`📤 Uploading receipt to freee file box: ${file.filename} (${file.mimeType})`)

  const fd = new FormData()  // undici global (Node18+)
  fd.append('company_id', String(companyId))
  fd.append('receipt', new Blob([file.buffer], { type: file.mimeType }), file.filename)
  if (opts?.description) {
    fd.append('description', opts.description)
  }

  const response = await fetch(`${FREEE_API_BASE}/receipts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      // Content-Type 미지정 — undici가 boundary 포함 multipart 헤더 설정
    },
    body: fd,
    signal: AbortSignal.timeout(15000),
  })

  if (!response.ok) {
    const text = await response.text()
    console.error(`❌ freee API error: ${response.status}`, text)
    throw new Error(`freee API error: ${response.status} ${text}`)
  }

  const data: any = await response.json()
  const receipt = data.receipt || {}
  console.log(`✅ Receipt uploaded: id=${receipt.id}, status=${receipt.status}`)
  return { id: receipt.id, status: receipt.status }
}

/**
 * 영수증 단건 조회 (OCR 결과 폴링용)
 * GET /api/1/receipts/{id}?company_id=
 */
export async function getReceipt(
  companyId: number,
  receiptId: number
): Promise<{
  id: number
  status: string
  mime_type: string
  receipt_metadatum?: { partner_name?: string; issue_date?: string; amount?: number }
  invoice_registration_number?: string
  qualified_invoice?: string
}> {
  const token = await ensureValidToken()

  if (!token) {
    throw new Error('No valid access token. Please authenticate first.')
  }

  const url = `${FREEE_API_BASE}/receipts/${receiptId}?company_id=${companyId}`
  console.log(`🌐 Fetching receipt: ${url}`)

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(15000),
  })

  if (!response.ok) {
    const text = await response.text()
    console.error(`❌ freee API error: ${response.status}`, text)
    throw new Error(`freee API error: ${response.status} ${text}`)
  }

  const data: any = await response.json()
  // freee returns { receipt: {...} }
  const receipt = data.receipt || data
  console.log(`✅ Receipt fetched: id=${receipt.id}, status=${receipt.status}`)
  return receipt
}

/**
 * 勘定科目 목록 (매핑 마스터용)
 * GET /api/1/account_items?company_id=
 */
export async function getAccountItems(
  companyId: number
): Promise<Array<{ id: number; name: string }>> {
  const token = await ensureValidToken()

  if (!token) {
    throw new Error('No valid access token. Please authenticate first.')
  }

  const url = `${FREEE_API_BASE}/account_items?company_id=${companyId}`
  console.log(`🌐 Fetching account items: ${url}`)

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(15000),
  })

  if (!response.ok) {
    const text = await response.text()
    console.error(`❌ freee API error: ${response.status}`, text)
    throw new Error(`freee API error: ${response.status} ${text}`)
  }

  const data: any = await response.json()
  const accountItems = data.account_items || []
  console.log(`✅ Account items fetched: ${accountItems.length} items`)
  return accountItems.map((item: any) => ({ id: item.id, name: item.name }))
}

/**
 * 会社別 税区分 목록 (経過措置/軽減 display_category 포함)
 * GET /api/1/taxes/companies/{companyId}
 */
export async function getCompanyTaxes(
  companyId: number
): Promise<Array<{ code: number; name: string; display_category: string; available: boolean }>> {
  const token = await ensureValidToken()

  if (!token) {
    throw new Error('No valid access token. Please authenticate first.')
  }

  const url = `${FREEE_API_BASE}/taxes/companies/${companyId}`
  console.log(`🌐 Fetching company taxes: ${url}`)

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(15000),
  })

  if (!response.ok) {
    const text = await response.text()
    console.error(`❌ freee API error: ${response.status}`, text)
    throw new Error(`freee API error: ${response.status} ${text}`)
  }

  const data: any = await response.json()
  // freee returns { taxes: [...] } or an array — handle both defensively
  const taxes = Array.isArray(data) ? data : (data.taxes || [])
  console.log(`✅ Company taxes fetched: ${taxes.length} items`)
  return taxes.map((tax: any) => ({
    code: tax.code,
    name: tax.name,
    display_category: tax.display_category,
    available: tax.available,
  }))
}

/**
 * 経費 取引 생성 (영수증 첨부) → { id }
 * POST /api/1/deals  { company_id, issue_date, type:'expense', partner_id?, details:[...], receipt_ids:[...] }
 */
export async function createExpenseDeal(params: {
  companyId: number
  issueDate: string
  partnerId?: number
  details: Array<{ accountItemId: number; taxCode: number; amount: number; description?: string }>
  receiptIds: number[]
}): Promise<{ id: number }> {
  const token = await ensureValidToken()

  if (!token) {
    throw new Error('No valid access token. Please authenticate first.')
  }

  const body: any = {
    company_id: params.companyId,
    issue_date: params.issueDate,
    type: 'expense',
    details: params.details.map((d) => {
      const detail: any = {
        account_item_id: d.accountItemId,
        tax_code: d.taxCode,
        amount: d.amount,
      }
      if (d.description) {
        detail.description = d.description
      }
      return detail
    }),
    receipt_ids: params.receiptIds,
  }

  if (params.partnerId) {
    body.partner_id = params.partnerId
  }

  console.log('📤 Creating expense deal:', JSON.stringify(body, null, 2))

  const response = await fetch(`${FREEE_API_BASE}/deals`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  })

  if (!response.ok) {
    const text = await response.text()
    console.error(`❌ freee API error: ${response.status}`, text)
    throw new Error(`freee API error: ${response.status} ${text}`)
  }

  const data: any = await response.json()
  const dealId = data.deal.id as number
  console.log(`✅ Expense deal created: id=${dealId}`)
  return { id: dealId }
}
