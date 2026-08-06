export type FinanceType = 'Daily' | 'Weekly'
export type CustomerStatus = 'Running' | 'Completed' | 'Closed'
export type PaymentType = 'Paid' | 'Partial' | 'NotPaid' | 'Advance'
export type Role = 'Admin' | 'Staff'

export interface Customer {
  id: number
  name: string
  mobile: string
  alternateMobile?: string
  groupKey?: string
  address: string
  financeAmount: number
  interest: number
  startDate: string
  financeType: FinanceType
  collectionDay?: string | null
  installmentAmount: number
  totalInstallments: number
  paidInstallments: number
  totalAmount: number
  totalPaid: number
  pendingAmount: number
  currentBalance: number
  nextDueDate: string
  endDate?: string
  lastPaymentDate?: string
  lastPaymentAmount?: number
  lastPaymentType?: PaymentType
  status: CustomerStatus
  createdAt: string
}

export interface Payment {
  id: number
  customerId: number
  date: string
  amount: number
  type: PaymentType
  collectedBy: string
  notes?: string
  isEdited: boolean
  editedAt?: string
  editedBy?: string
  editReason?: string
  createdAt: string
}

export interface TimelineEntry {
  installmentNo: number
  date: string
  status: 'Paid' | 'Partial' | 'NotPaid' | 'Advance' | 'Pending' | 'Due' | 'NotMarked'
  amount?: number
  paymentId?: number
  today: boolean
}

export interface AuditEntry {
  id: number
  entity: string
  entityId: number
  customerName: string
  field: string
  oldValue: string
  newValue: string
  editedBy: string
  dateTime: string
  reason: string
}

export interface AuthUser {
  id: number
  name: string
  username: string
  role: Role
  token: string
}

export interface OrgSummary {
  totalCustomers: number
  totalFinanced: number
  totalCollected: number
  totalPending: number
  runningCount: number
  completedCount: number
  closedCount: number
  overdueCount: number
  todayToCollect?: number
  todayCollected?: number
  todayNotCollected?: number
}

export interface DailyReportRow {
  customerId: number
  name: string
  mobile: string
  totalLoanAmount: number
  totalPaid: number
  balanceAmount: number
  dailyCollection: number
  daysPaid: number
  totalInstallments: number
  todayStatus: 'Paid' | 'Partial' | 'NotPaid' | 'Advance' | 'Pending' | 'Not Due Yet'
  todayAmount?: number
}

export interface DailyReport {
  date: string
  totalToCollect: number
  totalCollected: number
  totalNotCollected: number
  paidCount: number
  notPaidCount: number
  partialCount: number
  advanceCount: number
  rows: DailyReportRow[]
}

export type CashExpenseCategory = 'PetrolAllowance' | 'FoodAllowance' | 'Salary' | 'SentToPerson' | 'Other'

export interface CashExpense {
  id: number
  date: string
  amount: number
  category: CashExpenseCategory
  recipientName?: string
  sentVia?: string
  notes?: string
  createdBy: string
  createdAt: string
}

export interface CashLedgerSummary {
  date: string
  openingBalance: number
  collectedToday: number
  expensesToday: number
  closingBalance: number
  expenses: CashExpense[]
}
