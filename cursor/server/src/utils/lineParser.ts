/**
 * LINE 대화 텍스트 파일 파싱 유틸리티
 * 
 * LINE에서 내보낸 TXT 파일을 파싱하여 구조화된 데이터로 변환
 */

interface LineMessage {
  date: string
  time: string
  sender: string
  message: string
}

interface ParsedLineChat {
  messages: LineMessage[]
  participants: string[]
  dateRange: {
    start: string
    end: string
  }
  summary: string
  extractedCompanyName: string | null
  extractedCustomerName: string | null
  extractedPhone: string | null
}

/**
 * LINE 대화 텍스트 파싱
 */
export function parseLineChat(text: string): ParsedLineChat {
  const lines = text.split('\n').filter(line => line.trim())
  const messages: LineMessage[] = []
  let currentDate = ''
  
  // LINE 대화 형식:
  // 2024.11.17(일)
  // 오전 10:25	홍길동	안녕하세요
  // または
  // 午前 6:00	既読	よろしければ、月曜日にパスワードを共有いただく形で問題ございません。
  
  for (const line of lines) {
    // 날짜 라인 감지 (YYYY.MM.DD 또는 YYYY/MM/DD 또는 MM月DD日)
    const dateMatch = line.match(/(\d{4})[\.\/](\d{1,2})[\.\/](\d{1,2})|(\d{1,2})月(\d{1,2})日/)
    if (dateMatch) {
      if (dateMatch[1]) {
        // YYYY.MM.DD 형식
        currentDate = `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`
      } else if (dateMatch[4]) {
        // MM月DD日 형식 (년도는 현재 년도로 가정)
        const year = new Date().getFullYear()
        currentDate = `${year}-${dateMatch[4].padStart(2, '0')}-${dateMatch[5].padStart(2, '0')}`
      }
      continue
    }
    
    // 메시지 라인 파싱
    // 형식: "오전 10:25	홍길동	안녕하세요" 또는 "午前 6:00	既読	メッセージ"
    const messageMatch = line.match(/^([오전오후午前午後]\s*\d{1,2}:\d{2})\s+(.+?)\s+(.+)$/)
    if (messageMatch && currentDate) {
      const [, time, sender, message] = messageMatch
      messages.push({
        date: currentDate,
        time: time.trim(),
        sender: sender.trim(),
        message: message.trim()
      })
    } else {
      // 탭으로 구분된 경우
      const parts = line.split('\t')
      if (parts.length >= 3 && currentDate) {
        messages.push({
          date: currentDate,
          time: parts[0].trim(),
          sender: parts[1].trim(),
          message: parts.slice(2).join(' ').trim()
        })
      }
    }
  }
  
  // 참여자 추출
  const participants = [...new Set(messages.map(m => m.sender).filter(s => s && s !== '既読' && s !== '읽음'))]
  
  // 날짜 범위
  const dateRange = {
    start: messages.length > 0 ? messages[0].date : '',
    end: messages.length > 0 ? messages[messages.length - 1].date : ''
  }
  
  // 요약 생성
  const summary = generateSummary(messages)
  
  // 상호명/고객명 추출 시도
  const extractedCompanyName = extractCompanyName(text, messages)
  const extractedCustomerName = extractCustomerName(messages, participants)
  const extractedPhone = extractPhoneNumber(text)
  
  return {
    messages,
    participants,
    dateRange,
    summary,
    extractedCompanyName,
    extractedCustomerName,
    extractedPhone
  }
}

/**
 * 대화 요약 생성
 */
function generateSummary(messages: LineMessage[]): string {
  if (messages.length === 0) return ''
  
  // 메시지 내용 결합
  const allMessages = messages.map(m => m.message).join(' ')
  
  // 간단한 요약: 처음 200자 + 메시지 개수
  const preview = allMessages.slice(0, 200)
  const summary = `${preview}${allMessages.length > 200 ? '...' : ''}\n\n총 ${messages.length}개 메시지`
  
  return summary
}

/**
 * 상호명 추출 (주식회사, 株式会社 등 키워드 기반)
 */
function extractCompanyName(text: string, messages: LineMessage[]): string | null {
  // 대화방 제목에서 추출 시도 (첫 줄에 종종 표시됨)
  const firstLine = text.split('\n')[0]
  
  // 한국어: 주식회사, (주), 회사, 상사, 무역 등
  const krPattern = /(주식회사|주\)|회사|상사|무역|기업|그룹|코퍼레이션|인터내셔널|엔터프라이즈)[^\s\t\n]{1,20}/
  const krMatch = firstLine.match(krPattern)
  if (krMatch) return krMatch[0]
  
  // 일본어: 株式会社, 有限会社 등
  const jpPattern = /(株式会社|有限会社|合同会社|合資会社)[^\s\t\n]{1,30}/
  const jpMatch = firstLine.match(jpPattern)
  if (jpMatch) return jpMatch[0]
  
  // 메시지 내용에서 찾기
  for (const msg of messages) {
    const krMatch2 = msg.message.match(krPattern)
    if (krMatch2) return krMatch2[0]
    
    const jpMatch2 = msg.message.match(jpPattern)
    if (jpMatch2) return jpMatch2[0]
  }
  
  return null
}

/**
 * 고객명 추출 (참여자 중 가장 많이 대화한 사람)
 */
function extractCustomerName(messages: LineMessage[], participants: string[]): string | null {
  if (participants.length === 0) return null
  if (participants.length === 1) return participants[0]
  
  // 메시지 수가 가장 많은 사람을 고객으로 간주
  const messageCounts = new Map<string, number>()
  for (const msg of messages) {
    messageCounts.set(msg.sender, (messageCounts.get(msg.sender) || 0) + 1)
  }
  
  let maxCount = 0
  let customerName = participants[0]
  
  for (const [sender, count] of messageCounts) {
    if (count > maxCount) {
      maxCount = count
      customerName = sender
    }
  }
  
  return customerName
}

/**
 * 전화번호 추출
 */
function extractPhoneNumber(text: string): string | null {
  // 한국 전화번호: 010-1234-5678, 02-123-4567 등
  const krPattern = /0\d{1,2}-?\d{3,4}-?\d{4}/
  const krMatch = text.match(krPattern)
  if (krMatch) {
    return krMatch[0].replace(/-/g, '')
  }
  
  // 일본 전화번호: 090-1234-5678, 03-1234-5678 등
  const jpPattern = /0\d{1,4}-?\d{1,4}-?\d{4}/
  const jpMatch = text.match(jpPattern)
  if (jpMatch) {
    return jpMatch[0].replace(/-/g, '')
  }
  
  return null
}

/**
 * 전체 대화 내용을 히스토리용 텍스트로 변환
 */
export function formatChatForHistory(parsed: ParsedLineChat): string {
  let formatted = `[LINE 대화 ${parsed.dateRange.start} ~ ${parsed.dateRange.end}]\n\n`
  
  if (parsed.extractedCompanyName) {
    formatted += `상호: ${parsed.extractedCompanyName}\n`
  }
  if (parsed.extractedCustomerName) {
    formatted += `고객명: ${parsed.extractedCustomerName}\n`
  }
  if (parsed.extractedPhone) {
    formatted += `전화: ${parsed.extractedPhone}\n`
  }
  
  formatted += `\n참여자: ${parsed.participants.join(', ')}\n`
  formatted += `메시지 수: ${parsed.messages.length}개\n\n`
  formatted += `--- 대화 내용 ---\n`
  
  // 최근 20개 메시지만 포함 (너무 길면 요약만)
  if (parsed.messages.length > 20) {
    formatted += `(총 ${parsed.messages.length}개 메시지 중 최근 20개)\n\n`
    const recentMessages = parsed.messages.slice(-20)
    for (const msg of recentMessages) {
      formatted += `[${msg.time}] ${msg.sender}: ${msg.message}\n`
    }
  } else {
    for (const msg of parsed.messages) {
      formatted += `[${msg.date} ${msg.time}] ${msg.sender}: ${msg.message}\n`
    }
  }
  
  return formatted
}

