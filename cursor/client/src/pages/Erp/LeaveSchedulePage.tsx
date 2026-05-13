import { useEffect, useState, useCallback, useMemo } from 'react'
import api from '../../lib/api'
import { readCache, writeCache } from '../../lib/erpCache'
import { ChevronLeft, ChevronRight, CalendarDays, List as ListIcon } from 'lucide-react'
import { useLeaveLabels, statusColor, formatYmd, ymdLocal, parseYmdLocal, type LeaveType, type RequestStatus } from './leaveLabels'

interface ScheduleItem {
  id: number
  user_id: number
  start_date: string
  end_date: string
  leave_type: LeaveType
  consumed_days: number
  status: RequestStatus
  user_name: string
  department: string | null
  team: string | null
}

interface Holiday {
  date: string
  name: string
}

type ViewMode = 'calendar' | 'list'

interface ScheduleCache {
  items: ScheduleItem[]
  holidays: Holiday[]
}

export default function LeaveSchedulePage() {
  const { t, leaveTypeLabel, statusLabel } = useLeaveLabels()
  const [view, setView] = useState<ViewMode>('calendar')
  const [departmentFilter, setDepartmentFilter] = useState<string>('all')
  const [cursor, setCursor] = useState(() => {
    const d = new Date()
    d.setDate(1)
    return d
  })

  const monthStart = useMemo(() => {
    const d = new Date(cursor)
    d.setDate(1)
    d.setHours(0, 0, 0, 0)
    return d
  }, [cursor])

  const monthEnd = useMemo(() => {
    const d = new Date(monthStart)
    d.setMonth(d.getMonth() + 1)
    d.setDate(0)
    d.setHours(23, 59, 59, 999)
    return d
  }, [monthStart])

  const cacheKey = useMemo(() => ymdLocal(monthStart), [monthStart])
  const initial = readCache<ScheduleCache>('leaveSchedule', cacheKey)
  const [items, setItems] = useState<ScheduleItem[]>(initial?.items ?? [])
  const [holidays, setHolidays] = useState<Holiday[]>(initial?.holidays ?? [])
  const [loading, setLoading] = useState(false)

  const fetchData = useCallback(async () => {
    const key = ymdLocal(monthStart)
    const c = readCache<ScheduleCache>('leaveSchedule', key)
    if (c) {
      setItems(c.items)
      setHolidays(c.holidays)
      setLoading(false)
    } else {
      setLoading(true)
    }
    try {
      const startStr = ymdLocal(monthStart)
      const endStr = ymdLocal(monthEnd)
      const [s, h] = await Promise.all([
        api.get('/vacation/schedule', { params: { startDate: startStr, endDate: endStr } }),
        api.get('/vacation/holidays', { params: { startDate: startStr, endDate: endStr } }),
      ])
      setItems(s.data)
      setHolidays(h.data)
      writeCache<ScheduleCache>('leaveSchedule', key, { items: s.data, holidays: h.data })
    } catch (e) {
      console.error('schedule fetch error:', e)
    } finally {
      setLoading(false)
    }
  }, [monthStart, monthEnd])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const departmentOptions = useMemo(() => {
    const set = new Set<string>()
    items.forEach((i) => {
      if (i.department) set.add(i.department)
    })
    return Array.from(set).sort()
  }, [items])

  const filteredItems = useMemo(() => {
    if (departmentFilter === 'all') return items
    return items.filter((i) => i.department === departmentFilter)
  }, [items, departmentFilter])

  const monthLabel = `${monthStart.getFullYear()}.${String(monthStart.getMonth() + 1).padStart(2, '0')}`

  const goPrev = () => {
    const d = new Date(cursor)
    d.setMonth(d.getMonth() - 1)
    setCursor(d)
  }
  const goNext = () => {
    const d = new Date(cursor)
    d.setMonth(d.getMonth() + 1)
    setCursor(d)
  }
  const goToday = () => {
    const d = new Date()
    d.setDate(1)
    setCursor(d)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('erp_leave_schedule')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('schedule_subtitle')}</p>
        </div>
        <div className="inline-flex items-center rounded-md border border-gray-200 overflow-hidden">
          <button
            onClick={() => setView('calendar')}
            className={`flex items-center gap-1 px-3 py-1.5 text-sm ${
              view === 'calendar' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <CalendarDays className="h-4 w-4" />
            {t('view_calendar')}
          </button>
          <button
            onClick={() => setView('list')}
            className={`flex items-center gap-1 px-3 py-1.5 text-sm border-l border-gray-200 ${
              view === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <ListIcon className="h-4 w-4" />
            {t('view_list')}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap bg-white border border-gray-200 rounded-lg px-4 py-3">
        <div className="flex items-center gap-2">
          <button onClick={goPrev} className="p-1.5 rounded hover:bg-gray-100">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="text-base font-semibold w-32 text-center">{monthLabel}</div>
          <button onClick={goNext} className="p-1.5 rounded hover:bg-gray-100">
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            onClick={goToday}
            className="ml-2 px-3 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50"
          >
            {t('btn_this_month')}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">{t('filter_dept')}</label>
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="text-sm border border-gray-200 rounded px-2 py-1 bg-white"
          >
            <option value="all">{t('filter_all')}</option>
            {departmentOptions.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      {view === 'calendar' ? (
        <CalendarView
          monthStart={monthStart}
          items={filteredItems}
          holidays={holidays}
          t={t}
          leaveTypeLabel={leaveTypeLabel}
          statusLabel={statusLabel}
        />
      ) : (
        <ListView items={filteredItems} loading={loading} t={t} leaveTypeLabel={leaveTypeLabel} statusLabel={statusLabel} />
      )}
    </div>
  )
}

function CalendarView({
  monthStart,
  items,
  holidays,
  t,
  leaveTypeLabel,
  statusLabel,
}: {
  monthStart: Date
  items: ScheduleItem[]
  holidays: Holiday[]
  t: (k: string) => string
  leaveTypeLabel: (lt: LeaveType) => string
  statusLabel: (s: RequestStatus) => string
}) {
  const weeks = useMemo(() => {
    const start = new Date(monthStart)
    start.setDate(1 - start.getDay())
    const result: Date[][] = []
    for (let w = 0; w < 6; w++) {
      const week: Date[] = []
      for (let d = 0; d < 7; d++) {
        const dt = new Date(start)
        dt.setDate(start.getDate() + w * 7 + d)
        week.push(dt)
      }
      result.push(week)
    }
    return result
  }, [monthStart])

  const itemsByDate = useMemo(() => {
    const map = new Map<string, ScheduleItem[]>()
    for (const it of items) {
      const cur = parseYmdLocal(it.start_date)
      const last = parseYmdLocal(it.end_date)
      while (cur <= last) {
        const key = ymdLocal(cur)
        if (!map.has(key)) map.set(key, [])
        map.get(key)!.push(it)
        cur.setDate(cur.getDate() + 1)
      }
    }
    return map
  }, [items])

  const holidayByDate = useMemo(() => {
    const map = new Map<string, Holiday>()
    for (const h of holidays) {
      const key = ymdLocal(parseYmdLocal(h.date))
      map.set(key, h)
    }
    return map
  }, [holidays])

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const dows = ['dow_sun', 'dow_mon', 'dow_tue', 'dow_wed', 'dow_thu', 'dow_fri', 'dow_sat']

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="grid grid-cols-7 bg-gray-50 text-center text-xs font-medium text-gray-600 border-b border-gray-200">
        {dows.map((dKey, i) => (
          <div key={dKey} className={`py-2 ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : ''}`}>
            {t(dKey)}
          </div>
        ))}
      </div>
      <div className="divide-y divide-gray-100">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 divide-x divide-gray-100 min-h-[120px]">
            {week.map((d) => {
              const key = ymdLocal(d)
              const isCurrentMonth = d.getMonth() === monthStart.getMonth()
              const isToday = d.getTime() === today.getTime()
              const dayItems = itemsByDate.get(key) || []
              const holiday = holidayByDate.get(key)
              const dow = d.getDay()
              return (
                <div
                  key={key}
                  className={`p-1.5 ${!isCurrentMonth ? 'bg-gray-50/50' : ''}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs ${
                        !isCurrentMonth
                          ? 'text-gray-300'
                          : isToday
                            ? 'inline-flex items-center justify-center h-5 w-5 rounded-full bg-blue-600 text-white font-semibold'
                            : dow === 0 || holiday
                              ? 'text-red-500'
                              : dow === 6
                                ? 'text-blue-500'
                                : 'text-gray-700'
                      }`}
                    >
                      {d.getDate()}
                    </span>
                    {holiday && (
                      <span className="text-[10px] text-red-500 truncate max-w-[60%]">
                        {holiday.name}
                      </span>
                    )}
                  </div>
                  <div className="space-y-0.5">
                    {dayItems.slice(0, 3).map((it) => (
                      <div
                        key={`${it.id}-${key}`}
                        className={`px-1.5 py-0.5 rounded text-[11px] truncate ${
                          it.status === 'pending'
                            ? 'bg-amber-50 text-amber-800 border border-amber-100'
                            : 'bg-blue-50 text-blue-800 border border-blue-100'
                        }`}
                        title={`${it.user_name} - ${leaveTypeLabel(it.leave_type)} (${statusLabel(it.status)})`}
                      >
                        {it.user_name} · {leaveTypeLabel(it.leave_type)}
                      </div>
                    ))}
                    {dayItems.length > 3 && (
                      <div className="text-[10px] text-gray-500 px-1.5">
                        +{dayItems.length - 3}{t('unit_count')}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

function ListView({
  items,
  loading,
  t,
  leaveTypeLabel,
  statusLabel,
}: {
  items: ScheduleItem[]
  loading: boolean
  t: (k: string) => string
  leaveTypeLabel: (lt: LeaveType) => string
  statusLabel: (s: RequestStatus) => string
}) {
  if (loading || items.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-sm text-gray-400">
        {loading ? t('loading_short') : t('empty_schedule')}
      </div>
    )
  }
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium text-xs">{t('col_period')}</th>
              <th className="px-4 py-2.5 text-left font-medium text-xs">{t('col_name')}</th>
              <th className="px-4 py-2.5 text-left font-medium text-xs">{t('col_dept')}</th>
              <th className="px-4 py-2.5 text-left font-medium text-xs">{t('col_type')}</th>
              <th className="px-4 py-2.5 text-right font-medium text-xs">{t('col_days')}</th>
              <th className="px-4 py-2.5 text-left font-medium text-xs">{t('col_status')}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3">
                  {formatYmd(it.start_date)}
                  {it.start_date !== it.end_date && ` ~ ${formatYmd(it.end_date)}`}
                </td>
                <td className="px-4 py-3 font-medium">{it.user_name}</td>
                <td className="px-4 py-3 text-gray-600">{it.department || it.team || '-'}</td>
                <td className="px-4 py-3">{leaveTypeLabel(it.leave_type)}</td>
                <td className="px-4 py-3 text-right">{it.consumed_days}{t('unit_day')}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2 py-0.5 text-xs rounded border ${statusColor[it.status]}`}>
                    {statusLabel(it.status)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
