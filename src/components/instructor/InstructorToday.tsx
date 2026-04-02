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
}

export default function InstructorToday({ myBatches, todaySessions, students, existingAttendance, today, instructorName }: Props) {
  const [saving, setSaving]     = useState<string | null>(null)
  const [saved, setSaved]       = useState<Set<string>>(new Set())
  const [attendance, setAtt]    = useState<Record<string, Record<string, string>>>(() => {
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

  async function saveSession(sessionId: string, batchId: string) {
    const bStudents = studentsInBatch(batchId)
    const records   = bStudents.map(s => ({
      student_id: s.id,
      status:     attendance[sessionId]?.[s.id] ?? 'present',
    }))
    setSaving(sessionId)
    const res = await fetch(`/api/sessions/${sessionId}/attendance`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ records }),
    })
    setSaving(null)
    if (!res.ok) { toast.error('Failed to save attendance'); return }
    setSaved(prev => new Set([...prev, sessionId]))
    toast.success('Attendance saved ✓')
  }

  const dateLabel = new Date(today + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  if (myBatches.length === 0) {
    return (
      <div className="p-4 md:p-6">
        <PageHeader title="Today" subtitle={dateLabel} />
        <Card className="p-10 text-center text-gray-400">
          No active batches assigned to you yet.
        </Card>
      </div>
    )
  }

  if (todaySessions.length === 0) {
    return (
      <div className="p-4 md:p-6">
        <PageHeader title="Today" subtitle={dateLabel} />
        <Card className="p-10 text-center">
          <p className="text-gray-500 font-medium">No sessions today</p>
          <p className="text-sm text-gray-400 mt-1">Check your batch schedule for upcoming dates.</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6">
      <PageHeader title="Today" subtitle={dateLabel} />

      <div className="space-y-5">
        {todaySessions.map(session => {
          const batch    = myBatches.find(b => b.id === session.batch_id)
          if (!batch) return null
          const bStudents = studentsInBatch(batch.id)
          const isSaved   = saved.has(session.id)
          const alreadyMarked = existingAttendance.some(a => a.session_id === session.id)

          return (
            <Card key={session.id} className="p-4">
              {/* Batch header */}
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
                  <span className="text-xs text-emerald-600 font-medium bg-emerald-50 px-2.5 py-1 rounded-lg">✓ Saved</span>
                )}
              </div>

              {/* Students attendance */}
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
                        {/* Attendance toggle */}
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
    </div>
  )
}
