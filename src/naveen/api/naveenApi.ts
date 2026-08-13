import { api } from '../../api/client'
import type {
  BorrowingSummary, LoanSummary, NaveenBorrowing, NaveenBorrowingRepayment, NaveenCashEntry,
  NaveenCashSummary, NaveenDashboard, NaveenLoan, NaveenLoanPayment, NaveenSupplier,
  NaveenSupplierPayment, NaveenSupplierPurchase, SupplierSummary
} from '../types'

// Suppliers
export const listSuppliers = () => api.get<SupplierSummary[]>('/naveen/suppliers').then((r) => r.data)
export const getSupplier = (id: number) => api.get<SupplierSummary>(`/naveen/suppliers/${id}`).then((r) => r.data)
export const addSupplier = (payload: Partial<NaveenSupplier>) => api.post<NaveenSupplier>('/naveen/suppliers', payload).then((r) => r.data)
export const addSupplierPurchase = (supplierId: number, payload: Partial<NaveenSupplierPurchase>, createdBy: string) =>
  api.post<NaveenSupplierPurchase>(`/naveen/suppliers/${supplierId}/purchases?createdBy=${encodeURIComponent(createdBy)}`, payload).then((r) => r.data)
export const addSupplierPayment = (supplierId: number, payload: Partial<NaveenSupplierPayment>, createdBy: string) =>
  api.post<NaveenSupplierPayment>(`/naveen/suppliers/${supplierId}/payments?createdBy=${encodeURIComponent(createdBy)}`, payload).then((r) => r.data)

// Borrowings
export const listBorrowings = () => api.get<BorrowingSummary[]>('/naveen/borrowings').then((r) => r.data)
export const getBorrowing = (id: number) => api.get<BorrowingSummary>(`/naveen/borrowings/${id}`).then((r) => r.data)
export const addBorrowing = (payload: Partial<NaveenBorrowing>) => api.post<NaveenBorrowing>('/naveen/borrowings', payload).then((r) => r.data)
export const addBorrowingRepayment = (borrowingId: number, payload: Partial<NaveenBorrowingRepayment>, createdBy: string) =>
  api.post<NaveenBorrowingRepayment>(`/naveen/borrowings/${borrowingId}/repayments?createdBy=${encodeURIComponent(createdBy)}`, payload).then((r) => r.data)

// Loans (money given / receivables)
export const listLoans = () => api.get<LoanSummary[]>('/naveen/loans').then((r) => r.data)
export const getLoan = (id: number) => api.get<LoanSummary>(`/naveen/loans/${id}`).then((r) => r.data)
export const addLoan = (payload: Partial<NaveenLoan>) => api.post<NaveenLoan>('/naveen/loans', payload).then((r) => r.data)
export const recordLoanPayment = (loanId: number, payload: Partial<NaveenLoanPayment>) =>
  api.post<NaveenLoanPayment>(`/naveen/loans/${loanId}/payments`, payload).then((r) => r.data)

// Cash ledger
export const getCashSummary = (date?: string) => api.get<NaveenCashSummary>('/naveen/cash/summary', { params: date ? { date } : {} }).then((r) => r.data)
export const addCashEntry = (payload: Partial<NaveenCashEntry>, createdBy: string) =>
  api.post<NaveenCashEntry>(`/naveen/cash/entries?createdBy=${encodeURIComponent(createdBy)}`, payload).then((r) => r.data)
export const deleteCashEntry = (id: number) => api.delete(`/naveen/cash/entries/${id}`)

// Dashboard
export const getNaveenDashboard = () => api.get<NaveenDashboard>('/naveen/dashboard').then((r) => r.data)
