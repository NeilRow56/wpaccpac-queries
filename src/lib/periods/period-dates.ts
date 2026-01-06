// lib/periods/periodDates.ts
export function nextPeriodStart(endDate: string): string {
  const d = new Date(endDate)
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

export function nextPeriodEnd(endDate: string): string {
  const d = new Date(endDate)
  d.setFullYear(d.getFullYear() + 1)
  return d.toISOString().slice(0, 10)
}
