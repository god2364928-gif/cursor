import { google } from 'googleapis'
import fs from 'fs'
import dotenv from 'dotenv'
import iconv from 'iconv-lite'

dotenv.config()

const CREDENTIALS_PATH = process.env.GMAIL_CREDENTIALS_PATH || './gmail-credentials.json'
const TOKEN_PATH = process.env.GMAIL_TOKEN_PATH || './gmail-token.json'

// Railway 환경 변수에서 인증 파일 생성
if (process.env.GMAIL_CREDENTIALS_JSON && !fs.existsSync(CREDENTIALS_PATH)) {
  fs.writeFileSync(CREDENTIALS_PATH, process.env.GMAIL_CREDENTIALS_JSON)
  console.log('✅ Created Gmail credentials file from environment variable')
}
if (process.env.GMAIL_TOKEN_JSON && !fs.existsSync(TOKEN_PATH)) {
  fs.writeFileSync(TOKEN_PATH, process.env.GMAIL_TOKEN_JSON)
  console.log('✅ Created Gmail token file from environment variable')
}

/**
 * Gmail API 클라이언트 초기화
 */
function getGmailClient() {
  try {
    // 인증 파일 확인
    if (!fs.existsSync(CREDENTIALS_PATH)) {
      console.log('⚠️ Gmail credentials file not found:', CREDENTIALS_PATH)
      return null
    }

    if (!fs.existsSync(TOKEN_PATH)) {
      console.log('⚠️ Gmail token file not found:', TOKEN_PATH)
      console.log('📝 Please run the authentication script first')
      return null
    }

    // 인증 정보 로드
    const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf-8'))
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8'))

    const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web

    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0])
    oAuth2Client.setCredentials(token)

    return google.gmail({ version: 'v1', auth: oAuth2Client })
  } catch (error: any) {
    console.error('❌ Failed to initialize Gmail client:', error.message)
    return null
  }
}

/**
 * 메일 헤더에서 charset 추출
 */
function getCharsetFromHeaders(headers: Array<{ name?: string | null; value?: string | null }> | undefined | null): string | null {
  if (!headers) return null
  const contentType = headers.find(h => h.name?.toLowerCase() === 'content-type')
  if (!contentType?.value) return null
  const charsetMatch = contentType.value.match(/charset\s*=\s*"?([^";\s]+)"?/i)
  return charsetMatch ? charsetMatch[1] : null
}

/**
 * base64 인코딩된 메일 본문을 올바른 문자셋으로 디코딩
 * 1) Content-Type 헤더의 charset이 있으면 그걸 사용
 * 2) 없으면 여러 인코딩을 시도해서 일본어가 가장 많이 인식되는 것을 선택
 */
function decodeBodyData(data: string, charset: string | null): string {
  const buffer = Buffer.from(data, 'base64')

  // 1) 헤더에 charset이 명시된 경우
  if (charset) {
    const normalized = charset.toUpperCase().replace(/[^A-Z0-9-]/g, '')
    if (iconv.encodingExists(normalized)) {
      const decoded = iconv.decode(buffer, normalized)
      console.log(`📝 Decoded email body with charset: ${normalized}`)
      return decoded
    }
  }

  // 2) charset 없음 → 여러 인코딩 시도 후 최적 선택
  const encodings = ['UTF-8', 'ISO-2022-JP', 'SHIFT_JIS', 'CP932', 'EUC-JP']
  let bestResult = ''
  let bestEncoding = 'UTF-8'
  let maxJapaneseChars = 0

  for (const encoding of encodings) {
    try {
      const decoded = iconv.decode(buffer, encoding)
      const japaneseCount = (decoded.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\uFF61-\uFF9F]/g) || []).length
      if (japaneseCount > maxJapaneseChars) {
        maxJapaneseChars = japaneseCount
        bestResult = decoded
        bestEncoding = encoding
      }
    } catch {
      // skip
    }
  }

  if (maxJapaneseChars > 0) {
    console.log(`📝 Auto-detected encoding: ${bestEncoding} (${maxJapaneseChars} Japanese chars)`)
    return bestResult
  }

  // 일본어가 하나도 없으면 UTF-8 폴백
  return buffer.toString('utf-8')
}

/**
 * 멀티파트 메일에서 text/plain 본문을 재귀적으로 탐색
 */
function findTextPlainBody(payload: any): string {
  // 단일 파트에 본문이 있는 경우
  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    const charset = getCharsetFromHeaders(payload.headers)
    return decodeBodyData(payload.body.data, charset)
  }

  // 하위 파트 재귀 탐색
  if (payload.parts) {
    for (const part of payload.parts) {
      const result = findTextPlainBody(part)
      if (result) return result
    }
  }

  return ''
}

/**
 * 입금 알림 메일 검색
 * - 미읽음 메일만
 * - "振込入金" 키워드 포함
 */
export async function checkDepositEmails(): Promise<Array<{
  id: string
  subject: string
  body: string
  date: string
}>> {
  const gmail = getGmailClient()

  if (!gmail) {
    return []
  }

  try {
    // 미읽은 메일 중 "振込入金" 포함하는 메일 검색
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: 'is:unread 振込入金',
      maxResults: 10
    })

    const messages = response.data.messages || []

    if (messages.length === 0) {
      return []
    }

    console.log(`📧 Found ${messages.length} unread deposit notification email(s)`)

    // 각 메일의 상세 정보 가져오기
    const depositEmails = []

    for (const message of messages) {
      try {
        const msg = await gmail.users.messages.get({
          userId: 'me',
          id: message.id!,
          format: 'full'
        })

        // 제목 추출
        const headers = msg.data.payload?.headers || []
        const subjectHeader = headers.find(h => h.name?.toLowerCase() === 'subject')
        const subject = subjectHeader?.value || '(제목 없음)'

        const dateHeader = headers.find(h => h.name?.toLowerCase() === 'date')
        const date = dateHeader?.value || ''

        // 본문 추출 (인코딩 자동 감지)
        let body = ''
        if (msg.data.payload) {
          body = findTextPlainBody(msg.data.payload)
        }

        depositEmails.push({
          id: message.id!,
          subject,
          body,
          date
        })

        console.log(`  - ${subject}`)
      } catch (error: any) {
        console.error(`❌ Failed to fetch message ${message.id}:`, error.message)
      }
    }

    return depositEmails
  } catch (error: any) {
    console.error('❌ Failed to check deposit emails:', error.message)
    return []
  }
}

/**
 * 메일을 읽음으로 표시
 */
export async function markAsRead(messageId: string): Promise<boolean> {
  const gmail = getGmailClient()

  if (!gmail) {
    return false
  }

  try {
    await gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      requestBody: {
        removeLabelIds: ['UNREAD']
      }
    })

    console.log(`✅ Marked message ${messageId} as read`)
    return true
  } catch (error: any) {
    console.error(`❌ Failed to mark message ${messageId} as read:`, error.message)
    return false
  }
}

/**
 * Gmail 연결 테스트
 */
export async function testGmailConnection(): Promise<boolean> {
  const gmail = getGmailClient()

  if (!gmail) {
    return false
  }

  try {
    const profile = await gmail.users.getProfile({ userId: 'me' })
    console.log('✅ Gmail connection successful:', profile.data.emailAddress)
    return true
  } catch (error: any) {
    console.error('❌ Gmail connection failed:', error.message)
    return false
  }
}
