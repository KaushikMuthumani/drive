'use client'
import { useState } from 'react'
import { Card, Badge, Avatar, Button } from '@/components/ui'
import PageHeader from '@/components/shared/PageHeader'
import { formatSlotTime } from '@/lib/course/config'
import { toast } from 'sonner'

interface AttRecord { student_id: string; status: 'present'|'absent'|'holiday'; notes?: string }
interface Props {
  batches: any[]; todaySessions: any[]; students: any[]
  existingAttendance: any[]; today: string
}

export default function AttendancePage({ batches, todaySessions, students, existingAttendance, today }: Props) {
  const [saving, setSaving] = useState<string | null>(null)
  const [attendance, setAttendance] = useState<Record<string, Record<string, AttRecord>>>(() => {
    // Pre-fill from existing
    const map: Record<string, Record<string, AttRecord>> = {}
    existingAttendance.forEach(a => {
      if (!map[a.session_id]) map[a.session_id] = {}
      map[a.session_id][a.student_id] = { student_id: a.student_id, status: a.status, notes: a.notes }
    })
    return map
  })

  function studentsInBatch(batchId: string) {
    return students.filter(s => s.batch_id === batchId)
  }

  function getBatch(batchId: string) {
    return batches.find(b => b.id === batchId)
  }

  function mark(sessionId: string, studentId: string, status: 'present'|'absent'|'holiday') {
    setAttendance(prev => ({
      ...prev,
      [sessionId]: {
        ...(prev[sessionId] ?? {}),
        [studentId]: { student_id: studentId, status },
      }
    }))
  }

  function markAll(sessionId: string, batchId: string, status: 'present'|'absent'|'holiday') {
    const bStudents = studentsInBatch(batchId)
    setAttendance(prev => {
      const updated = { ...(prev[sessionId] ?? {}) }
      bStudents.forEach(s => { updated[s.id] = { student_id: s.id, status } })
      return { ...prev, [sessionId]: updated }
    })
  }

  async function save(sessionId: string) {
    const session = todaySessions.find(s => s.id === sessionId)
    const enrolled = session ? studentsInBatch(session.batch_id) : []
    const records = enrolled
      .map(student => attendance[sessionId]?.[student.id])
      .filter((record): record is AttRecord => Boolean(record))
    if (records.length === 0) { toast.error('Mark attendance for at least one student'); return }
    setSaving(sessionId)
    const res = await fetch(`/api/sessions/${sessionId}/attendance`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ records }),
    })
    setSaving(null)
    if (!res.ok) { toast.error('Failed to save'); return }
    toast.success('Attendance saved')
  }

  const todayStr = new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long' })

  if (todaySessions.length === 0) {
    return (
      <div className="p-4 md:p-6">
        <PageHeader title="Attendance" subtitle={todayStr} />
        <Card className="p-10 text-center">
          <div className="text-4xl mb-3">🎉</div>
          <p className="font-semibold text-gray-700 mb-1">No sessions today</p>
          <p className="text-sm text-gray-400">
            {new Date().getDay() === 0 ? 'Sunday — all weekday batches are off.' : 'Check your batch schedule or create a batch.'}
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6">
      <PageHeader title="Attendance" subtitle={todayStr} />

      <div className="space-y-4">
        {todaySessions.map(session => {
          const batch    = getBatch(session.batch_id)
          if (!batch) return null
          const enrolled = studentsInBatch(session.batch_id)
          const sessAtt  = attendance[session.id] ?? {}
          const markedAll = enrolled.every(s => sessAtt[s.id])
          const presentCount = Object.values(sessAtt).filter(a => a.status === 'present').length

          return (
            <Card key={session.id} className="p-4">
              {/* Batch header */}
              <div className="flex items-start justify-between gap-2 mb-4">
                <div>
                  <p className="font-semibold text-gray-900">{batch.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Session {session.session_num} of {batch.total_sessions} · {formatSlotTime(batch.slot_time.slice(0,5))}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {markedAll && (
                    <span className="text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg">
                      {presentCount}/{enrolled.length} present
                    </span>
                  )}
                </div>
              </div>

              {/* Quick mark all */}
              <div className="flex gap-2 mb-3">
                <button onClick={() => markAll(session.id, batch.id, 'present')}
                  className="flex-1 text-xs font-medium py-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 active:scale-95 transition">
                  ✓ All present
                </button>
                <button onClick={() => markAll(session.id, batch.id, 'absent')}
                  className="flex-1 text-xs font-medium py-2 rounded-lg bg-gray-50 text-gray-600 border border-gray-200 active:scale-95 transition">
                  ✗ All absent
                </button>
                <button onClick={() => markAll(session.id, batch.id, 'holiday')}
                  className="flex-1 text-xs font-medium py-2 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 active:scale-95 transition">
                  Holiday
                </button>
              </div>

              {/* Per-student marking */}
              <div className="space-y-2 mb-4">
                {enrolled.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-3">No students in this batch yet</p>
                )}
                {enrolled.map(s => {
                  const current = sessAtt[s.id]?.status
                  return (
                    <div key={s.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50">
                      <Avatar name={s.name} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{s.name}</p>
                        <p className="text-xs text-gray-400">{s.phone}</p>
                      </div>
                      <div className="flex gap-1.5">
                        {(['present','absent','holiday'] as const).map(st => (
                          <button key={st} onClick={() => mark(session.id, s.id, st)}
                            className={`w-9 h-9 rounded-lg text-xs font-semibold border transition active:scale-95 ${
                              current === st
                                ? st === 'present' ? 'bg-emerald-500 text-white border-emerald-500'
                                  : st === 'absent' ? 'bg-red-500 text-white border-red-500'
                                  : 'bg-amber-400 text-white border-amber-400'
                                : 'bg-white text-gray-400 border-gray-200'
                            }`}>
                            {st === 'present' ? 'P' : st === 'absent' ? 'A' : 'H'}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>

              <Button variant="primary" loading={saving === session.id} onClick={() => save(session.id)}
                className="w-full justify-center" disabled={enrolled.length === 0}>
                Save attendance
              </Button>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
