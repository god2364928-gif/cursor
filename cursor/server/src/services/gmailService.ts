import { google } from 'googleapis'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

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

        // 본문 추출
        let body = ''
        if (msg.data.payload?.body?.data) {
          body = Buffer.from(msg.data.payload.body.data, 'base64').toString('utf-8')
        } else if (msg.data.payload?.parts) {
          // 멀티파트 메일 처리
          for (const part of msg.data.payload.parts) {
            if (part.mimeType === 'text/plain' && part.body?.data) {
              body = Buffer.from(part.body.data, 'base64').toString('utf-8')
              break
            }
          }
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
