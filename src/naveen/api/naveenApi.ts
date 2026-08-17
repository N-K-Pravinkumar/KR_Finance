import { api } from '../../api/client'
import type {
  BillDetail, BorrowingSummary, LoanSummary, NaveenBorrowing, NaveenBorrowingRepayment, NaveenCashEntry,
  NaveenDashboard, NaveenLoan, NaveenLoanPayment, NaveenSupplier,
  NaveenSupplierPayment, NaveenSupplierPurchase, SupplierSummary
} from '../types'

// Suppliers
export const listSuppliers = () => api.get<SupplierSummary[]>('/naveen/suppliers').then((r) => r.data)
export const getSupplier = (id: number) => api.get<SupplierSummary>(`/naveen/suppliers/${id}`).then((r) => r.data)
export const addSupplier = (payload: Partial<NaveenSupplier>) => api.post<NaveenSupplier>('/naveen/suppliers', payload).then((r) => r.data)
export const updateSupplier = (id: number, payload: Partial<NaveenSupplier>) => api.put<NaveenSupplier>(`/naveen/suppliers/${id}`, payload).then((r) => r.data)
export const deleteSupplier = (id: number) => api.delete(`/naveen/suppliers/${id}`)

export const addSupplierPurchase = (supplierId: number, payload: Partial<NaveenSupplierPurchase>, createdBy: string) =>
  api.post<NaveenSupplierPurchase>(`/naveen/suppliers/${supplierId}/purchases?createdBy=${encodeURIComponent(createdBy)}`, payload).then((r) => r.data)
export const updateSupplierPurchase = (purchaseId: number, payload: Partial<NaveenSupplierPurchase>) =>
  api.put<NaveenSupplierPurchase>(`/naveen/suppliers/purchases/${purchaseId}`, payload).then((r) => r.data)
export const deleteSupplierPurchase = (purchaseId: number) => api.delete(`/naveen/suppliers/purchases/${purchaseId}`)

export const addSupplierPayment = (supplierId: number, payload: Partial<NaveenSupplierPayment>, createdBy: string) =>
  api.post<NaveenSupplierPayment>(`/naveen/suppliers/${supplierId}/payments?createdBy=${encodeURIComponent(createdBy)}`, payload).then((r) => r.data)
export const updateSupplierPayment = (paymentId: number, payload: Partial<NaveenSupplierPayment>) =>
  api.put<NaveenSupplierPayment>(`/naveen/suppliers/payments/${paymentId}`, payload).then((r) => r.data)
export const deleteSupplierPayment = (paymentId: number) => api.delete(`/naveen/suppliers/payments/${paymentId}`)

// Borrowings
export const listBorrowings = () => api.get<BorrowingSummary[]>('/naveen/borrowings').then((r) => r.data)
export const getBorrowing = (id: number) => api.get<BorrowingSummary>(`/naveen/borrowings/${id}`).then((r) => r.data)
export const addBorrowing = (payload: Partial<NaveenBorrowing>) => api.post<NaveenBorrowing>('/naveen/borrowings', payload).then((r) => r.data)
export const updateBorrowing = (id: number, payload: Partial<NaveenBorrowing>) => api.put<NaveenBorrowing>(`/naveen/borrowings/${id}`, payload).then((r) => r.data)
export const deleteBorrowing = (id: number) => api.delete(`/naveen/borrowings/${id}`)

export const addBorrowingRepayment = (borrowingId: number, payload: Partial<NaveenBorrowingRepayment>, createdBy: string) =>
  api.post<NaveenBorrowingRepayment>(`/naveen/borrowings/${borrowingId}/repayments?createdBy=${encodeURIComponent(createdBy)}`, payload).then((r) => r.data)
export const updateBorrowingRepayment = (repaymentId: number, payload: Partial<NaveenBorrowingRepayment>) =>
  api.put<NaveenBorrowingRepayment>(`/naveen/borrowings/repayments/${repaymentId}`, payload).then((r) => r.data)
export const deleteBorrowingRepayment = (repaymentId: number) => api.delete(`/naveen/borrowings/repayments/${repaymentId}`)

// Loans (money given / receivables)
export const listLoans = () => api.get<LoanSummary[]>('/naveen/loans').then((r) => r.data)
export const getLoan = (id: number) => api.get<LoanSummary>(`/naveen/loans/${id}`).then((r) => r.data)
export const addLoan = (payload: Partial<NaveenLoan>) => api.post<NaveenLoan>('/naveen/loans', payload).then((r) => r.data)
export const updateLoan = (id: number, payload: Partial<NaveenLoan>) => api.put<NaveenLoan>(`/naveen/loans/${id}`, payload).then((r) => r.data)
export const deleteLoan = (id: number) => api.delete(`/naveen/loans/${id}`)

export const recordLoanPayment = (loanId: number, payload: Partial<NaveenLoanPayment>) =>
  api.post<NaveenLoanPayment>(`/naveen/loans/${loanId}/payments`, payload).then((r) => r.data)
export const updateLoanPayment = (paymentId: number, payload: Partial<NaveenLoanPayment>) =>
  api.put<NaveenLoanPayment>(`/naveen/loans/payments/${paymentId}`, payload).then((r) => r.data)
export const deleteLoanPayment = (paymentId: number) => api.delete(`/naveen/loans/payments/${paymentId}`)

// Expenses (daily spending notes — replaces the old full Cash Ledger)
export const listExpenses = () => api.get<NaveenCashEntry[]>('/naveen/cash/entries').then((r) => r.data)
export const addExpense = (payload: Partial<NaveenCashEntry>, createdBy: string) =>
  api.post<NaveenCashEntry>(`/naveen/cash/entries?createdBy=${encodeURIComponent(createdBy)}`, payload).then((r) => r.data)
export const updateExpense = (id: number, payload: Partial<NaveenCashEntry>) =>
  api.put<NaveenCashEntry>(`/naveen/cash/entries/${id}`, payload).then((r) => r.data)
export const deleteExpense = (id: number) => api.delete(`/naveen/cash/entries/${id}`)

// Billing (itemized vegetable purchase invoices)
export interface BillItemInput { item: string; qty: number; rate: number }
export interface BillRequestPayload { supplierId?: number | null; customerName?: string; date: string; items: BillItemInput[] }
export const listBills = () => api.get<BillDetail[]>('/naveen/bills').then((r) => r.data)
export const getBill = (id: number) => api.get<BillDetail>(`/naveen/bills/${id}`).then((r) => r.data)
export const createBill = (payload: BillRequestPayload, createdBy: string) =>
  api.post<BillDetail>(`/naveen/bills?createdBy=${encodeURIComponent(createdBy)}`, payload).then((r) => r.data)
export const updateBill = (id: number, payload: BillRequestPayload, editedBy: string) =>
  api.put<BillDetail>(`/naveen/bills/${id}?editedBy=${encodeURIComponent(editedBy)}`, payload).then((r) => r.data)
export const deleteBill = (id: number) => api.delete(`/naveen/bills/${id}`)
export const downloadBillPdf = (id: number) => api.get(`/naveen/bills/${id}/pdf`, { responseType: 'blob' })

// Dashboard
export const getNaveenDashboard = () => api.get<NaveenDashboard>('/naveen/dashboard').then((r) => r.data)
