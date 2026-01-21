import DatePicker, { registerLocale } from 'react-datepicker'
import { ja } from 'date-fns/locale'
import 'react-datepicker/dist/react-datepicker.css'

// 일본어 로케일 등록
registerLocale('ja', ja)

// react-datepicker 포퍼 z-index 스타일
const popperStyle = `
  .react-datepicker-popper {
    z-index: 9999 !important;
  }
`
// 스타일 태그 추가 (한 번만)
if (typeof document !== 'undefined' && !document.getElementById('datepicker-styles')) {
  const style = document.createElement('style')
  style.id = 'datepicker-styles'
  style.textContent = popperStyle
  document.head.appendChild(style)
}

interface DatePickerInputProps {
  value: string // yyyy-MM-dd 형식
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  isClearable?: boolean
  popperPlacement?: 'top' | 'bottom' | 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end'
}

export function DatePickerInput({
  value,
  onChange,
  placeholder = 'yyyy/MM/dd',
  className = '',
  isClearable = true,
  popperPlacement = 'bottom-start'
}: DatePickerInputProps) {
  const handleChange = (date: Date | null) => {
    if (date) {
      // UTC 시간대 문제 해결: 로컬 날짜를 yyyy-MM-dd 형식으로 변환
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      onChange(`${year}-${month}-${day}`)
    } else {
      onChange('')
    }
  }

  // 문자열을 Date 객체로 변환 (로컬 시간대 기준)
  const parseDate = (dateStr: string): Date | null => {
    if (!dateStr) return null
    const [year, month, day] = dateStr.split('-').map(Number)
    return new Date(year, month - 1, day)
  }

  return (
    <DatePicker
      selected={parseDate(value)}
      onChange={handleChange}
      dateFormat="yyyy/MM/dd"
      locale="ja"
      placeholderText={placeholder}
      className={`border rounded px-3 py-2 text-sm ${className}`}
      isClearable={isClearable}
      popperPlacement={popperPlacement}
    />
  )
}
