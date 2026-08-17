export type NaveenLoanFrequency = 'Daily' | 'Weekly' | 'Monthly' | 'Custom'
export type NaveenPaymentType = 'Paid' | 'Partial' | 'NotPaid' | 'Advance'
export type NaveenLoanStatus = 'Running' | 'Completed'
export type NaveenCashDirection = 'IN' | 'OUT'

export interface NaveenSupplier {
  id: number
  name: string
  mobile?: string
  address?: string
  createdAt: string
}

export interface NaveenSupplierPurchase {
  id: number
  supplierId: number
  date: string
  item?: string
  qty?: number
  rate?: number
  amount: number
  notes?: string
  createdBy: string
  createdAt: string
}

export interface NaveenSupplierPayment {
  id: number
  supplierId: number
  date: string
  amount: number
  notes?: string
  createdBy: string
  createdAt: string
}

export interface SupplierSummary {
  supplier: NaveenSupplier
  totalPurchases: number
  totalPaid: number
  balance: number
  purchases: NaveenSupplierPurchase[]
  payments: NaveenSupplierPayment[]
}

export interface NaveenBorrowing {
  id: number
  lenderName: string
  mobile?: string
  amount: number
  date: string
  interestPercent?: number
  notes?: string
  createdAt: string
}

export interface NaveenBorrowingRepayment {
  id: number
  borrowingId: number
  date: string
  amount: number
  notes?: string
  createdBy: string
  createdAt: string
}

export interface BorrowingSummary {
  borrowing: NaveenBorrowing
  totalPayable: number
  totalRepaid: number
  balance: number
  repayments: NaveenBorrowingRepayment[]
}

export interface NaveenLoan {
  id: number
  borrowerName: string
  mobile?: string
  address?: string
  amount: number
  date: string
  frequency: NaveenLoanFrequency
  installmentAmount: number
  totalInstallments: number
  paidInstallments: number
  totalPaid: number
  pendingAmount: number
  nextDueDate?: string
  groupKey?: string
  status: NaveenLoanStatus
  createdAt: string
}

export interface NaveenLoanPayment {
  id: number
  loanId: number
  date: string
  amount: number
  type: NaveenPaymentType
  collectedBy: string
  notes?: string
  createdAt: string
}

export interface LoanSummary {
  loan: NaveenLoan
  payments: NaveenLoanPayment[]
}

export interface NaveenCashEntry {
  id: number
  date: string
  direction: NaveenCashDirection
  category: string
  amount: number
  notes?: string
  createdBy: string
  createdAt: string
}

export interface NaveenCashSummary {
  date: string
  openingBalance: number
  loanCollections: number
  otherIncome: number
  supplierPayments: number
  borrowingRepayments: number
  otherExpense: number
  totalInflow: number
  totalOutflow: number
  closingBalance: number
  entries: NaveenCashEntry[]
}

export interface NaveenDashboard {
  cashAvailable: number
  moneyToReceive: number
  moneyToPay: number
  supplierBalance: number
  activeLoans: number
  activeBorrowings: number
  activeSuppliers: number
  totalAmount: number
  totalPaid: number
  totalPending: number
}

export interface NaveenBillItem {
  id: number
  billId: number
  item: string
  qty: number
  rate: number
  amount: number
}

export interface NaveenBill {
  id: number
  supplierId?: number
  purchaseId?: number
  customerName?: string
  date: string
  totalAmount: number
  createdBy: string
  createdAt: string
}

export interface BillDetail {
  bill: NaveenBill
  items: NaveenBillItem[]
  supplierName?: string
}
