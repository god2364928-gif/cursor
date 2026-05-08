import { WebClient } from '@slack/web-api'
import dotenv from 'dotenv'

dotenv.config()

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN
const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID || '#general'
const DEPOSIT_SLACK_CHANNEL_ID = process.env.DEPOSIT_SLACK_CHANNEL_ID || SLACK_CHANNEL_ID

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
 * 청구서 취소 알림을 슬랙으로 전송
 */
export async function sendInvoiceCancelNotification(invoiceData: {
  invoice_number: string
  partner_name: string
  invoice_date: string
  total_amount: number
  tax_amount: number
  user_name?: string
  cancelled_at: string
}): Promise<boolean> {
  const client = getSlackClient()

  if (!client) {
    console.log('⚠️ Slack client not available, skipping notification')
    return false
  }

  try {
    const { invoice_number, partner_name, invoice_date, total_amount, tax_amount, user_name, cancelled_at } = invoiceData

    // 세전 금액 계산
    const amountExcludingTax = total_amount - tax_amount

    // 금액을 읽기 쉽게 포맷팅 (콤마 추가)
    const formatAmount = (amount: number) => {
      return amount.toLocaleString('ja-JP')
    }

    // 날짜 포맷팅 (YYYY/MM/DD)
    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}/${month}/${day}`
    }

    // 취소 일시 포맷팅 (YYYY/MM/DD HH:mm)
    const formatDateTime = (dateStr: string) => {
      const date = new Date(dateStr)
      return date.toLocaleString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Tokyo'
      })
    }

    // 슬랙 메시지 구성
    const message = {
      channel: SLACK_CHANNEL_ID,
      text: `⚠️ 청구서가 취소되었습니다`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '⚠️ 청구서 취소',
            emoji: true
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*청구서 번호:*\n${invoice_number}`
            },
            {
              type: 'mrkdwn',
              text: `*청구일:*\n${formatDate(invoice_date)}`
            },
            {
              type: 'mrkdwn',
              text: `*거래처:*\n${partner_name}`
            },
            {
              type: 'mrkdwn',
              text: `*취소자:*\n${user_name || '알 수 없음'}`
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
            },
            {
              type: 'mrkdwn',
              text: `*취소 일시:*\n${formatDateTime(cancelled_at)}`
            }
          ]
        },
        {
          type: 'divider'
        }
      ]
    }

    await client.chat.postMessage(message)

    console.log(`✅ Slack notification sent for cancelled invoice ${invoice_number}`)
    return true
  } catch (error: any) {
    console.error('❌ Failed to send Slack notification:', error.message)
    return false
  }
}

/**
 * 카드결제(PayPal) 청구서 발행 알림을 日本_領収書 슬랙 채널로 전송
 */
export async function sendPaypalInvoiceNotification(invoiceData: {
  invoice_number: string
  partner_name: string
  invoice_date: string
  due_date: string
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
    const { invoice_number, partner_name, invoice_date, due_date, total_amount, tax_amount, user_name } = invoiceData

    // 세전 금액 계산
    const amountExcludingTax = total_amount - tax_amount

    // 금액을 읽기 쉽게 포맷팅 (콤마 추가)
    const formatAmount = (amount: number) => {
      return amount.toLocaleString('ja-JP')
    }

    // 날짜 포맷팅 (YYYY/MM/DD)
    const formatDate = (dateStr: string) => {
      if (!dateStr) return '-'
      const date = new Date(dateStr)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}/${month}/${day}`
    }

    // 슬랙 메시지 구성
    const message = {
      channel: SLACK_CHANNEL_ID,
      text: `💳 카드결제(PayPal) 청구서가 발행되었습니다`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '💳 카드결제(PayPal) 청구서 발행',
            emoji: true
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*청구서 번호:*\n${invoice_number}`
            },
            {
              type: 'mrkdwn',
              text: `*청구일:*\n${formatDate(invoice_date)}`
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
              text: `*세액:*\n¥${formatAmount(tax_amount)}`
            },
            {
              type: 'mrkdwn',
              text: `*총 금액:*\n¥${formatAmount(total_amount)}`
            },
            {
              type: 'mrkdwn',
              text: `*입금기한:*\n${formatDate(due_date)}`
            }
          ]
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: '📌 결제링크를 거래처에 별도 안내해 주세요'
            }
          ]
        },
        {
          type: 'divider'
        }
      ]
    }

    await client.chat.postMessage(message)

    console.log(`✅ Slack notification sent for PayPal invoice ${invoice_number}`)
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

/**
 * 입금 알림을 슬랙으로 전송 (별도 채널)
 */
export async function sendDepositNotification(depositData: {
  depositor_name: string
  amount: string
  email_subject?: string
  email_date?: string
}): Promise<boolean> {
  const client = getSlackClient()

  if (!client) {
    console.log('⚠️ Slack client not available, skipping notification')
    return false
  }

  try {
    const { depositor_name, amount, email_subject, email_date } = depositData

    // 슬랙 메시지 구성
    const message = {
      channel: DEPOSIT_SLACK_CHANNEL_ID,
      text: `💰 입금이 확인되었습니다`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '💰 입금 알림',
            emoji: true
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*입금자명:*\n${depositor_name}`
            },
            {
              type: 'mrkdwn',
              text: `*금액:*\n${amount}`
            }
          ]
        },
        {
          type: 'divider'
        }
      ]
    }

    await client.chat.postMessage(message)

    console.log(`✅ Slack deposit notification sent: ${depositor_name} - ${amount}`)
    return true
  } catch (error: any) {
    console.error('❌ Failed to send Slack deposit notification:', error.message)
    return false
  }
}

/**
 * 휴가 신청/승인/반려 알림
 * - 기본 채널: 日本_알림방 (C0B28RC26H1)
 * - VACATION_SLACK_CHANNEL_ID 환경변수로 override 가능
 */
const VACATION_SLACK_CHANNEL_ID = process.env.VACATION_SLACK_CHANNEL_ID || 'C0B28RC26H1'

export type VacationNotifyKind = 'submitted' | 'approved' | 'rejected'

export async function sendVacationNotification(data: {
  kind: VacationNotifyKind
  userName: string
  startDate: string
  endDate: string
  leaveTypeLabel: string
  consumedDays: number
  reason?: string | null
  rejectedReason?: string | null
  approverName?: string | null
}): Promise<boolean> {
  const client = getSlackClient()
  if (!client) return false

  try {
    const { kind, userName, startDate, endDate, leaveTypeLabel, consumedDays, reason, rejectedReason, approverName } = data

    const period = startDate === endDate ? startDate : `${startDate} ~ ${endDate}`
    const headerMap: Record<VacationNotifyKind, string> = {
      submitted: '🆕 休暇申請',
      approved: '✅ 休暇承認',
      rejected: '❌ 休暇却下',
    }

    const fields: { type: 'mrkdwn'; text: string }[] = [
      { type: 'mrkdwn', text: `*申請者:*\n${userName}` },
      { type: 'mrkdwn', text: `*期間:*\n${period}` },
      { type: 'mrkdwn', text: `*種類:*\n${leaveTypeLabel} (${consumedDays}日)` },
    ]
    if (reason) fields.push({ type: 'mrkdwn', text: `*理由:*\n${reason}` })
    if (rejectedReason) fields.push({ type: 'mrkdwn', text: `*却下理由:*\n${rejectedReason}` })
    if (approverName) fields.push({ type: 'mrkdwn', text: `*承認者:*\n${approverName}` })

    await client.chat.postMessage({
      channel: VACATION_SLACK_CHANNEL_ID,
      text: `${headerMap[kind]}: ${userName} ${period}`,
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: headerMap[kind], emoji: true },
        },
        { type: 'section', fields },
      ],
    })
    return true
  } catch (error: any) {
    console.error('❌ Slack vacation notification failed:', error.message)
    return false
  }
}







