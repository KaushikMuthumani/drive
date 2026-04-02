'use client'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface NavItem { href: string; label: string; icon: string }
interface ShellProps {
  role: 'admin' | 'instructor'
  userName: string
  schoolName: string
  children: React.ReactNode
}

const adminNav: NavItem[] = [
  { href:'/admin/dashboard',   label:'Dashboard',   icon:'▦' },
  { href:'/admin/batches',     label:'Batches',     icon:'◈' },
  { href:'/admin/students',    label:'Students',    icon:'◉' },
  { href:'/admin/attendance',  label:'Attendance',  icon:'✓' },
  { href:'/admin/rto',         label:'RTO',         icon:'◫' },
  { href:'/admin/fleet',       label:'Fleet',       icon:'◻' },
  { href:'/admin/instructors', label:'Instructors', icon:'◎' },
  { href:'/admin/reports',     label:'Reports',     icon:'▨' },
]
const instructorNav: NavItem[] = [
  { href:'/instructor/today',    label:'Today',      icon:'▦' },
  { href:'/instructor/batches',  label:'Batches',    icon:'◈' },
  { href:'/instructor/students', label:'Students',   icon:'◉' },
  { href:'/instructor/progress', label:'Progress',   icon:'◫' },
]

// Bottom tab: first 4 items + More
const adminBottomNav       = adminNav.slice(0, 4)
const instructorBottomNav  = instructorNav.slice(0, 4)

function MoreMenu({ nav, pathname }: { nav: NavItem[]; pathname: string }) {
  const [open, setOpen]   = useState(false)
  const ref               = useRef<HTMLDivElement>(null)
  const activeInMore      = nav.some(item => pathname.startsWith(item.href))

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="flex-1 relative">
      <button onClick={() => setOpen(o => !o)}
        className={cn('w-full flex flex-col items-center justify-center py-2.5 gap-0.5 transition-colors',
          activeInMore || open ? 'text-emerald-600' : 'text-gray-400')}>
        <span className="text-base leading-none font-bold">···</span>
        <span className="text-xs font-medium">More</span>
      </button>
      {open && (
        <div className="absolute bottom-full right-0 mb-2 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 min-w-[160px] z-50">
          {nav.map(item => (
            <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
              className={cn('flex items-center gap-3 px-4 py-3 text-sm transition-colors',
                pathname.startsWith(item.href) ? 'text-emerald-700 font-medium bg-emerald-50' : 'text-gray-600 hover:bg-gray-50')}>
              <span className="text-sm">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Shell({ role, userName, schoolName, children }: ShellProps) {
  const pathname   = usePathname()
  const nav        = role === 'admin' ? adminNav : instructorNav
  const bottomNav  = role === 'admin' ? adminBottomNav : instructorBottomNav
  const moreNav    = role === 'admin' ? adminNav.slice(4) : instructorNav.slice(4)
  const initials   = userName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 bg-white border-r border-gray-100 flex-col flex-shrink-0">
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="text-base font-bold text-gray-900">Drive<span className="text-emerald-600">India</span></div>
          <div className="text-xs text-gray-400 mt-0.5 truncate">{schoolName}</div>
        </div>
        <nav className="flex-1 py-3 overflow-y-auto">
          {nav.map(item => (
            <Link key={item.href} href={item.href}
              className={cn('flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors border-l-2',
                pathname.startsWith(item.href)
                  ? 'text-emerald-700 font-medium bg-emerald-50 border-emerald-500'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800 border-transparent')}>
              <span className="text-xs w-4 text-center">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="px-4 py-3 border-t border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold flex-shrink-0">{initials}</div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-gray-800 truncate">{userName}</div>
              <div className="text-xs text-gray-400 capitalize">{role}</div>
            </div>
            <form action="/api/auth/logout" method="POST">
              <button type="submit" className="text-xs text-gray-400 hover:text-gray-600 transition">Out</button>
            </form>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <header className="md:hidden bg-white border-b border-gray-100 px-4 flex items-center justify-between flex-shrink-0"
          style={{ paddingTop:'max(env(safe-area-inset-top, 0px), 12px)', paddingBottom:'12px' }}>
          <div>
            <div className="text-base font-bold text-gray-900">Drive<span className="text-emerald-600">India</span></div>
            <div className="text-xs text-gray-400 truncate max-w-[180px]">{schoolName}</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">{initials}</div>
            <form action="/api/auth/logout" method="POST">
              <button type="submit" className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1">Sign out</button>
            </form>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto pb-24 md:pb-0">
          {children}
        </main>

        {/* Mobile bottom tab bar */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex z-40"
          style={{ paddingBottom:'env(safe-area-inset-bottom, 0px)' }}>
          {bottomNav.map(item => {
            const active = pathname.startsWith(item.href)
            return (
              <Link key={item.href} href={item.href}
                className={cn('flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 transition-colors',
                  active ? 'text-emerald-600' : 'text-gray-400')}>
                <span className="text-base leading-none">{item.icon}</span>
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            )
          })}
          {moreNav.length > 0 && <MoreMenu nav={moreNav} pathname={pathname} />}
        </nav>
      </div>
    </div>
  )
}
