'use client'
import { forwardRef, type HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

// ── Design tokens ─────────────────────────────────────────────────────────
// Brand: green-600 (#16a34a)
// Surface: white
// Background: #fafafa
// Border: #e5e7eb (gray-200)
// Text primary: #0f172a (slate-900)
// Text secondary: #64748b (slate-500)
// Text muted: #94a3b8 (slate-400)

// ── Badge ─────────────────────────────────────────────────────────────────
type BadgeVariant = 'green' | 'blue' | 'amber' | 'red' | 'gray' | 'purple'
const badgeStyles: Record<BadgeVariant, string> = {
  green:  'bg-green-50  text-green-700',
  blue:   'bg-blue-50   text-blue-700',
  amber:  'bg-amber-50  text-amber-700',
  red:    'bg-red-50    text-red-600',
  gray:   'bg-slate-100 text-slate-600',
  purple: 'bg-violet-50 text-violet-700',
}
export function Badge({ variant = 'gray', children, className }: {
  variant?: BadgeVariant; children: React.ReactNode; className?: string
}) {
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium',
      badgeStyles[variant], className
    )}>
      {children}
    </span>
  )
}

// ── Button ────────────────────────────────────────────────────────────────
type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
const btnStyles: Record<BtnVariant, string> = {
  primary:   'bg-green-600 text-white hover:bg-green-700 active:bg-green-800',
  secondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50',
  ghost:     'text-slate-600 hover:bg-slate-100',
  danger:    'bg-red-600 text-white hover:bg-red-700',
}
export const Button = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: BtnVariant; size?: 'xs' | 'sm' | 'md'; loading?: boolean
  }
>(({ variant = 'secondary', size = 'md', loading, children, className, disabled, ...props }, ref) => {
  const sizes = { xs: 'px-2.5 py-1 text-xs', sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2 text-sm' }
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center gap-1.5 font-medium rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97]',
        btnStyles[variant], sizes[size], className
      )}
      {...props}
    >
      {loading && <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin flex-shrink-0" />}
      {children}
    </button>
  )
})
Button.displayName = 'Button'

// ── Input ─────────────────────────────────────────────────────────────────
export const Input = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string; hint?: string }
>(({ label, error, hint, className, ...props }, ref) => (
  <div className="space-y-1">
    {label && <label className="block text-sm font-medium text-slate-700">{label}</label>}
    <input
      ref={ref}
      className={cn(
        'w-full px-3 py-2.5 text-sm bg-white border rounded-lg text-slate-900 placeholder-slate-400 transition outline-none',
        'border-slate-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/20',
        error && 'border-red-400 focus:border-red-400 focus:ring-red-400/20',
        className
      )}
      {...props}
    />
    {hint  && !error && <p className="text-xs text-slate-400">{hint}</p>}
    {error && <p className="text-xs text-red-500">{error}</p>}
  </div>
))
Input.displayName = 'Input'

// ── Select ────────────────────────────────────────────────────────────────
export const Select = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string; error?: string }
>(({ label, error, className, children, ...props }, ref) => (
  <div className="space-y-1">
    {label && <label className="block text-sm font-medium text-slate-700">{label}</label>}
    <select
      ref={ref}
      className={cn(
        'w-full px-3 py-2.5 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 transition outline-none',
        'focus:border-green-500 focus:ring-2 focus:ring-green-500/20',
        className
      )}
      {...props}
    >
      {children}
    </select>
    {error && <p className="text-xs text-red-500">{error}</p>}
  </div>
))
Select.displayName = 'Select'

// ── Card ──────────────────────────────────────────────────────────────────
export function Card({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('bg-white border border-slate-200 rounded-xl overflow-hidden', className)}
      {...props}
    >
      {children}
    </div>
  )
}

// ── StatCard ──────────────────────────────────────────────────────────────
export function StatCard({ label, value, sub, trend, accent }: {
  label: string; value: string | number; sub?: string
  trend?: 'up' | 'down'; accent?: boolean
}) {
  return (
    <div className={cn('rounded-xl p-4', accent ? 'bg-green-600 text-white' : 'bg-white border border-slate-200')}>
      <p className={cn('text-xs font-medium mb-1', accent ? 'text-green-100' : 'text-slate-500')}>{label}</p>
      <p className={cn('text-2xl font-bold tabular-nums', accent ? 'text-white' : 'text-slate-900')}>{value}</p>
      {sub && (
        <p className={cn('text-xs mt-0.5', accent ? 'text-green-100' : trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-500' : 'text-slate-400')}>
          {sub}
        </p>
      )}
    </div>
  )
}

// ── ProgressBar ───────────────────────────────────────────────────────────
export function ProgressBar({ value, max, className }: { value: number; max: number; className?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div className={cn('w-full bg-slate-100 rounded-full h-1.5', className)}>
      <div
        className="bg-green-500 h-1.5 rounded-full transition-all duration-300"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

// ── Avatar ────────────────────────────────────────────────────────────────
const palette = [
  'bg-green-100 text-green-700', 'bg-blue-100 text-blue-700',
  'bg-amber-100 text-amber-700', 'bg-rose-100 text-rose-700',
  'bg-violet-100 text-violet-700', 'bg-cyan-100 text-cyan-700',
]
export function Avatar({ name, size = 'md' }: { name: string; size?: 'xs' | 'sm' | 'md' | 'lg' }) {
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  const color    = palette[name.charCodeAt(0) % palette.length]
  const sz = { xs: 'w-6 h-6 text-xs', sm: 'w-8 h-8 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-11 h-11 text-base' }[size]
  return (
    <div className={cn('rounded-full flex items-center justify-center font-semibold flex-shrink-0 select-none', color, sz)}>
      {initials}
    </div>
  )
}

// ── Modal ─────────────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/30 backdrop-blur-[1px]" onClick={onClose}>
      <div
        className="bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-md p-6 max-h-[90dvh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition text-lg leading-none">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ── EmptyState ────────────────────────────────────────────────────────────
export function Empty({ icon, title, desc, action }: {
  icon: string; title: string; desc?: string; action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      <div className="text-4xl mb-3 select-none">{icon}</div>
      <p className="font-semibold text-slate-700 mb-1">{title}</p>
      {desc && <p className="text-sm text-slate-400 max-w-xs">{desc}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
