export function formatCurrency(value: number | undefined | null): string {
  const v = value ?? 0
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(v)
}

export function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function daysBetween(from: Date, to: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate())
  return Math.round((b.getTime() - a.getTime()) / msPerDay)
}

export function dueLabel(nextDueDate?: string | null, financeType?: 'Daily' | 'Weekly'): string {
  if (!nextDueDate) return 'N/A'
  const days = daysBetween(new Date(), new Date(nextDueDate))
  if (financeType === 'Weekly') {
    const weeks = Math.round(days / 7)
    if (days < 0) return `${Math.abs(weeks)} week(s) overdue`
    return `${weeks} week(s) left`
  }
  if (days < 0) return `${Math.abs(days)} day(s) overdue`
  return `${days} day(s) left`
}

export function isOverdue(nextDueDate?: string | null, status?: string): boolean {
  if (!nextDueDate || status !== 'Running') return false
  return new Date(nextDueDate) < new Date(new Date().toDateString())
}

export function isDueToday(nextDueDate?: string | null): boolean {
  if (!nextDueDate) return false
  const today = new Date().toDateString()
  return new Date(nextDueDate).toDateString() === today
}

export function buildWhatsAppMessage(params: {
  name: string
  pendingAmount: number
  lastPaymentDate?: string
  lastPaymentAmount?: number
  nextDueDate?: string
  financeType: 'Daily' | 'Weekly'
}): string {
  const { name, pendingAmount, lastPaymentDate, lastPaymentAmount, nextDueDate, financeType } = params
  const due = dueLabel(nextDueDate, financeType)
  const lines = [
    `Hello ${name},`,
    `This is a reminder from your finance collection agent.`,
    `Pending / Current Balance: ${formatCurrency(pendingAmount)}`,
    lastPaymentDate ? `Last Payment: ${formatCurrency(lastPaymentAmount)} on ${formatDate(lastPaymentDate)}` : `Last Payment: No payments yet`,
    `Next Due Date: ${formatDate(nextDueDate)} (${due})`,
    `Please make your payment on time. Thank you!`
  ]
  return lines.join('\n')
}

export function buildWhatsAppLink(mobile: string, message: string): string {
  const digits = mobile.replace(/\D/g, '')
  const withCountryCode = digits.length === 10 ? `91${digits}` : digits
  return `https://wa.me/${withCountryCode}?text=${encodeURIComponent(message)}`
}
