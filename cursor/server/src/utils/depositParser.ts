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
 * 입금 메일 본문에서 정보 추출 (여러 건 지원)
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
 * 
 * 한 이메일에 여러 건의 입금이 있는 경우 모두 추출합니다.
 */
export function parseDepositEmail(emailBody: string): DepositInfo[] {
  try {
    const deposits: DepositInfo[] = []
    
    // 금액 패턴으로 모든 입금 내역 찾기
    const amountPattern = /(\d{1,3}(?:,\d{3})*)\s*円/g
    let amountMatch: RegExpExecArray | null
    
    const allMatches: Array<{ amount: string; rawAmount: number; index: number }> = []
    
    // 모든 금액 매칭 찾기
    while ((amountMatch = amountPattern.exec(emailBody)) !== null) {
      const amountStr = amountMatch[1]
      const rawAmount = parseInt(amountStr.replace(/,/g, ''), 10)
      
      // 너무 작은 금액이나 이상한 금액은 제외 (예: 계좌번호의 일부)
      if (rawAmount >= 100) {
        allMatches.push({
          amount: `¥${amountStr}`,
          rawAmount,
          index: amountMatch.index
        })
      }
    }
    
    if (allMatches.length === 0) {
      console.log('⚠️ Could not find any valid amount in email')
      return []
    }

    console.log(`📊 Found ${allMatches.length} amount(s) in email`)

    // 각 금액에 대해 입금자명 추출
    for (const match of allMatches) {
      let depositorName = '알 수 없음'
      
      // 해당 금액 주변 텍스트 추출 (앞 500자)
      const startPos = Math.max(0, match.index - 500)
      const contextBefore = emailBody.substring(startPos, match.index)
      
      // 패턴 1: "内容 ： [입금자명]" 형식 (해당 금액과 가장 가까운 것)
      const contentPattern = /内容[\s　]*[：:]+[\s　]*(.+?)[\s　]*$/m
      const lines = contextBefore.split('\n')
      
      // 금액 바로 위부터 역순으로 "内容" 찾기
      for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i]
        const contentMatch = line.match(contentPattern)
        if (contentMatch) {
          depositorName = contentMatch[1].replace(/^振込[\s　]*/, '').trim()
          break
        }
      }
      
      // 패턴 2: 금액 바로 위 줄 (예: "ラスタジオヤマダマコト\n55,000円")
      if (depositorName === '알 수 없음') {
        const lastLine = lines[lines.length - 1]?.trim()
        
        if (lastLine && lastLine.length > 0 && lastLine.length < 100 && 
            !lastLine.includes('：') && !lastLine.includes(':') &&
            !lastLine.includes('金額')) {
          // 일본어 카타카나/히라가나/한자가 포함된 경우
          if (/[ァ-ヶぁ-ん一-龯]/.test(lastLine)) {
            depositorName = lastLine
          }
        }
      }

      // 불필요한 기호 정리
      depositorName = depositorName
        .replace(/[　\s]+/g, ' ') // 전각 공백을 반각 공백으로
        .replace(/^[、。，．]+/, '') // 시작 부분 구두점 제거
        .trim()

      console.log(`✅ Parsed deposit: ${depositorName} - ${match.amount}`)

      deposits.push({
        depositor_name: depositorName,
        amount: match.amount,
        raw_amount: match.rawAmount
      })
    }

    return deposits
  } catch (error: any) {
    console.error('❌ Failed to parse deposit email:', error.message)
    return []
  }
}

/**
 * 여러 입금 정보를 한 번에 파싱 (배치 처리용)
 */
export function parseMultipleDeposits(emailBodies: string[]): DepositInfo[] {
  return emailBodies
    .flatMap(body => parseDepositEmail(body))
    .filter((info): info is DepositInfo => info !== null)
}
