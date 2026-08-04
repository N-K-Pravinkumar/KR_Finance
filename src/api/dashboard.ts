import { api } from './client'

export interface TrendPoint { date: string; amount: number }
export interface WeeklyTrendPoint { weekLabel: string; amount: number }
export interface MonthlyTrendPoint { monthLabel: string; amount: number }

export interface PaymentStatusBreakdown {
  paidCount: number
  paidAmount: number
  partialCount: number
  partialAmount: number
  notPaidCount: number
  notPaidAmount: number
  advanceCount: number
  advanceAmount: number
}

export interface DashboardData {
  todaysCollection: number
  weeklyCollection: number
  monthlyCollection: number
  pendingAmount: number
  overdueAmount: number
  totalCustomers: number
  activeCustomers: number
  recoveryPercent: number
  collectionPercent: number
  dailyTrend: TrendPoint[]
  weeklyTrend: WeeklyTrendPoint[]
  monthlyTrend: MonthlyTrendPoint[]
  pendingTrend: TrendPoint[]
  paymentStatusBreakdown: PaymentStatusBreakdown
}

export function fetchDashboard() {
  return api.get<DashboardData>('/dashboard').then((r) => r.data)
}
