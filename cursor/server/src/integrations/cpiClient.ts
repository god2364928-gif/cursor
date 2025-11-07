import dotenv from 'dotenv'
dotenv.config()

type CpiRecord = {
  record_id: number
  username: string
  company: string | null
  phone_number: string | null
  created_at: string
  is_out: number
  is_contract: number
}

export interface FetchParams {
  startDate: string // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
  page?: number
  row?: number
  query?: string
  queryType?: number // 0: 이름, 1: 업체명, 2: 휴대폰 번호
}

const BASE = process.env.CPI_API_BASE || 'http://52.192.162.161'
const TOKEN = process.env.CPI_API_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiMCIsInVzZXJuYW1lIjoiXHVjNzc0XHVjOGZjXHVkNjA0IiwidXNlcl9wYXNzd29yZCI6IiQyYiQxMCQxMWduNjRxRGVZSGwyYks0U25Fb2tld2dnc0t5WXJ3bDRkT3Bac3RKMmRXNDdtUTUvUi8ydSIsInJvbGUiOiJBRE1JTiIsImFwcF91c2VyX2lkIjozNjksImV4cCI6MTc2ODQwNTgxOH0.cTNMLpenOeQls_33edHIDCXWuuJjMWywuph23nWYHF8'

export async function fetchFirstOutCalls(params: FetchParams): Promise<{ data: CpiRecord[]; total: number }> {
  // TOKEN이 항상 설정되도록 기본값 제공

  const url = new URL(`${BASE}/api/record`)
  url.searchParams.set('row', String(params.row ?? 100))
  url.searchParams.set('page', String(params.page ?? 1))
  url.searchParams.set('start_date', params.startDate)
  url.searchParams.set('end_date', params.endDate)
  // 첫콜(call_type=1) + OUT(is_out=1)만 수집
  url.searchParams.set('is_out', '1')
  url.searchParams.set('call_type', '1')
  if (params.query) {
    url.searchParams.set('query', params.query)
    url.searchParams.set('query_type', String(params.queryType ?? 0))
  }
  url.searchParams.set('sort', 'date-desc')

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json'
    }
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`CPI fetch failed: ${res.status} ${text}`)
  }

  const json: any = await res.json()
  const total = json?.results?.total_count ?? 0
  const data: CpiRecord[] = json?.results?.data ?? []
  return { data, total }
}


