'use client'
import Link from 'next/link'
import { Card, Badge, Avatar, StatCard, ProgressBar } from '@/components/ui'
import { formatDate, formatSlotTime, formatINR } from '@/lib/utils'
import { getDayLabel } from '@/lib/course/config'
import { toast } from 'sonner'
import { useState } from 'react'

interface Props {
  stats: {
    students: number; activeBatches: number; todaySessions: number; pendingRto: number
    unpaidFees: number; unpaidAmount: number; attendanceToday: number; totalToday: number
    pendingPayments: number; followUpToday: number
  }
  recentStudents: any[]; todayBatches: any[]; todaySessions: any[]
  markedSessionIds: string[]
  unpaidStudents: any[]; pendingPayments: any[]; rtoSoon: any[]
}

export default function AdminDashboard({
  stats, recentStudents, todayBatches, todaySessions,
  markedSessionIds, unpaidStudents, pendingPayments, rtoSoon
}: Props) {
  const [confirming, setConfirming] = useState<string | null>(null)
  const [confirmed, setConfirmed]   = useState<Set<string>>(new Set())
  const marked = new Set(markedSessionIds)

  const todayStr = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })

  async function confirmPayment(paymentId: string) {
    setConfirming(paymentId)
    const res = await fetch(`/api/fee-payments/${paymentId}/confirm`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: '{}'
    })
    setConfirming(null)
    if (!res.ok) { toast.error('Confirm failed'); return }
    setConfirmed(s => new Set([...s, paymentId]))
    toast.success('Payment confirmed · Receipt generated')
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-400 mt-0.5">{todayStr}</p>
        </div>
        <Link href="/admin/students">
          <button className="bg-green-600 text-white text-sm font-medium px-3 py-2 rounded-lg hover:bg-green-700 transition active:scale-95">
            + Enroll
          </button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatCard label="Active students"  value={stats.students}      sub="enrolled" />
        <StatCard label="Batches running"  value={stats.activeBatches} sub="active" />
        <StatCard label="Today's sessions" value={stats.todaySessions}
          sub={stats.totalToday > 0 ? `${stats.attendanceToday}/${stats.totalToday} marked` : 'no sessions'} />
        <StatCard label="Pending fees"     value={stats.unpaidFees}
          sub={stats.unpaidAmount > 0 ? formatINR(stats.unpaidAmount) + ' due' : 'all clear'}
          trend={stats.unpaidFees > 0 ? 'down' : undefined} />
      </div>

      {/* Alert strips */}
      {rtoSoon.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3 mb-3">
          <p className="text-sm text-amber-800">
            <span className="font-semibold">{rtoSoon.length} student{rtoSoon.length > 1 ? 's' : ''}</span> have RTO test within 7 days
            {rtoSoon.length === 1 ? ` — ${rtoSoon[0].studentName} on ${rtoSoon[0].test_date}` : ''}
          </p>
          <Link href="/admin/rto" className="text-xs font-medium text-amber-700 underline flex-shrink-0">View →</Link>
        </div>
      )}
      {stats.pendingPayments > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3 mb-3">
          <p className="text-sm text-blue-800">
            <span className="font-semibold">{stats.pendingPayments} payment{stats.pendingPayments > 1 ? 's' : ''}</span> waiting for confirmation
          </p>
          <Link href="/admin/students" className="text-xs font-medium text-blue-700 underline flex-shrink-0">Review →</Link>
        </div>
      )}
      {stats.followUpToday > 0 && (
        <div className="bg-violet-50 border border-violet-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3 mb-3">
          <p className="text-sm text-violet-800">
            <span className="font-semibold">{stats.followUpToday} enquir{stats.followUpToday > 1 ? 'ies' : 'y'}</span> need follow-up today
          </p>
          <Link href="/admin/enquiries" className="text-xs font-medium text-violet-700 underline flex-shrink-0">View →</Link>
        </div>
      )}

      {/* Pending payment confirmations inline */}
      {pendingPayments.filter(p => !confirmed.has(p.id)).length > 0 && (
        <Card className="mb-4">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <span className="text-sm font-semibold text-slate-800">Confirm payments</span>
          </div>
          {pendingPayments.filter(p => !confirmed.has(p.id)).map(p => (
            <div key={p.id} className="flex items-center gap-3 px-4 py-3 border-b border-slate-50 last:border-0">
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-800">{formatINR(Number(p.amount))} via {p.payment_mode}</p>
                <p className="text-xs text-slate-400">{formatDate(p.paid_at)}</p>
              </div>
              <button onClick={() => confirmPayment(p.id)} disabled={confirming === p.id}
                className="bg-green-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-green-700 disabled:opacity-50 transition">
                {confirming === p.id ? '…' : 'Confirm ✓'}
              </button>
            </div>
          ))}
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Today's sessions — with marked/pending status */}
        <Card>
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <span className="text-sm font-semibold text-slate-800">Today</span>
            <Link href="/admin/attendance" className="text-xs text-green-600 font-medium">Mark attendance →</Link>
          </div>
          {todaySessions.length === 0
            ? <div className="px-4 py-8 text-center text-sm text-slate-400">No sessions today</div>
            : todaySessions.slice(0, 5).map(session => {
                const batch    = todayBatches.find(b => b.id === session.batch_id)
                if (!batch) return null
                const isMarked = marked.has(session.id)
                return (
                  <div key={session.id} className="flex items-center gap-3 px-4 py-3 border-b border-slate-50 last:border-0">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isMarked ? 'bg-green-500' : 'bg-amber-400'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{batch.name}</p>
                      <p className="text-xs text-slate-400">
                        {formatSlotTime(batch.slot_time?.slice(0, 5))} · Session {session.session_num}/{batch.total_sessions}
                      </p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${isMarked ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                      {isMarked ? 'Marked' : 'Pending'}
                    </span>
                  </div>
                )
              })
          }
        </Card>

        {/* Fee alerts */}
        <Card>
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <span className="text-sm font-semibold text-slate-800">Fee alerts</span>
            <Link href="/admin/students" className="text-xs text-green-600 font-medium">All →</Link>
          </div>
          {unpaidStudents.length === 0
            ? (
              <div className="px-4 py-8 text-center">
                <p className="text-2xl mb-1">✓</p>
                <p className="text-sm text-slate-500 font-medium">All fees collected</p>
              </div>
            )
            : unpaidStudents.slice(0, 5).map(s => (
              <div key={s.id} className="flex items-center gap-3 px-4 py-3 border-b border-slate-50 last:border-0">
                <Avatar name={s.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{s.name}</p>
                  <p className="text-xs text-slate-400">{s.phone}</p>
                </div>
                <Badge variant="red">Unpaid</Badge>
              </div>
            ))
          }
        </Card>

        {/* Recent enrollments */}
        <Card>
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <span className="text-sm font-semibold text-slate-800">Recent enrollments</span>
            <Link href="/admin/students" className="text-xs text-green-600 font-medium">All →</Link>
          </div>
          {recentStudents.length === 0
            ? <div className="px-4 py-8 text-center text-sm text-slate-400">No students yet</div>
            : recentStudents.slice(0, 5).map(s => (
              <div key={s.id} className="flex items-center gap-3 px-4 py-3 border-b border-slate-50 last:border-0">
                <Avatar name={s.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{s.name}</p>
                  <p className="text-xs text-slate-400">{s.course_type} · {formatDate(s.enrolled_at)}</p>
                </div>
                <Badge variant={s.status === 'active' ? 'green' : s.status === 'completed' ? 'blue' : 'gray'}>
                  {s.status}
                </Badge>
              </div>
            ))
          }
        </Card>

        {/* Quick actions */}
        <Card>
          <div className="px-4 py-3 border-b border-slate-100">
            <span className="text-sm font-semibold text-slate-800">Quick actions</span>
          </div>
          <div className="grid grid-cols-2 gap-0 divide-x divide-y divide-slate-100">
            {[
              ['/admin/batches',     '◫', 'New batch'],
              ['/admin/students',    '◉', 'Enroll student'],
              ['/admin/attendance',  '✓', 'Attendance'],
              ['/admin/rto',         '⊡', 'Update RTO'],
              ['/admin/enquiries',   '◷', 'Enquiries'],
              ['/admin/reports',     '▤', 'Reports'],
            ].map(([href, icon, label]) => (
              <Link key={href as string} href={href as string}
                className="flex flex-col items-center justify-center gap-1.5 py-5 hover:bg-slate-50 transition active:bg-slate-100">
                <span className="text-lg text-slate-400">{icon}</span>
                <span className="text-xs font-medium text-slate-600">{label}</span>
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
