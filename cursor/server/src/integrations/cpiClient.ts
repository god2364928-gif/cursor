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
}

const BASE = process.env.CPI_API_BASE || 'http://52.192.162.161'
const TOKEN = process.env.CPI_API_TOKEN || ''

export async function fetchFirstOutCalls(params: FetchParams): Promise<{ data: CpiRecord[]; total: number }> {
  if (!TOKEN) throw new Error('CPI_API_TOKEN is not set')

  const url = new URL(`${BASE}/api/record`)
  url.searchParams.set('row', String(params.row ?? 100))
  url.searchParams.set('page', String(params.page ?? 1))
  url.searchParams.set('start_date', params.startDate)
  url.searchParams.set('end_date', params.endDate)
  url.searchParams.append('call_type', '1') // 첫콜 OUT
  url.searchParams.set('is_out', '1') // 발신
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


