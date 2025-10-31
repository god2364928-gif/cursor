import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 숫자에 1000단위 구분자 추가
export function formatNumber(num: number | string): string {
  if (num === null || num === undefined || num === '') return '0'
  const number = typeof num === 'string' ? parseFloat(num) : num
  if (isNaN(number)) return '0'
  return number.toLocaleString('ko-KR')
}

// 포맷된 숫자를 원래 숫자로 변환 (입력 필드용)
export function parseFormattedNumber(formattedStr: string): number {
  if (!formattedStr) return 0
  const cleanStr = formattedStr.replace(/,/g, '')
  const num = parseFloat(cleanStr)
  return isNaN(num) ? 0 : num
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
  }).format(amount)
}

export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3')
  }
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3')
  }
  return phone
}


