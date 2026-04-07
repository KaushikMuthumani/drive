import { eq, and } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { students, batches, sessions, attendance, fees, fee_payments, leads, rto_records } from '@/db/schema'
import { getSessionWithUser } from '@/lib/auth/session'
import Shell from '@/components/shared/Shell'
import AdminDashboard from '@/components/admin/AdminDashboard'

export default async function DashboardPage() {
  const { user, school } = await getSessionWithUser()
  const today = new Date().toISOString().split('T')[0]

  const [allStudents, allBatches, allFees, allLeads] = await Promise.all([
    db.select().from(students).where(eq(students.school_id, school.id)),
    db.select().from(batches).where(eq(batches.school_id, school.id)),
    db.select().from(fees),
    db.select().from(leads).where(eq(leads.school_id, school.id)),
  ])

  const activeBatches  = allBatches.filter(b => b.status === 'active')
  const batchIds       = activeBatches.map(b => b.id)
  const studentIds     = allStudents.map(s => s.id)
  const studentById    = Object.fromEntries(allStudents.map(s => [s.id, s]))
  const allSessions    = batchIds.length   ? await db.select().from(sessions)   : []
  const todaySessions  = allSessions.filter(s => batchIds.includes(s.batch_id) && s.session_date === today)
  const sessionIds     = todaySessions.map(s => s.id)
  const todayAtt       = sessionIds.length ? await db.select().from(attendance) : []
  const markedToday    = todayAtt.filter(a => sessionIds.includes(a.session_id))

  // Pending payment confirmations
  const allPayments    = studentIds.length ? await db.select().from(fee_payments) : []
  const pendingPayments = allPayments
    .filter(p => studentIds.includes(p.student_id) && !p.is_confirmed)
    .map(p => ({
      ...p,
      studentName: studentById[p.student_id]?.name ?? '',
    }))

  const feeMap         = Object.fromEntries(allFees.map(f => [f.student_id, f]))
  const unpaidStudents = allStudents.filter(s => { const f = feeMap[s.id]; return f && f.payment_status !== 'paid' })
  const unpaidAmount   = unpaidStudents.reduce((sum, s) => { const f = feeMap[s.id]; return f ? sum + (Number(f.total_amount) - Number(f.paid_amount)) : sum }, 0)
  const recentStudents = [...allStudents].sort((a,b) => new Date(b.enrolled_at).getTime() - new Date(a.enrolled_at).getTime()).slice(0, 6)
  const markedIds      = new Set(markedToday.map(a => a.student_id))
  const todayStudents  = allStudents.filter(s => s.batch_id && todaySessions.some(ts => ts.batch_id === s.batch_id))
  const followUpToday  = allLeads.filter(l => l.follow_up_at === today && l.status !== 'enrolled' && l.status !== 'lost').length
  const allRtoRecords  = studentIds.length ? await db.select().from(rto_records) : []
  const todayDate      = new Date(today)
  const weekAheadDate  = new Date(todayDate)
  weekAheadDate.setDate(weekAheadDate.getDate() + 7)
  const rtoSoon: any[] = []
  for (const record of allRtoRecords) {
    if (!record.test_date) continue
    const student = studentById[record.student_id]
    if (!student) continue
    const testDate = new Date(record.test_date)
    if (testDate < todayDate || testDate > weekAheadDate) continue
    rtoSoon.push({ ...record, studentName: student.name })
  }

  return (
    <Shell role="admin" userName={user.name} schoolName={school.name}>
      <AdminDashboard
        stats={{
          students:         allStudents.filter(s => s.status === 'active' || s.status === 'enrolled').length,
          activeBatches:    activeBatches.length,
          todaySessions:    todaySessions.length,
          pendingRto:       rtoSoon.length,
          unpaidFees:       unpaidStudents.length,
          unpaidAmount,
          attendanceToday:  markedIds.size,
          totalToday:       todayStudents.length,
          pendingPayments:  pendingPayments.length,
          followUpToday,
        }}
        recentStudents={recentStudents}
        todayBatches={activeBatches}
        todaySessions={todaySessions}
        unpaidStudents={unpaidStudents}
        pendingPayments={pendingPayments}
        markedSessionIds={markedToday.map(a => a.session_id)}
        rtoSoon={rtoSoon}
      />
    </Shell>
  )
}
