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
    // 기존 토큰 삭제 후 새로 삽입
    await pool.query('DELETE FROM freee_tokens')
    await pool.query(
      'INSERT INTO freee_tokens (access_token, refresh_token, expires_at) VALUES ($1, $2, $3)',
      [accessToken, refreshToken, expiresAt]
    )
    
    // 캐시 업데이트
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
    })

    if (!response.ok) {
      console.error('Token refresh failed:', response.status)
      return false
    }

    const data: any = await response.json()
    
    const expiresAt = Date.now() + (data.expires_in * 1000)
    
    // DB에 저장
    await saveTokenToDB(data.access_token, data.refresh_token, expiresAt)
    
    console.log('✅ freee token refreshed and saved successfully')
    return true
  } catch (error) {
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

  // 토큰이 5분 이내에 만료되면 갱신
  if (cachedToken.expiresAt - Date.now() < 5 * 60 * 1000) {
    const refreshed = await refreshAccessToken()
    if (!refreshed) {
      return null
    }
  }

  return cachedToken.accessToken
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
  
  // 청구서 번호 자동 생성 (YYYYMMDDHHMM 형식, 한국시간 KST, 분까지만)
  const now = new Date()
  const kstOffset = 9 * 60 // KST는 UTC+9
  const kstTime = new Date(now.getTime() + kstOffset * 60 * 1000)
  const invoiceNumber = kstTime.toISOString().replace(/[-:T]/g, '').slice(0, 12) // YYYYMMDDHHmm
  
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
    tax_fraction: 'round',  // 필수: 세금 단수 처리 (round/floor/ceil)
    withholding_tax_entry_method: invoiceData.tax_entry_method === 'inclusive' ? 'in' : 'out',  // 필수: 원천징수 표시 방법 (tax_entry_method와 동일해야 함)
    lines: invoiceData.invoice_contents.map((item) => ({  // 필수: lines (invoice_contents 대신)
      description: item.name,
      quantity: String(item.quantity),  // 문자열로 변환
      unit_price: String(item.unit_price),  // 문자열로 변환
      tax_rate: item.tax_rate || 10,  // 세율 (0, 8, 10)
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
export async function downloadInvoicePdf(companyId: number, invoiceId: number, dueDateFromDb?: string, memoFromDb?: string, paymentBankInfoFromDb?: string, taxEntryMethodFromDb?: string): Promise<Buffer> {
  console.log(`📥 [downloadInvoicePdf] company_id=${companyId}, invoice_id=${invoiceId}, due_date=${dueDateFromDb}, memo=${memoFromDb ? 'present' : 'none'}, payment_info=${paymentBankInfoFromDb ? 'custom' : 'default'}, tax_entry_method=${taxEntryMethodFromDb}`)

  const token = await ensureValidToken()

  if (!token) {
    throw new Error('No valid access token. Please authenticate first.')
  }

  // 1단계: 청구서 상세 조회
  console.log(`📋 Step 1: Fetching invoice details...`)
  const detailUrl = `${FREEE_INVOICE_API_BASE}/invoices/${invoiceId}?company_id=${companyId}`
  
  const detailResponse = await fetch(detailUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!detailResponse.ok) {
    const errorText = await detailResponse.text()
    console.error(`❌ Failed to fetch invoice: ${detailResponse.status}`, errorText)
    throw new Error(`Failed to fetch invoice: ${detailResponse.status}`)
  }

  const data: any = await detailResponse.json()
  const invoice = data.invoice

  console.log(`📋 Invoice: ${invoice.invoice_number}`)

  // 2단계: 청구서 데이터로 직접 PDF 생성
  console.log(`📄 Step 2: Generating PDF from invoice data...`)

  try {
    // DB의 payment_bank_info 우선 사용, 없으면 기본값
    const defaultPaymentInfo = '三井住友銀行\nトランクＮＯＲＴＨ支店（403）\n普通　0122078\n(株) ホットセラー'
    const paymentInfo = paymentBankInfoFromDb || invoice.bank_account_to_transfer || defaultPaymentInfo
    
    console.log(`💳 Using payment info: ${paymentInfo.substring(0, 30)}...`)

    const pdfBuffer = await generateInvoicePdf({
      invoice_number: invoice.invoice_number,
      company_name: invoice.company_name || '株式会社ホットセラー',
      company_address: invoice.company_description || '〒104-0053\n東京都中央区晴海一丁目8番10号\n晴海アイランドトリトンスクエア\nオフィスタワーX棟8階',
      partner_name: invoice.partner_display_name || invoice.partner_name,
      partner_title: invoice.partner_title || '御中',
      billing_date: invoice.billing_date,
      due_date: dueDateFromDb || invoice.due_date,
      total_amount: invoice.total_amount,
      amount_tax: invoice.amount_tax,
      amount_excluding_tax: invoice.amount_excluding_tax || invoice.total_amount - invoice.amount_tax,
      lines: invoice.lines.map((line: any) => ({
        description: line.description,
        quantity: parseFloat(line.quantity),
        unit_price: parseFloat(line.unit_price),
        tax_rate: line.tax_rate,
      })),
      payment_bank_info: paymentInfo,  // DB의 payment_bank_info 사용
      invoice_registration_number: invoice.template?.invoice_registration_number || 'T5013301050765',
      memo: memoFromDb || '',  // DB의 memo 사용
      tax_entry_method: (taxEntryMethodFromDb === 'inclusive' ? 'inclusive' : 'exclusive') as 'inclusive' | 'exclusive',  // DB의 tax_entry_method 사용 (기본값: 외세)
      invoice_title: invoice.invoice_title || invoice.title,  // 件名 (freee 응답값, 없으면 PDF에서 기본 문구로 fallback)
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
