import dotenv from 'dotenv'
import { pool } from '../db'

dotenv.config()

const FREEE_CLIENT_ID = process.env.FREEE_CLIENT_ID || '632732953685764'
const FREEE_CLIENT_SECRET = process.env.FREEE_CLIENT_SECRET || 'An9MEyDAacju9EyiLx3jZKeKpqC-aYdkhDGvwsGwHFoQmiwm6jeAVzJyuBo8ttJ0Dj0OOYboVjImkZLoLNeJeQ'
const FREEE_REDIRECT_URI = process.env.FREEE_REDIRECT_URI || 'urn:ietf:wg:oauth:2.0:oob'
const FREEE_API_BASE = 'https://api.freee.co.jp'
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
  partner_name: string
  partner_title?: '御中' | '様' | ''
  invoice_title?: string
  invoice_date: string
  due_date: string
  tax_entry_method?: 'inclusive' | 'exclusive'
  invoice_contents: FreeeInvoiceLineItem[]
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
    throw new Error(`freee API error: ${response.status} ${text}`)
  }

  return response.json()
}

/**
 * 사업소 목록 조회
 */
export async function getCompanies(): Promise<any> {
  return callFreeeAPI('/api/1/companies')
}

/**
 * 청구서 생성
 */
export async function createInvoice(invoiceData: FreeeInvoiceRequest): Promise<any> {
  // freee API 형식으로 데이터 변환
  const freeePayload: any = {
    company_id: invoiceData.company_id,
    partner_name: invoiceData.partner_name + (invoiceData.partner_title || ''),
    invoice_date: invoiceData.invoice_date,
    due_date: invoiceData.due_date,
    invoice_contents: invoiceData.invoice_contents,
  }

  // 청구서 제목 추가
  if (invoiceData.invoice_title) {
    freeePayload.title = invoiceData.invoice_title
  }

  // 내세/외세 설정
  if (invoiceData.tax_entry_method) {
    freeePayload.tax_entry_method = invoiceData.tax_entry_method
  }

  // 송금처 정보 추가
  if (invoiceData.payment_bank_info) {
    freeePayload.payment_bank_info = invoiceData.payment_bank_info
  }

  return callFreeeAPI('/api/1/invoices', {
    method: 'POST',
    body: JSON.stringify(freeePayload),
  })
}

/**
 * 청구서 PDF 다운로드
 */
export async function downloadInvoicePdf(companyId: number, invoiceId: number): Promise<Buffer> {
  const token = await ensureValidToken()
  
  if (!token) {
    throw new Error('No valid access token. Please authenticate first.')
  }

  const url = `${FREEE_API_BASE}/api/1/invoices/${invoiceId}/download?company_id=${companyId}`
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`freee PDF download error: ${response.status} ${text}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

/**
 * 인증 상태 확인
 */
export async function isAuthenticated(): Promise<boolean> {
  // 캐시가 없으면 DB에서 로드
  if (!cachedToken) {
    await loadTokenFromDB()
  }
  
  return cachedToken !== null && cachedToken.expiresAt > Date.now()
}
