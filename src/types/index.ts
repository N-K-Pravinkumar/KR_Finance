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
}
