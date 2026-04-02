'use client'
import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

// ── Badge ──────────────────────────────────────────────────────────────────
type BadgeVariant = 'green' | 'blue' | 'amber' | 'red' | 'gray' | 'purple'
const badgeClass: Record<BadgeVariant, string> = {
  green:  'bg-emerald-50 text-emerald-700 border-emerald-200',
  blue:   'bg-blue-50 text-blue-700 border-blue-200',
  amber:  'bg-amber-50 text-amber-700 border-amber-200',
  red:    'bg-red-50 text-red-700 border-red-200',
  gray:   'bg-gray-100 text-gray-600 border-gray-200',
  purple: 'bg-violet-50 text-violet-700 border-violet-200',
}
export function Badge({
  variant = 'gray', children, className,
}: { variant?: BadgeVariant; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border whitespace-nowrap',
      badgeClass[variant], className
    )}>
      {children}
    </span>
  )
}

// ── Button ─────────────────────────────────────────────────────────────────
type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
const btnClass: Record<BtnVariant, string> = {
  primary:   'bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-600 active:scale-95',
  secondary: 'bg-white text-gray-700 hover:bg-gray-50 border-gray-200',
  ghost:     'bg-transparent text-gray-600 hover:bg-gray-100 border-transparent',
  danger:    'bg-red-600 text-white hover:bg-red-700 border-red-600 active:scale-95',
}
export const Button = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: BtnVariant
    size?: 'sm' | 'md' | 'lg'
    loading?: boolean
  }
>(({ variant = 'secondary', size = 'md', loading, children, className, disabled, ...props }, ref) => {
  const sz = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-5 py-2.5 text-base' }[size]
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center gap-2 font-medium rounded-lg border transition-all disabled:opacity-50 disabled:cursor-not-allowed',
        btnClass[variant], sz, className
      )}
      {...props}
    >
      {loading && (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin flex-shrink-0" />
      )}
      {children}
    </button>
  )
})
Button.displayName = 'Button'

// ── Input ──────────────────────────────────────────────────────────────────
export const Input = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }
>(({ label, error, className, ...props }, ref) => (
  <div className="space-y-1">
    {label && <label className="block text-sm font-medium text-gray-700">{label}</label>}
    <input
      ref={ref}
      className={cn(
        'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition placeholder-gray-400',
        error && 'border-red-400 focus:ring-red-400',
        className
      )}
      {...props}
    />
    {error && <p className="text-xs text-red-600">{error}</p>}
  </div>
))
Input.displayName = 'Input'

// ── Select ─────────────────────────────────────────────────────────────────
export const Select = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string; error?: string }
>(({ label, error, className, children, ...props }, ref) => (
  <div className="space-y-1">
    {label && <label className="block text-sm font-medium text-gray-700">{label}</label>}
    <select
      ref={ref}
      className={cn(
        'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition',
        className
      )}
      {...props}
    >
      {children}
    </select>
    {error && <p className="text-xs text-red-600">{error}</p>}
  </div>
))
Select.displayName = 'Select'

// ── Card ───────────────────────────────────────────────────────────────────
export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('bg-white border border-gray-100 rounded-xl', className)}>
      {children}
    </div>
  )
}

// ── StatCard ───────────────────────────────────────────────────────────────
export function StatCard({
  label, value, sub, trend,
}: { label: string; value: string | number; sub?: string; trend?: 'up' | 'down' }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3 md:p-4">
      <p className="text-xs text-gray-500 mb-1 truncate">{label}</p>
      <p className="text-xl md:text-2xl font-semibold text-gray-900">{value}</p>
      {sub && (
        <p className={cn(
          'text-xs mt-1 truncate',
          trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-red-500' : 'text-gray-400'
        )}>
          {sub}
        </p>
      )}
    </div>
  )
}

// ── ProgressBar ────────────────────────────────────────────────────────────
export function ProgressBar({ value, max, className }: { value: number; max: number; className?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div className={cn('w-full bg-gray-100 rounded-full h-1.5', className)}>
      <div className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
    </div>
  )
}

// ── Avatar ─────────────────────────────────────────────────────────────────
const avatarColors = [
  'bg-emerald-100 text-emerald-700',
  'bg-blue-100 text-blue-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-violet-100 text-violet-700',
]
export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  const color = avatarColors[name.charCodeAt(0) % avatarColors.length]
  const sz = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-11 h-11 text-base' }[size]
  return (
    <div className={cn('rounded-full flex items-center justify-center font-semibold flex-shrink-0', color, sz)}>
      {initials}
    </div>
  )
}

// ── Modal ──────────────────────────────────────────────────────────────────
export function Modal({
  open, onClose, title, children,
}: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-2xl md:rounded-2xl shadow-xl w-full md:max-w-md p-6 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none w-8 h-8 flex items-center justify-center">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ── EmptyState ─────────────────────────────────────────────────────────────
export function EmptyState({
  icon, title, description,
}: { icon: string; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      <div className="text-4xl mb-3">{icon}</div>
      <p className="font-medium text-gray-700 mb-1">{title}</p>
      <p className="text-sm text-gray-400">{description}</p>
    </div>
  )
}
