'use client'
import { Badge, Card, Avatar, ProgressBar } from '@/components/ui'
import PageHeader from '@/components/shared/PageHeader'
import { formatSlotTime, getDayLabel } from '@/lib/utils'

interface Props {
  batches: any[]
  students: any[]
  attendance: any[]
}

export default function InstructorBatches({ batches, students, attendance }: Props) {
  function studentsInBatch(batchId: string) {
    return students.filter(student => student.batch_id === batchId)
  }

  function presentCount(studentId: string) {
    return attendance.filter(record => record.student_id === studentId && record.status === 'present').length
  }

  return (
    <div className="p-4 md:p-6">
      <PageHeader
        title="My batches"
        subtitle={`${batches.length} batch${batches.length !== 1 ? 'es' : ''} assigned`}
      />

      {batches.length === 0 && (
        <Card className="p-10 text-center text-gray-400">
          <p className="text-2xl mb-2">📋</p>
          <p className="font-medium text-gray-600">No batches assigned yet</p>
          <p className="text-sm mt-1">Ask your admin to assign you to a batch</p>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {batches.map(batch => {
          const enrolled = studentsInBatch(batch.id)
          return (
            <Card key={batch.id} className="p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{batch.name}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {formatSlotTime(batch.slot_time?.slice(0, 5))} · {getDayLabel(batch.day_pref)} · {batch.course_type}
                  </p>
                </div>
                <Badge variant={batch.status === 'active' ? 'green' : 'gray'}>{batch.status}</Badge>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-xs text-gray-500 mb-1">Students</p>
                  <p className="text-lg font-semibold text-gray-900">{enrolled.length}</p>
                </div>
                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-xs text-gray-500 mb-1">Sessions</p>
                  <p className="text-lg font-semibold text-gray-900">{batch.total_sessions}</p>
                </div>
                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-xs text-gray-500 mb-1">Capacity</p>
                  <p className="text-lg font-semibold text-gray-900">{batch.max_students}</p>
                </div>
              </div>

              <div className="space-y-2">
                {enrolled.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">No students in this batch yet.</p>
                )}
                {enrolled.map(student => {
                  const present = presentCount(student.id)
                  return (
                    <div key={student.id} className="flex items-center gap-3 rounded-xl bg-gray-50 p-3">
                      <Avatar name={student.name} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-gray-800 truncate">{student.name}</p>
                          <span className="text-xs text-gray-400">{present}/{batch.total_sessions}</span>
                        </div>
                        <ProgressBar value={present} max={batch.total_sessions} className="mt-2" />
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
