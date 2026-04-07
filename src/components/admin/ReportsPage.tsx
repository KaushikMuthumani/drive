'use client'
import { useState } from 'react'
import { StatCard, Card } from '@/components/ui'
import PageHeader from '@/components/shared/PageHeader'
import { formatINR } from '@/lib/utils'
import { toast } from 'sonner'

interface Props {
  stats: {
    totalStudents: number; activeStudents: number; completedStudents: number; completionRate: number
    totalRevenue: number; totalDue: number; totalSessions: number; presentSessions: number
    totalBatches: number; activeBatches: number
  }
}

export default function ReportsPage({ stats }: Props) {
  const [exporting, setExporting] = useState(false)
  const attendanceRate = stats.totalSessions > 0 ? Math.round((stats.presentSessions / stats.totalSessions) * 100) : 0

  async function exportExcel() {
    setExporting(true)
    try {
      const res = await fetch('/api/export/excel')
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error ?? 'Export failed')
      }
      // Use SheetJS-style CSV download since exceljs isn't available on edge
      const sheets: Record<string, any[]> = {
        Students: data.students, Batches: data.batches,
        Attendance: data.attendance, RTO: data.rto, Fees: data.fees,
      }
      let csv = ''
      for (const [name, rows] of Object.entries(sheets)) {
        if (!rows?.length) continue
        csv += `\n=== ${name} ===\n`
        const header = Object.keys(rows[0])
        csv += header.map(h => `"${h.replace(/"/g, '""')}"`).join(',') + '\n'
        rows.forEach(row => {
          const values = header.map(key => {
            const raw = row[key as keyof typeof row] ?? ''
            const text = String(raw)
            const sanitized = text.replace(/"/g, '""')
            if (key.toLowerCase().includes('phone')) {
              return `"='${sanitized}"`
            }
            return `"${sanitized}"`
          })
          csv += `${values.join(',')}\n`
        })
      }
      const blob = new Blob([csv], { type:'text/csv' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url
      a.download = `DriveIndia_Export_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Export downloaded — open in Excel or Google Sheets')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Export failed'
      toast.error(message)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="p-4 md:p-6">
      <PageHeader title="Reports" subtitle="School-wide performance"
        action={
          <button onClick={exportExcel} disabled={exporting}
            className="border border-slate-200 text-slate-700 text-sm font-medium px-3 py-2 rounded-lg hover:bg-slate-50 transition disabled:opacity-50 flex items-center gap-1.5">
            {exporting ? (
              <>
                <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Exporting…
              </>
            ) : (
              '↓ Export to Excel'
            )}
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-3 mb-5">
        <StatCard label="Active students"   value={stats.activeStudents}      sub="currently training"    trend="up" />
        <StatCard label="Completion rate"   value={`${stats.completionRate}%`} sub="finished course"       trend="up" />
        <StatCard label="Revenue collected" value={formatINR(stats.totalRevenue)} sub={`${formatINR(stats.totalDue)} pending`} trend={stats.totalDue > 0 ? 'down' : 'up'} />
        <StatCard label="Attendance rate"   value={`${attendanceRate}%`}      sub={`${stats.presentSessions}/${stats.totalSessions} sessions`} />
      </div>

      <Card>
        <div className="divide-y divide-slate-50">
          {[
            ['Total students',       stats.totalStudents],
            ['Active',               stats.activeStudents],
            ['Completed',            stats.completedStudents],
            ['Completion rate',      `${stats.completionRate}%`],
            ['Active batches',       stats.activeBatches],
            ['Total batches',        stats.totalBatches],
            ['Sessions run',         stats.totalSessions],
            ['Sessions attended',    stats.presentSessions],
            ['Attendance rate',      `${attendanceRate}%`],
            ['Revenue collected',    formatINR(stats.totalRevenue)],
            ['Outstanding fees',     formatINR(stats.totalDue)],
          ].map(([label, value]) => (
            <div key={label as string} className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-slate-600">{label}</span>
              <span className="text-sm font-semibold text-slate-900">{value}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
