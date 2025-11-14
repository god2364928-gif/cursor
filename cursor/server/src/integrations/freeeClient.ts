import dotenv from 'dotenv'
dotenv.config()

const FREEE_CLIENT_ID = process.env.FREEE_CLIENT_ID || '632732953685764'
const FREEE_CLIENT_SECRET = process.env.FREEE_CLIENT_SECRET || 'An9MEyDAacju9EyiLx3jZKeKpqC-aYdkhDGvwsGwHFoQmiwm6jeAVzJyuBo8ttJ0Dj0OOYboVjImkZLoLNeJeQ'
const FREEE_REDIRECT_URI = process.env.FREEE_REDIRECT_URI || 'urn:ietf:wg:oauth:2.0:oob'
const FREEE_API_BASE = 'https://api.freee.co.jp'
const FREEE_AUTH_BASE = 'https://accounts.secure.freee.co.jp'

// In-memory token storage (간단한 구현)
let accessToken: string | null = null
let refreshToken: string | null = null
let tokenExpiresAt: number | null = null

export interface FreeeInvoiceLineItem {
  name: string
  quantity: number
  unit_price: number
  tax: number
}

export interface FreeeInvoiceRequest {
  company_id: number
  partner_name: string
  partner_zipcode?: string
  partner_address?: string
  invoice_date: string
  due_date: string
  invoice_contents: FreeeInvoiceLineItem[]
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
    
    accessToken = data.access_token
    refreshToken = data.refresh_token
    tokenExpiresAt = Date.now() + (data.expires_in * 1000)
    
    console.log('✅ freee token obtained successfully')
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
  if (!refreshToken) {
    console.error('No refresh token available')
    return false
  }

  try {
    const url = `${FREEE_AUTH_BASE}/public_api/token`
    
    const params = new URLSearchParams()
    params.set('grant_type', 'refresh_token')
    params.set('client_id', FREEE_CLIENT_ID)
    params.set('client_secret', FREEE_CLIENT_SECRET)
    params.set('refresh_token', refreshToken)

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
    
    accessToken = data.access_token
    refreshToken = data.refresh_token
    tokenExpiresAt = Date.now() + (data.expires_in * 1000)
    
    console.log('✅ freee token refreshed successfully')
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
  if (!accessToken) {
    return null
  }

  // 토큰이 5분 이내에 만료되면 갱신
  if (tokenExpiresAt && tokenExpiresAt - Date.now() < 5 * 60 * 1000) {
    const refreshed = await refreshAccessToken()
    if (!refreshed) {
      return null
    }
  }

  return accessToken
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
  return callFreeeAPI('/api/1/invoices', {
    method: 'POST',
    body: JSON.stringify(invoiceData),
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
export function isAuthenticated(): boolean {
  return accessToken !== null && tokenExpiresAt !== null && tokenExpiresAt > Date.now()
}

