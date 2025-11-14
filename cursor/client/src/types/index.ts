export interface User {
  id: string
  name: string
  email: string
  team: string
  role: 'admin' | 'manager' | 'user' | 'marketer'
  createdAt: string
  lastLoginAt?: string | null
  
  // 직원 관리 추가 필드
  department?: string
  position?: string  // 사원, 주임, 대리, 팀장, 대표
  employmentStatus?: string  // 입사중, 입사전, 퇴사
  baseSalary?: number
  contractStartDate?: string
  contractEndDate?: string
  martId?: string
  transportationRoute?: string
  monthlyTransportationCost?: number
  transportationStartDate?: string
  transportationDetails?: string
}

export interface Customer {
  id: string
  companyName: string
  industry: string
  customerName: string
  title?: string
  phone1: string
  phone2?: string
  phone3?: string
  customerType: '개인사업자' | '법인사업자' | '단체/기관' | '개인'
  businessModel: '온라인' | '오프라인' | '온/오프' | '없음'
  region: string
  contractHistoryCategory?: string
  operatingPeriod?: string
  homepage?: string
  blog?: string
  instagram?: string
  otherChannel?: string
  kpiDataUrl?: string
  topExposureCount: number
  requirements?: string
  mainKeywords?: string[]
  monthlyBudget: number
  contractStartDate: string
  contractExpirationDate: string
  productType: string
  paymentDate: number
  status: CustomerStatus
  inflowPath: string
  manager: string
  managerTeam: string
  registrationDate: string
  lastContact?: string
  lastTalk?: string
  lastCall?: string
  memo?: string
}

export type CustomerStatus = '契約中' | '契約解除'

export interface CustomerHistory {
  id: string
  customerId: string
  userId: string
  userName: string
  type: 'call_attempt' | 'call_success' | 'kakao' | 'memo' | 'status_change' | 'contract_extended'
  content: string
  createdAt: string
  isPinned?: boolean
}

export interface RetargetingCustomer {
  id: string
  companyName: string
  industry: string
  customerName: string
  phone: string
  region?: string
  inflowPath?: string
  manager: string
  managerTeam: string
  status: '開始' | '認知' | '興味' | '欲求' | 'ゴミ箱' | 'trash' | string
  contractHistoryCategory?: string
  lastContactDate?: string
  memo?: string
  homepage?: string
  instagram?: string
  mainKeywords?: string[]
  registeredAt: string
}

export interface RetargetingHistory {
  id: string
  retargetingCustomerId: string
  userId: string
  userName: string
  type: 'missed_call' | 'call_success' | 'kakao' | 'memo' | 'status_change'
  content: string
  createdAt: string
  isPinned?: boolean
}


export interface Sales {
  id: string
  customerId?: string
  userId: string
  userName: string
  companyName: string
  payerName?: string
  paymentMethod?: string
  salesType: '신규매출' | '연장매출' | '해지매출'
  sourceType: string
  amount: number
  contractDate: string
  marketingContent?: string
  note?: string
  createdAt: string
}

export interface DashboardStats {
  totalSales: number
  contractCustomers: number
  newCustomers: number
  retargetingAcquired: number
  dbStatus: {
    salesStart: number
    awareness: number
    interest: number
    desire: number
  }
  myRetargetingProgress: {
    total: number
    target: number
    percentage: number
  }
}

export interface MonthlySales {
  month: string
  personalSales?: number
  totalSales?: number
  amount?: number
}

export interface SalesTrendData {
  months: string[]
  userSales: { [userName: string]: MonthlySales[] }
  totalSales: MonthlySales[]
}

export interface TeamSales {
  userId: string
  userName: string
  team: string
  totalSales: number
  monthlySales: MonthlySales[]
}

export interface CustomerFile {
  id: string
  customerId: string
  userId: string
  fileName: string
  originalName: string
  fileType: string
  fileSize: number
  createdAt: string
}

export interface RetargetingFile {
  id: string
  retargetingCustomerId: string
  userId: string
  fileName: string
  originalName: string
  fileType: string
  fileSize: number
  createdAt: string
}

export interface UserFile {
  id: string
  userId: string
  uploadedByUserId: string
  fileCategory: string  // 인사기록카드, 계약서, 이력서, 개인서류
  fileSubcategory?: string  // 급여명세서, 교통비영수증, 진단서 등
  yearMonth?: string  // YYYY-MM
  fileName: string
  originalName: string
  fileType: string
  fileSize: number
  createdAt: string
}

export interface InvoiceLineItem {
  name: string
  quantity: number
  unit_price: number | ''  // 빈 문자열 허용
  tax: number
  tax_rate: number  // 품목별 세율 (0, 8, 10)
}

export interface InvoiceFormData {
  company_id: number
  partner_name: string
  partner_title: '御中' | '様' | ''  // 경칭
  invoice_title: string  // 제목
  invoice_date: string
  due_date: string
  tax_entry_method: 'inclusive' | 'exclusive'  // 내세/외세
  line_items: InvoiceLineItem[]
  payment_bank_info?: string  // 송금처 정보
}

export interface FreeeCompany {
  id: number
  name: string
  display_name?: string
  role: string
}

export interface FreeeInvoice {
  id: number
  freee_invoice_id: number
  freee_company_id: number
  partner_name: string
  partner_zipcode?: string
  partner_address?: string
  invoice_date: string
  due_date: string
  total_amount: number
  tax_amount: number
  issued_by_user_id: string
  issued_by_user_name: string
  receipt_id?: string  // 영수증 ID (발급된 경우)
  created_at: string
  items: Array<{
    id: number
    item_name: string
    quantity: number
    unit_price: number
    tax: number
  }>
}

