export interface User {
  id: string
  name: string
  email: string
  team: string
  role: 'admin' | 'manager' | 'user'
  createdAt: string
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

