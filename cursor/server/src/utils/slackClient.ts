import { WebClient } from '@slack/web-api'
import dotenv from 'dotenv'

dotenv.config()

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN
const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID || '#general'

let slackClient: WebClient | null = null

/**
 * 슬랙 클라이언트 초기화
 */
function getSlackClient(): WebClient | null {
  if (!SLACK_BOT_TOKEN) {
    console.log('⚠️ SLACK_BOT_TOKEN is not configured')
    return null
  }

  if (!slackClient) {
    slackClient = new WebClient(SLACK_BOT_TOKEN)
    console.log('✅ Slack client initialized')
  }

  return slackClient
}

/**
 * 영수증 발급 알림을 슬랙으로 전송
 */
export async function sendReceiptNotification(receiptData: {
  receipt_number: string
  partner_name: string
  issue_date: string
  total_amount: number
  tax_amount: number
  user_name?: string
}): Promise<boolean> {
  const client = getSlackClient()

  if (!client) {
    console.log('⚠️ Slack client not available, skipping notification')
    return false
  }

  try {
    const { receipt_number, partner_name, issue_date, total_amount, tax_amount, user_name } = receiptData

    // 세전 금액 계산
    const amountExcludingTax = total_amount - tax_amount

    // 금액을 읽기 쉽게 포맷팅 (콤마 추가)
    const formatAmount = (amount: number) => {
      return amount.toLocaleString('ja-JP')
    }

    // 슬랙 메시지 구성
    const message = {
      channel: SLACK_CHANNEL_ID,
      text: `📋 새로운 영수증이 발급되었습니다`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '📋 새로운 영수증 발급',
            emoji: true
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*영수증 번호:*\n${receipt_number}`
            },
            {
              type: 'mrkdwn',
              text: `*발급일:*\n${issue_date}`
            },
            {
              type: 'mrkdwn',
              text: `*거래처:*\n${partner_name}`
            },
            {
              type: 'mrkdwn',
              text: `*발급자:*\n${user_name || '알 수 없음'}`
            }
          ]
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*세전 금액:*\n¥${formatAmount(amountExcludingTax)}`
            },
            {
              type: 'mrkdwn',
              text: `*세액 (10%):*\n¥${formatAmount(tax_amount)}`
            },
            {
              type: 'mrkdwn',
              text: `*총 금액:*\n¥${formatAmount(total_amount)}`
            }
          ]
        },
        {
          type: 'divider'
        }
      ]
    }

    await client.chat.postMessage(message)

    console.log(`✅ Slack notification sent for receipt ${receipt_number}`)
    return true
  } catch (error: any) {
    console.error('❌ Failed to send Slack notification:', error.message)
    return false
  }
}

/**
 * 슬랙 연결 테스트
 */
export async function testSlackConnection(): Promise<boolean> {
  const client = getSlackClient()

  if (!client) {
    console.log('⚠️ Slack client not available')
    return false
  }

  try {
    const result = await client.auth.test()
    console.log('✅ Slack connection test successful:', result.user)
    return true
  } catch (error: any) {
    console.error('❌ Slack connection test failed:', error.message)
    return false
  }
}






