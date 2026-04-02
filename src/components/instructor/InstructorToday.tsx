'use client'
import { useState } from 'react'
import { Card, Badge, Avatar, Button } from '@/components/ui'
import PageHeader from '@/components/shared/PageHeader'
import { formatSlotTime } from '@/lib/utils'
import { toast } from 'sonner'

interface Props {
  myBatches: any[]
  todaySessions: any[]
  students: any[]
  existingAttendance: any[]
  today: string
  instructorName: string
  rescheduleRequests: any[]
}

export default function InstructorToday({ myBatches, todaySessions, students, existingAttendance, today, instructorName, rescheduleRequests: initialRequests }: Props) {
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<Set<string>>(new Set())
  const [requests, setRequests] = useState(initialRequests)
  const [attendance, setAtt] = useState<Record<string, Record<string, string>>>(() => {
    const map: Record<string, Record<string, string>> = {}
    existingAttendance.forEach(a => {
      if (!map[a.session_id]) map[a.session_id] = {}
      map[a.session_id][a.student_id] = a.status
    })
    return map
  })

  function studentsInBatch(batchId: string) {
    return students.filter(s => s.batch_id === batchId)
  }

  function mark(sessionId: string, studentId: string, status: string) {
    setAtt(prev => ({
      ...prev,
      [sessionId]: { ...(prev[sessionId] ?? {}), [studentId]: status },
    }))
  }

  async function updateRequest(id: string, status: 'approved' | 'rejected', request: any) {
    const res = await fetch(`/api/reschedule-requests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status,
        approved_date: status === 'approved' ? request.requested_date : undefined,
        approved_time: status === 'approved' ? request.requested_time : undefined,
        instructor_note: status === 'approved' ? 'Makeup class approved.' : 'Unable to approve this slot.',
      }),
    })
    const data = await res.json().catch(() => ({ error: 'Failed to update request' }))
    if (!res.ok) { toast.error(data.error || 'Failed to update request'); return }
    setRequests(prev => prev.map((item: any) => item.id === id ? { ...item, ...data.data } : item))
    toast.success(`Request ${status}`)
  }

  async function saveSession(sessionId: string, batchId: string) {
    const bStudents = studentsInBatch(batchId)
    const records = bStudents.map(s => ({
      student_id: s.id,
      status: attendance[sessionId]?.[s.id] ?? 'present',
    }))
    setSaving(sessionId)
    const res = await fetch(`/api/sessions/${sessionId}/attendance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ records }),
    })
    setSaving(null)
    if (!res.ok) { toast.error('Failed to save attendance'); return }
    setSaved(prev => new Set([...prev, sessionId]))
    toast.success('Attendance saved')
  }

  const dateLabel = new Date(today + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  return (
    <div className="p-4 md:p-6">
      <PageHeader title="Today" subtitle={dateLabel} />

      {requests.length > 0 && (
        <Card className="p-4 mb-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-800">Reschedule requests</h2>
            <Badge variant="blue">{requests.length}</Badge>
          </div>
          <div className="space-y-3">
            {requests.map((request: any) => (
              <div key={request.id} className="rounded-xl bg-gray-50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-800">{request.student_name}</p>
                  <Badge variant={request.status === 'approved' ? 'green' : request.status === 'rejected' ? 'red' : 'amber'}>
                    {request.status}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 mt-1">{request.batch_name ?? 'No batch'}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Preferred: {request.requested_date ? new Date(request.requested_date).toLocaleDateString('en-IN') : 'Flexible'}{request.requested_time ? ` · ${request.requested_time}` : ''}
                </p>
                <p className="text-sm text-gray-700 mt-2">{request.reason}</p>
                {request.approved_date && (
                  <p className="text-xs text-emerald-700 mt-2">
                    Approved for {new Date(request.approved_date).toLocaleDateString('en-IN')}{request.approved_time ? ` at ${request.approved_time}` : ''}
                  </p>
                )}
                {request.instructor_note && (
                  <p className="text-xs text-gray-500 mt-2">{request.instructor_note}</p>
                )}
                {request.status === 'pending' && (
                  <div className="flex gap-2 mt-3">
                    <Button variant="primary" className="flex-1 justify-center" onClick={() => updateRequest(request.id, 'approved', request)}>
                      Approve
                    </Button>
                    <Button className="flex-1 justify-center" onClick={() => updateRequest(request.id, 'rejected', request)}>
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {myBatches.length === 0 ? (
        <Card className="p-10 text-center text-gray-400">
          No active batches assigned to you yet.
        </Card>
      ) : todaySessions.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-gray-500 font-medium">No sessions today</p>
          <p className="text-sm text-gray-400 mt-1">Check your batch schedule for upcoming dates.</p>
        </Card>
      ) : (
        <div className="space-y-5">
          {todaySessions.map(session => {
            const batch = myBatches.find(b => b.id === session.batch_id)
            if (!batch) return null
            const bStudents = studentsInBatch(batch.id)
            const isSaved = saved.has(session.id)
            const alreadyMarked = existingAttendance.some(a => a.session_id === session.id)

            return (
              <Card key={session.id} className="p-4">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg font-bold text-emerald-600">
                        {formatSlotTime(batch.slot_time?.slice(0, 5))}
                      </span>
                      <Badge variant={batch.day_pref === 'weekdays' ? 'blue' : batch.day_pref === 'weekends' ? 'amber' : 'gray'}>
                        {batch.day_pref}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium text-gray-700">{batch.name}</p>
                    <p className="text-xs text-gray-400">Session {session.session_num} · {batch.course_type}</p>
                  </div>
                  {(isSaved || alreadyMarked) && (
                    <span className="text-xs text-emerald-600 font-medium bg-emerald-50 px-2.5 py-1 rounded-lg">Saved</span>
                  )}
                </div>

                {bStudents.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">No students in this batch yet.</p>
                ) : (
                  <div className="space-y-2 mb-4">
                    {bStudents.map(s => {
                      const status = attendance[session.id]?.[s.id] ?? 'present'
                      return (
                        <div key={s.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50">
                          <Avatar name={s.name} size="sm" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{s.name}</p>
                            <p className="text-xs text-gray-400">{s.phone}</p>
                          </div>
                          <div className="flex gap-1.5">
                            {(['present', 'absent', 'holiday'] as const).map(opt => (
                              <button
                                key={opt}
                                onClick={() => mark(session.id, s.id, opt)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition active:scale-95 ${
                                  status === opt
                                    ? opt === 'present' ? 'bg-emerald-500 text-white'
                                      : opt === 'absent' ? 'bg-red-500 text-white'
                                      : 'bg-gray-400 text-white'
                                    : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-300'
                                }`}
                              >
                                {opt === 'present' ? 'P' : opt === 'absent' ? 'A' : 'H'}
                              </button>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {bStudents.length > 0 && (
                  <Button
                    variant="primary"
                    loading={saving === session.id}
                    onClick={() => saveSession(session.id, batch.id)}
                    className="w-full justify-center"
                  >
                    {isSaved || alreadyMarked ? 'Update attendance' : 'Save attendance'}
                  </Button>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
