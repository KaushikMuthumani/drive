'use client'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface NavItem { href: string; label: string; icon: string }

const adminNav: NavItem[] = [
  { href: '/admin/dashboard',   label: 'Dashboard',    icon: '⊞' },
  { href: '/admin/batches',     label: 'Batches',      icon: '◫' },
  { href: '/admin/attendance',  label: 'Attendance',   icon: '✓' },
  { href: '/admin/students',    label: 'Students',     icon: '◉' },
  { href: '/admin/rto',         label: 'RTO',          icon: '⊡' },
  { href: '/admin/enquiries',   label: 'Enquiries',    icon: '◷' },
  { href: '/admin/fleet',       label: 'Fleet',        icon: '◈' },
  { href: '/admin/instructors', label: 'Instructors',  icon: '◎' },
  { href: '/admin/reports',     label: 'Reports',      icon: '▤' },
  { href: '/admin/bot',         label: 'Telegram bot', icon: '✦' },
]
const instructorNav: NavItem[] = [
  { href: '/instructor/today',    label: 'Today',    icon: '✓' },
  { href: '/instructor/batches',  label: 'Batches',  icon: '◫' },
  { href: '/instructor/students', label: 'Students', icon: '◉' },
  { href: '/instructor/progress', label: 'Progress', icon: '◈' },
]

function ProfileActions({ role, onClose, className }: {
  role: 'admin' | 'instructor'
  onClose: () => void
  className?: string
}) {
  const router = useRouter()

  async function logout() {
    onClose()
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/auth/login'
  }

  function goToProfile() {
    onClose()
    const href = role === 'admin' ? '/admin/profile' : '/instructor/profile'
    router.push(href)
  }

  return (
    <div className={cn('space-y-1 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm', className)}>
      <button
        onClick={goToProfile}
        className="w-full flex items-center gap-2 text-sm text-slate-700 hover:text-slate-900 transition text-left"
      >
        <span className="text-xs opacity-60">⊙</span>
        Edit profile
      </button>
      <button
        onClick={logout}
        className="w-full flex items-center gap-2 text-sm text-red-600 hover:text-red-500 transition text-left"
      >
        <span className="text-xs opacity-60">↗</span>
        Sign out
      </button>
    </div>
  )
}

function MoreMenu({ nav, pathname }: { nav: NavItem[]; pathname: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  return (
    <div ref={ref} className="flex-1 relative">
      <button onClick={() => setOpen(o => !o)}
        className={cn('w-full flex flex-col items-center justify-center py-3 gap-0.5',
          nav.some(n => pathname.startsWith(n.href)) || open ? 'text-green-600' : 'text-slate-400')}>
        <span className="text-base leading-none font-bold">···</span>
        <span className="text-[10px] font-medium">More</span>
      </button>
      {open && (
        <div className="absolute bottom-full right-0 mb-1 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 min-w-[160px] z-[100]">
          {nav.map(item => (
            <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
              className={cn('flex items-center gap-2.5 px-4 py-2.5 text-sm transition',
                pathname.startsWith(item.href) ? 'text-green-700 font-medium bg-green-50' : 'text-slate-600 hover:bg-slate-50')}>
              <span className="text-xs w-4 text-center opacity-60">{item.icon}</span>{item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Shell({ role, userName, schoolName, children }: {
  role: 'admin' | 'instructor'; userName: string; schoolName: string; children: React.ReactNode
}) {
  const [showProfile, setShowProfile] = useState(false)
  const [pathname, setPathname]       = useState('/')

  useEffect(() => {
    const set = () => setPathname(window.location.pathname)
    set()
    window.addEventListener('popstate', set)
    const origPush    = window.history.pushState
    const origReplace = window.history.replaceState
    window.history.pushState    = function (...a) { const r = origPush.apply(this, a);    set(); return r }
    window.history.replaceState = function (...a) { const r = origReplace.apply(this, a); set(); return r }
    return () => {
      window.removeEventListener('popstate', set)
      window.history.pushState    = origPush
      window.history.replaceState = origReplace
    }
  }, [])

  const nav       = role === 'admin' ? adminNav : instructorNav
  const bottomNav = nav.slice(0, 4)
  const moreNav   = nav.slice(4)
  const initials  = userName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-52 bg-white border-r border-slate-200 flex-col flex-shrink-0">
        <div className="px-5 py-4 border-b border-slate-100">
          <div className="text-base font-bold text-slate-900">Drive<span className="text-green-600">India</span></div>
          <div className="text-xs text-slate-400 mt-0.5 truncate">{schoolName}</div>
        </div>
        <nav className="flex-1 py-2 overflow-y-auto">
          {nav.map(item => {
            const active = pathname.startsWith(item.href)
            return (
              <Link key={item.href} href={item.href}
                className={cn('flex items-center gap-2.5 px-4 py-2.5 text-sm transition mx-2 rounded-lg my-0.5',
                  active ? 'bg-green-50 text-green-700 font-medium' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800')}>
                <span className={cn('text-xs w-4 text-center', active ? '' : 'opacity-50')}>{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>
        {/* Profile — sidebar bottom */}
        <div className="px-3 py-3 border-t border-slate-100 relative">
          <button
            onClick={() => setShowProfile(s => !s)}
            className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 transition"
          >
            <div className="w-7 h-7 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div className="text-xs font-medium text-slate-700 truncate">{userName}</div>
              <div className="text-xs text-slate-400 capitalize">{role}</div>
            </div>
            <span className="text-slate-300 text-xs">⋯</span>
          </button>
          {showProfile && (
            <div className="mt-3 px-1">
              <ProfileActions role={role} onClose={() => setShowProfile(false)} />
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <header className="md:hidden bg-white border-b border-slate-200 px-4 flex items-center justify-between flex-shrink-0"
          style={{ paddingTop: 'max(env(safe-area-inset-top,0px),12px)', paddingBottom: '12px' }}>
          <div>
            <div className="text-base font-bold text-slate-900">Drive<span className="text-green-600">India</span></div>
            <div className="text-xs text-slate-400 truncate max-w-[160px]">{schoolName}</div>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowProfile(s => !s)}
              className="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold"
            >
              {initials}
            </button>
          </div>
        </header>
        {showProfile && (
          <div className="md:hidden border-b border-slate-200 px-4 pb-4">
            <ProfileActions role={role} onClose={() => setShowProfile(false)} />
          </div>
        )}

        <main className="flex-1 overflow-y-auto pb-24 md:pb-0">{children}</main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex z-40"
          style={{ paddingBottom: 'env(safe-area-inset-bottom,0px)' }}>
          {bottomNav.map(item => {
            const active = pathname.startsWith(item.href)
            return (
              <Link key={item.href} href={item.href}
                className={cn('flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 transition-colors',
                  active ? 'text-green-600' : 'text-slate-400')}>
                <span className="text-base leading-none">{item.icon}</span>
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            )
          })}
          {moreNav.length > 0 && <MoreMenu nav={moreNav} pathname={pathname} />}
        </nav>
      </div>
    </div>
  )
}
