'use client'
import { Avatar, Badge, Card, ProgressBar } from '@/components/ui'
import PageHeader from '@/components/shared/PageHeader'
import { formatSlotTime, getDayLabel } from '@/lib/utils'

interface Props {
  students: any[]
  batches: any[]
  attendance: any[]
}

export default function InstructorStudents({ students, batches, attendance }: Props) {
  function getBatch(batchId: string) {
    return batches.find(b => b.id === batchId)
  }
  function getPresent(studentId: string) {
    return attendance.filter(a => a.student_id === studentId && a.status === 'present').length
  }

  return (
    <div className="p-4 md:p-6">
      <PageHeader
        title="My batches & students"
        subtitle={`${batches.length} batch${batches.length !== 1 ? 'es' : ''} · ${students.length} student${students.length !== 1 ? 's' : ''}`}
      />

      {batches.length === 0 && (
        <Card className="p-10 text-center text-gray-400">
          <p className="text-2xl mb-2">📋</p>
          <p className="font-medium text-gray-600">No batches assigned yet</p>
          <p className="text-sm mt-1">Ask your admin to assign you to a batch</p>
        </Card>
      )}

      {batches.map(batch => {
        const bStudents = students.filter(s => s.batch_id === batch.id)
        return (
          <div key={batch.id} className="mb-5">
            {/* Batch header */}
            <div className="flex items-center gap-3 mb-2 px-1">
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-semibold text-gray-800 truncate">{batch.name}</h2>
                <p className="text-xs text-gray-400">
                  {formatSlotTime(batch.slot_time?.slice(0, 5))} · {getDayLabel(batch.day_pref)} · {batch.total_sessions} sessions
                </p>
              </div>
              <Badge variant={batch.status === 'active' ? 'green' : 'gray'}>{batch.status}</Badge>
            </div>

            <Card>
              {bStudents.length === 0 && (
                <div className="text-center py-8 text-gray-400 text-sm">No students in this batch yet</div>
              )}
              {bStudents.map(s => {
                const present = getPresent(s.id)
                const pct = batch.total_sessions > 0 ? Math.round((present / batch.total_sessions) * 100) : 0
                return (
                  <div key={s.id} className="flex items-start gap-3 px-4 py-3.5 border-b border-gray-50 last:border-0">
                    <Avatar name={s.name} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="text-sm font-semibold text-gray-800 truncate">{s.name}</p>
                        <Badge variant={s.status === 'active' ? 'green' : s.status === 'completed' ? 'blue' : 'amber'}>
                          {s.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-400 mb-2">{s.phone} · {s.course_type}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 flex-shrink-0">{present}/{batch.total_sessions}</span>
                        <ProgressBar value={present} max={batch.total_sessions} className="flex-1" />
                        <span className="text-xs text-gray-400 flex-shrink-0">{pct}%</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </Card>
          </div>
        )
      })}
    </div>
  )
}
