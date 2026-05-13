// ERP 진입 시 모든 탭 데이터를 백그라운드에서 미리 fetch해 캐시에 채운다.
// 각 페이지의 useState 초기값이 캐시를 읽으므로, 사용자가 어떤 탭을 처음 클릭하든
// 빈 화면 깜빡임 없이 데이터가 즉시 표시된다.

import api from './api'
import { writeCache } from './erpCache'
import * as healthApi from '../pages/Erp/healthCheckupApi'
import * as eduApi from '../pages/Erp/educationApi'
import * as snackApi from '../pages/Erp/snackApi'

// 캐시 키와 타입은 페이지 컴포넌트와 동일해야 한다.
// 페이지가 캐시를 읽을 때 같은 키/형식이어야 hit 한다.

async function prefetchLeave(): Promise<void> {
  try {
    const [b, g, r] = await Promise.all([
      api.get('/vacation/balance'),
      api.get('/vacation/grants'),
      api.get('/vacation/requests'),
    ])
    writeCache('leave', '_', {
      balance: b.data,
      grants: g.data,
      requests: r.data,
    })
  } catch {
    /* silent — UI에서 다시 시도 */
  }
}

function ymdLocal(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

async function prefetchLeaveSchedule(): Promise<void> {
  try {
    const cursor = new Date()
    cursor.setDate(1)
    cursor.setHours(0, 0, 0, 0)
    const monthStart = new Date(cursor)
    const monthEnd = new Date(monthStart)
    monthEnd.setMonth(monthEnd.getMonth() + 1)
    monthEnd.setDate(0)
    monthEnd.setHours(23, 59, 59, 999)
    const startStr = ymdLocal(monthStart)
    const endStr = ymdLocal(monthEnd)
    const [s, h] = await Promise.all([
      api.get('/vacation/schedule', { params: { startDate: startStr, endDate: endStr } }),
      api.get('/vacation/holidays', { params: { startDate: startStr, endDate: endStr } }),
    ])
    writeCache('leaveSchedule', startStr, { items: s.data, holidays: h.data })
  } catch {}
}

async function prefetchHealthCheckup(isAdmin: boolean): Promise<void> {
  try {
    const key = isAdmin ? 'admin:submitted' : 'me'
    const tasks: Promise<any>[] = [healthApi.fetchMe(), healthApi.fetchMyHistory()]
    if (isAdmin) tasks.push(healthApi.fetchAdminList({ status: 'submitted' }))
    const results = await Promise.all(tasks)
    writeCache('healthCheckup', key, {
      me: results[0],
      history: results[1].items || [],
      vacationRecords: results[1].vacation_records || [],
      adminItems: isAdmin ? results[2].items || [] : [],
    })
  } catch {}
}

async function prefetchEducation(): Promise<void> {
  try {
    const year = new Date().getFullYear()
    const key = `${year}:all`
    const [st, hist] = await Promise.all([
      eduApi.fetchStats(year),
      eduApi.fetchMyHistory(),
    ])
    writeCache('education', key, { stats: st, items: hist.items })
  } catch {}
}

async function prefetchSnack(): Promise<void> {
  try {
    const [tw, st, fx, mh] = await Promise.all([
      snackApi.fetchThisWeek(),
      snackApi.fetchStats(),
      snackApi.fetchFixedList(),
      snackApi.fetchMyHistory(),
    ])
    writeCache('snack', 'current', {
      thisWeek: tw,
      myHistory: mh,
      stats: st,
      fixedList: fx.items,
    })
  } catch {}
}

export function prefetchAllErp(isAdmin: boolean): void {
  // 백그라운드로 던지고 await 안 함 — 첫 화면 렌더를 막지 않기 위함.
  void prefetchLeave()
  void prefetchLeaveSchedule()
  void prefetchHealthCheckup(isAdmin)
  void prefetchEducation()
  void prefetchSnack()
}
