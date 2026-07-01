/**
 * 経費申請・精算 — 세무 자동판정 순수 함수
 *
 * design 02 §2.1 기준. 외부 의존성 없음.
 */

/** 会議費 vs 接待交際費 (令和6年度改正: 1인당 1만엔 기준) */
export function classifyMeal(amountInclTax: number, attendeeCount: number, purpose: string):
  { tag: '会議費' | '接待交際費'; perPerson: number } {
  const perPerson = attendeeCount > 0 ? Math.floor(amountInclTax / attendeeCount) : amountInclTax
  if (purpose === 'welfare') return { tag: '会議費', perPerson }        // 복리후생성은 회의비 처리
  const tag = perPerson <= 10000 ? '会議費' : '接待交際費'
  return { tag, perPerson }
}

/** 交通: 公共交通機関特例 (電車·バス & 税込 3만엔 미만 → 인보이스/영수증 불요) */
export function isPublicTransportException(method: string, amountInclTax: number): boolean {
  return (method === 'train' || method === 'bus') && amountInclTax < 30000
}

/** 少額特例: 税込 1만엔 미만 → T번호 없어도 경고만 (차단 X) */
export function isSmallAmountSpecial(amountInclTax: number): boolean {
  return amountInclTax < 10000
}

/** freee display_category 패밀리 결정 (経過措置 e80/e50 by 사용일) */
export function taxDisplayCategory(usedAt: string, taxRate: number, reduced: boolean): string {
  const beforeOct2026 = usedAt <= '2026-09-30'
  const suffix = beforeOct2026 ? 'e80' : 'e50'
  if (reduced || taxRate === 8) return `tax_r8_${suffix}`   // 8%軽減
  return `tax_10_${suffix}`                                 // 10%
}
