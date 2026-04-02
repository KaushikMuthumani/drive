import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)) }

export function formatDate(d: string | Date) {
  return new Intl.DateTimeFormat('en-IN', { day:'2-digit', month:'short', year:'numeric' }).format(new Date(d))
}
export function formatTime(d: string | Date) {
  return new Intl.DateTimeFormat('en-IN', { hour:'2-digit', minute:'2-digit', hour12:true }).format(new Date(d))
}
export function formatINR(n: number) {
  return new Intl.NumberFormat('en-IN', { style:'currency', currency:'INR', maximumFractionDigits:0 }).format(n)
}
export function pct(n: number, total: number) {
  return total === 0 ? 0 : Math.round((n / total) * 100)
}
export function formatSlotTime(t?: string): string {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const ampm = h < 12 ? 'AM' : 'PM'
  const h12  = h % 12 || 12
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`
}
export function getDayLabel(pref: string): string {
  return { weekdays:'Mon–Sat', weekends:'Sat–Sun', all:'Daily' }[pref] ?? pref
}
