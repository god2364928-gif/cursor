// ===== 経費申請・精算 (Expense reimbursement) types =====
// design §1 / §1.1 / §7 / §8.1

export type ExpenseCategory =
  | 'transport'
  | 'dining'
  | 'meal'
  | 'reimburse'
  | 'welfare'
  | 'health_checkup'
  | 'other'
  | 'corp_card'

export type SettlementType = 'reimburse_required' | 'already_paid'

export type ExpenseStatus =
  | 'draft'
  | 'awaiting_receipt'
  | 'pending'
  | 'approved'
  | 'payment_pending'
  | 'paid'
  | 'completed'
  | 'recorded'
  | 'rejected'
  | 'cancelled'

export type ExpenseOcrStatus = 'none' | 'pending' | 'done' | 'failed'

// ===== meta (JSONB) 카테고리별 스키마 (design §1.1) =====

export interface TransportMeta {
  method?: 'train' | 'bus' | 'taxi' | 'shinkansen' | 'other'
  from?: string
  to?: string
  round_trip?: boolean
  visit_target?: string
  period_start?: string
  period_end?: string
}

export interface MealMeta {
  meal_purpose?: 'meeting' | 'entertainment' | 'welfare'
  attendee_count?: number
  attendees_internal?: string[]
  attendees_external?: string[]
  per_person?: number
  tag?: '会議費' | '接待交際費'
}

export interface ReimburseMeta {
  payee_account?: string
  items?: string
}

export interface CorpCardMeta {
  card_label?: string
  service_name?: string
  recurring?: boolean
}

export type ExpenseMeta =
  | (TransportMeta & Record<string, any>)
  | (MealMeta & Record<string, any>)
  | (ReimburseMeta & Record<string, any>)
  | (CorpCardMeta & Record<string, any>)
  | Record<string, any>

// ===== entities =====

export interface ExpenseAttachment {
  id: number
  request_id: number
  file_name: string
  mime_type: string
  file_size: number
  file_hash: string
  uploaded_by: string | null
  uploaded_at: string
}

export interface ExpenseStatusHistory {
  id: number
  request_id: number
  from_status: ExpenseStatus | null
  to_status: ExpenseStatus
  actor_id: string | null
  reason: string | null
  created_at: string
}

export interface ExpenseRequest {
  id: number
  user_id: string
  user_name?: string | null
  department?: string | null
  category: ExpenseCategory
  settlement_type: SettlementType
  used_at: string
  amount_incl_tax: number
  tax_rate: number
  amount_tax: number
  reduced_tax: boolean
  vendor_name: string | null
  invoice_number: string | null
  account_item_id: number | null
  tax_code: number | null
  purpose: string | null
  memo: string | null
  status: ExpenseStatus
  meta: ExpenseMeta
  freee_receipt_id: number | null
  freee_deal_id: number | null
  ocr_status: ExpenseOcrStatus
  subscription_id: number | null
  billing_month: string | null
  approver_id: string | null
  approved_at: string | null
  reject_reason: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  attachments?: ExpenseAttachment[] | null
  history?: ExpenseStatusHistory[] | null
}

export interface ExpenseSubscription {
  id: number
  owner_user_id: string
  owner_name?: string | null
  service_name: string
  card_label: string | null
  category: string
  cycle: 'month' | 'year'
  billing_day: number
  amount: number | null
  tax_rate: number
  active: boolean
  start_date: string | null
  end_date: string | null
  created_at: string
}

// ===== pending-summary (design §7) =====

export interface PendingSummary {
  my_awaiting_receipt: number
  admin_pending_approval?: number
  admin_awaiting_receipt?: number
}

// ===== freee mapping master (design §5 /freee/map) =====

export interface ExpenseFreeeMap {
  id: number
  category: string
  subtype: string | null
  account_item_id: number
  account_item_name: string | null
  updated_by: string | null
  updated_at: string
}

export interface FreeeAccountItem {
  id: number
  name: string
}

// ===== OCR poll result (design §5 /requests/:id/ocr) =====

export interface OcrResult {
  ocr_status: ExpenseOcrStatus
  amount_incl_tax?: number | null
  used_at?: string | null
  vendor_name?: string | null
  invoice_number?: string | null
}
