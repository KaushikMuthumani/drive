'use client'
import { StatCard, Card } from '@/components/ui'
import PageHeader from '@/components/shared/PageHeader'
import { formatINR } from '@/lib/utils'

interface Props {
  stats: {
    totalStudents: number
    activeStudents: number
    completedStudents: number
    completionRate: number
    totalRevenue: number
    totalDue: number
    totalSessions: number
    presentSessions: number
    totalBatches: number
    activeBatches: number
  }
}

export default function ReportsPage({ stats }: Props) {
  const attendanceRate = stats.totalSessions > 0
    ? Math.round((stats.presentSessions / stats.totalSessions) * 100)
    : 0

  return (
    <div className="p-4 md:p-6">
      <PageHeader title="Reports" subtitle="School-wide performance overview" />

      <div className="grid grid-cols-2 gap-3 mb-5">
        <StatCard label="Active students"   value={stats.activeStudents}    sub="currently training"       trend="up" />
        <StatCard label="Completion rate"   value={`${stats.completionRate}%`} sub="students finished course" trend="up" />
        <StatCard label="Revenue collected" value={formatINR(stats.totalRevenue)} sub={formatINR(stats.totalDue) + ' pending'} trend={stats.totalDue > 0 ? 'down' : 'up'} />
        <StatCard label="Attendance rate"   value={`${attendanceRate}%`}    sub={`${stats.presentSessions}/${stats.totalSessions} sessions`} />
      </div>

      <Card>
        <div className="divide-y divide-gray-50">
          {[
            { label: 'Total students',       value: stats.totalStudents },
            { label: 'Active',               value: stats.activeStudents },
            { label: 'Completed',            value: stats.completedStudents },
            { label: 'Completion rate',      value: `${stats.completionRate}%` },
            { label: 'Active batches',       value: stats.activeBatches },
            { label: 'Total batches',        value: stats.totalBatches },
            { label: 'Sessions run',         value: stats.totalSessions },
            { label: 'Sessions attended',    value: stats.presentSessions },
            { label: 'Attendance rate',      value: `${attendanceRate}%` },
            { label: 'Revenue collected',    value: formatINR(stats.totalRevenue) },
            { label: 'Outstanding fees',     value: formatINR(stats.totalDue) },
          ].map(row => (
            <div key={row.label} className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-gray-600">{row.label}</span>
              <span className="text-sm font-semibold text-gray-900">{row.value}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
