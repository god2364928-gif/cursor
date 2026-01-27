/**
 * 입금 메일 파싱 유틸리티
 * 
 * 입금자명과 금액만 추출
 */

export interface DepositInfo {
  depositor_name: string
  amount: string
  raw_amount: number
}

/**
 * 입금 메일 본문에서 정보 추출
 * 
 * 예시 메일 형식:
 * カ）　ホツトセラーさまご指定の口座に1件の振込入金がございましたのでお知らせいたします。
 * 入金口座：　トランクＮＯＲＴＨ支店　普通　口座番号0122078
 * 入金日　： 2026年01月27日
 * 金額 ： 5,000円
 * 内容 ： 振込　カ)ホツトセラ-
 * 
 * 또는:
 * ラスタジオヤマダマコト
 * 55,000円
 */
export function parseDepositEmail(emailBody: string): DepositInfo | null {
  try {
    // 금액 추출: "金額 ： 5,000円" 또는 "55,000円"
    const amountPattern = /(\d{1,3}(?:,\d{3})*)\s*円/
    const amountMatch = emailBody.match(amountPattern)
    
    if (!amountMatch) {
      console.log('⚠️ Could not find amount in email')
      return null
    }

    const amountStr = amountMatch[1] // "5,000" or "55,000"
    const rawAmount = parseInt(amountStr.replace(/,/g, ''), 10)
    const amount = `¥${amountStr}` // "¥5,000" or "¥55,000"

    // 입금자명 추출
    let depositorName = '알 수 없음'

    // 패턴 1: "内容 ： 振込　[입금자명]" 형식
    const contentPattern = /内容\s*[：:]\s*振込\s+(.+?)(?:\n|$)/
    const contentMatch = emailBody.match(contentPattern)
    if (contentMatch) {
      depositorName = contentMatch[1].trim()
    } else {
      // 패턴 2: 금액 바로 위 줄 (예: "ラスタジオヤマダマコト\n55,000円")
      const linesBeforeAmount = emailBody.substring(0, amountMatch.index).split('\n')
      const lastLine = linesBeforeAmount[linesBeforeAmount.length - 1]?.trim()
      
      if (lastLine && lastLine.length > 0 && !lastLine.includes('：') && !lastLine.includes(':')) {
        // 일본어 카타카나/히라가나/한자가 포함된 경우
        if (/[ァ-ヶぁ-ん一-龯]/.test(lastLine)) {
          depositorName = lastLine
        }
      }

      // 패턴 3: 메일 본문에 "カ)" 또는 "株式" 등이 포함된 경우
      if (depositorName === '알 수 없음') {
        const companyPattern = /([カ株][）)][^\n]+)/
        const companyMatch = emailBody.match(companyPattern)
        if (companyMatch) {
          depositorName = companyMatch[1].trim()
        }
      }
    }

    // 불필요한 기호 정리
    depositorName = depositorName
      .replace(/[　\s]+/g, ' ') // 전각 공백을 반각 공백으로
      .replace(/^[、。，．]+/, '') // 시작 부분 구두점 제거
      .trim()

    console.log(`✅ Parsed deposit: ${depositorName} - ${amount}`)

    return {
      depositor_name: depositorName,
      amount,
      raw_amount: rawAmount
    }
  } catch (error: any) {
    console.error('❌ Failed to parse deposit email:', error.message)
    return null
  }
}

/**
 * 여러 입금 정보를 한 번에 파싱 (배치 처리용)
 */
export function parseMultipleDeposits(emailBodies: string[]): DepositInfo[] {
  return emailBodies
    .map(body => parseDepositEmail(body))
    .filter((info): info is DepositInfo => info !== null)
}
