'use client'
import Link from 'next/link'
import { useState } from 'react'
import { StatCard, Card, Badge, Avatar } from '@/components/ui'
import PageHeader from '@/components/shared/PageHeader'
import { formatDate, formatSlotTime } from '@/lib/utils'
import { getDayLabel } from '@/lib/course/config'
import { toast } from 'sonner'

interface Props {
  stats: { students: number; activeBatches: number; todaySessions: number; pendingRto: number; unpaidFees: number; pendingReschedules: number }
  recentStudents: any[]
  todayBatches: any[]
  todaySessions: any[]
  rescheduleRequests: any[]
}

export default function AdminDashboard({ stats, recentStudents, todayBatches, todaySessions, rescheduleRequests }: Props) {
  const [requests, setRequests] = useState(rescheduleRequests)
  const [savingRequestId, setSavingRequestId] = useState<string | null>(null)

  async function updateRequest(request: any, status: 'approved' | 'rejected') {
    setSavingRequestId(request.id)
    const res = await fetch(`/api/reschedule-requests/${request.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status,
        approved_date: status === 'approved' ? request.requested_date : undefined,
        approved_time: status === 'approved' ? request.requested_time : undefined,
        instructor_note: status === 'approved' ? 'Approved by admin.' : 'Rejected by admin.',
      }),
    })
    const data = await res.json().catch(() => ({ error: 'Failed to update request' }))
    setSavingRequestId(null)
    if (!res.ok) {
      toast.error(data.error || 'Failed to update request')
      return
    }

    setRequests(prev => prev.filter((item: any) => item.id !== request.id))
    toast.success(`Request ${status}`)
  }

  return (
    <div className="p-4 md:p-6">
      <PageHeader
        title="Dashboard"
        subtitle="School overview"
        action={
          <Link href="/admin/students">
            <button className="px-3 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition active:scale-95">
              + Enroll student
            </button>
          </Link>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
        <StatCard label="Active students" value={stats.students} sub="currently enrolled" />
        <StatCard label="Active batches" value={stats.activeBatches} sub="running now" />
        <StatCard label="Sessions today" value={stats.todaySessions} sub="across all batches" />
        <StatCard label="Pending fees" value={stats.unpaidFees} sub="students unpaid" trend={stats.unpaidFees > 0 ? 'down' : undefined} />
        <StatCard label="Reschedule requests" value={requests.length} sub="awaiting approval" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-800">Today's sessions</h2>
            <Link href="/admin/attendance" className="text-xs text-emerald-600 hover:underline">Mark attendance</Link>
          </div>
          {todaySessions.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">No sessions scheduled today</p>
          ) : (
            <div className="space-y-2">
              {todaySessions.map(session => {
                const batch = todayBatches.find(b => b.id === session.batch_id)
                if (!batch) return null
                return (
                  <div key={session.id} className="flex items-center gap-3 p-2.5 rounded-lg border-l-2 border-emerald-400 bg-emerald-50/50">
                    <div className="text-sm font-bold text-emerald-700 w-16 flex-shrink-0">
                      {formatSlotTime(batch.slot_time?.slice(0, 5))}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{batch.name}</p>
                      <p className="text-xs text-gray-400">Session {session.session_num} · {batch.course_type}</p>
                    </div>
                    <Badge variant="blue">{getDayLabel(batch.day_pref)}</Badge>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-800">Recent enrollments</h2>
            <Link href="/admin/students" className="text-xs text-emerald-600 hover:underline">View all</Link>
          </div>
          {recentStudents.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">No students yet</p>
          ) : (
            <div className="space-y-3">
              {recentStudents.map(s => (
                <div key={s.id} className="flex items-center gap-3">
                  <Avatar name={s.name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{s.name}</p>
                    <p className="text-xs text-gray-400">{s.course_type} · {formatDate(s.enrolled_at)}</p>
                  </div>
                  <Badge variant={s.status === 'active' ? 'green' : s.status === 'completed' ? 'blue' : 'amber'}>
                    {s.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-800">Reschedule requests</h2>
            <span className="text-xs text-gray-400">{requests.length} pending</span>
          </div>
          {requests.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">No pending requests</p>
          ) : (
            <div className="space-y-3">
              {requests.map(request => (
                <div key={request.id} className="rounded-xl bg-gray-50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-gray-800 truncate">{request.student_name}</p>
                    <Badge variant="amber">pending</Badge>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{request.batch_name ?? 'No batch assigned'}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {request.requested_date ? formatDate(request.requested_date) : 'Flexible date'}{request.requested_time ? ` · ${request.requested_time}` : ''}
                  </p>
                  <p className="text-sm text-gray-700 mt-2">{request.reason}</p>
                  <div className="flex gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => updateRequest(request, 'approved')}
                      disabled={savingRequestId === request.id}
                      className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => updateRequest(request, 'rejected')}
                      disabled={savingRequestId === request.id}
                      className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 disabled:opacity-60"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { href: '/admin/batches', label: 'Manage batches', icon: '◈' },
          { href: '/admin/attendance', label: 'Mark attendance', icon: '✓' },
          { href: '/admin/rto', label: 'RTO tracker', icon: '◫' },
          { href: '/admin/profile', label: 'School profile', icon: '✎' },
        ].map(item => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-2 p-3 rounded-xl border border-gray-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition text-sm font-medium text-gray-700"
          >
            <span className="text-base">{item.icon}</span>{item.label}
          </Link>
        ))}
      </div>
    </div>
  )
}
