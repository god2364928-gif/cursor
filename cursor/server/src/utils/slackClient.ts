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

/**
 * 간식 발주 알림 — 매주 월요일 아침에 발주 대상 주(=직전 마감된 주)의
 * pending 신청 목록을 日本_알림방으로 전송.
 *
 * - 발주할 항목이 0건이면 보내지 않음 (호출자가 사전 체크해도 되고, 여기서도 가드)
 * - 채널은 VACATION_SLACK_CHANNEL_ID 와 동일 (日本_알림방 C0B28RC26H1).
 *   SNACK_ORDER_SLACK_CHANNEL_ID 환경변수로 override 가능
 */
export const SNACK_ORDER_SLACK_CHANNEL_ID =
  process.env.SNACK_ORDER_SLACK_CHANNEL_ID ||
  process.env.VACATION_SLACK_CHANNEL_ID ||
  'C0B28RC26H1'

export async function sendSnackOrderReminder(data: {
  weekStart: string // YYYY-MM-DD (발주 대상 주 월요일)
  totalAmount: number
  items: Array<{
    user_name: string
    department?: string | null
    product_name: string
    product_url?: string | null
    unit_price: number
    quantity: number
    total: number
  }>
}): Promise<boolean> {
  const client = getSlackClient()
  if (!client) return false
  if (!data.items || data.items.length === 0) return false

  try {
    const { weekStart, totalAmount, items } = data
    const yen = (n: number) => `¥${(n || 0).toLocaleString('ja-JP')}`

    // 상품 목록 — Slack 메시지 길이 제한(블록 50개) 대비 50건까지만 표시
    const MAX = 50
    const shown = items.slice(0, MAX)
    const overflow = items.length - shown.length

    const lines = shown.map((it, i) => {
      const head = `${i + 1}. *${it.user_name}*${it.department ? ` (${it.department})` : ''}`
      const name = it.product_url
        ? `<${it.product_url}|${it.product_name}>`
        : it.product_name
      const qtyLine = `${yen(it.unit_price)} × ${it.quantity} = *${yen(it.total)}*`
      return `${head}\n${name}\n${qtyLine}`
    })

    const blocks: any[] = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🛒 今週の発注リスト',
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*対象週:*\n${weekStart} 週` },
          { type: 'mrkdwn', text: `*件数:*\n${items.length}件` },
          { type: 'mrkdwn', text: `*合計金額:*\n${yen(totalAmount)}` },
        ],
      },
      { type: 'divider' },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: lines.join('\n\n') },
      },
    ]

    if (overflow > 0) {
      blocks.push({
        type: 'context',
        elements: [
          { type: 'mrkdwn', text: `…ほか ${overflow} 件（管理画面で確認してください）` },
        ],
      })
    }

    blocks.push({
      type: 'context',
      elements: [
        { type: 'mrkdwn', text: '📋 ERP → 間食購入申請 で発注完了処理をしてください' },
      ],
    })

    await client.chat.postMessage({
      channel: SNACK_ORDER_SLACK_CHANNEL_ID,
      text: `🛒 今週の発注リスト (${weekStart}週) — ${items.length}件 / ${yen(totalAmount)}`,
      blocks,
    })

    console.log(
      `✅ Slack snack order reminder sent: week=${weekStart} items=${items.length} total=${totalAmount} channel=${SNACK_ORDER_SLACK_CHANNEL_ID}`
    )
    return true
  } catch (error: any) {
    // Slack WebClient 오류는 실제 코드가 error.data.error 에 담김 (예: not_in_channel, channel_not_found)
    const slackErr = error?.data?.error || error?.message
    console.error(
      `❌ Slack snack order reminder failed (channel=${SNACK_ORDER_SLACK_CHANNEL_ID}):`,
      slackErr
    )
    return false
  }
}

/**
 * 교육비(자기계발) 신청 알림 — 신청이 제출(pending)되면 日本_알림방으로 전송.
 * - 채널: EDUCATION_SLACK_CHANNEL_ID > VACATION_SLACK_CHANNEL_ID > 'C0B28RC26H1' (日本_알림방)
 */
const EDUCATION_SLACK_CHANNEL_ID =
  process.env.EDUCATION_SLACK_CHANNEL_ID ||
  process.env.VACATION_SLACK_CHANNEL_ID ||
  'C0B28RC26H1'

const COURSE_TYPE_LABEL_JA: Record<string, string> = {
  offline: '通学',
  online: 'オンライン',
  book: '書籍',
}
const SCHEDULE_TYPE_LABEL_JA: Record<string, string> = {
  after_work: '業務後',
  weekend: '週末',
  self_paced: '自己ペース',
}

export async function sendEducationRequestNotification(data: {
  userName: string
  department?: string | null
  courseType: string
  scheduleType: string
  provider: string
  courseName: string
  courseUrl?: string | null
  startDate: string
  endDate: string
  cost: number
  ceoApprovalRequired: boolean
  relevance?: string | null
}): Promise<boolean> {
  const client = getSlackClient()
  if (!client) return false

  try {
    const {
      userName, department, courseType, scheduleType, provider, courseName,
      courseUrl, startDate, endDate, cost, ceoApprovalRequired, relevance,
    } = data

    const yen = (n: number) => `¥${(n || 0).toLocaleString('ja-JP')}`
    const period = startDate === endDate ? startDate : `${startDate} ~ ${endDate}`
    const courseTypeLabel = COURSE_TYPE_LABEL_JA[courseType] || courseType
    const scheduleLabel = SCHEDULE_TYPE_LABEL_JA[scheduleType] || scheduleType
    const courseTitle = courseUrl ? `<${courseUrl}|${courseName}>` : courseName

    const fields: { type: 'mrkdwn'; text: string }[] = [
      { type: 'mrkdwn', text: `*申請者:*\n${userName}${department ? ` (${department})` : ''}` },
      { type: 'mrkdwn', text: `*受講機関:*\n${provider}` },
      { type: 'mrkdwn', text: `*受講内容:*\n${courseTitle}` },
      { type: 'mrkdwn', text: `*受講期間:*\n${period}` },
      { type: 'mrkdwn', text: `*受講形態:*\n${courseTypeLabel} / ${scheduleLabel}` },
      { type: 'mrkdwn', text: `*受講料:*\n${yen(cost)}` },
    ]
    if (relevance && relevance.trim()) {
      // 너무 길면 잘라서 표시 (Slack 필드 가독성)
      const trimmed = relevance.trim()
      const shown = trimmed.length > 300 ? `${trimmed.slice(0, 300)}…` : trimmed
      fields.push({ type: 'mrkdwn', text: `*業務関連性:*\n${shown}` })
    }

    const blocks: any[] = [
      {
        type: 'header',
        text: { type: 'plain_text', text: '📚 教育費申請', emoji: true },
      },
      { type: 'section', fields },
    ]
    if (ceoApprovalRequired) {
      blocks.push({
        type: 'context',
        elements: [
          { type: 'mrkdwn', text: '⚠️ 高額のため代表承認が必要な申請です' },
        ],
      })
    }

    await client.chat.postMessage({
      channel: EDUCATION_SLACK_CHANNEL_ID,
      text: `📚 教育費申請: ${userName} ${courseName} (${yen(cost)})`,
      blocks,
    })
    return true
  } catch (error: any) {
    console.error('❌ Slack education request notification failed:', error.message)
    return false
  }
}

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







