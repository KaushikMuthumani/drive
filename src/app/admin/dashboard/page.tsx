import { eq, count, and } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { students, batches, sessions, fees, rto_records } from '@/db/schema'
import { getSessionWithUser } from '@/lib/auth/session'
import Shell from '@/components/shared/Shell'
import AdminDashboard from '@/components/admin/AdminDashboard'
import { ensureRescheduleRequestsTable, listRescheduleRequests } from '@/lib/reschedule/requests'
import { sql } from 'drizzle-orm'

export default async function DashboardPage() {
  const { user, school } = await getSessionWithUser()
  const today = new Date().toISOString().split('T')[0]
  await ensureRescheduleRequestsTable()

  const [allStudents, allBatches, allFees, scheduledRto] = await Promise.all([
    db.select().from(students).where(eq(students.school_id, school.id)),
    db.select().from(batches).where(eq(batches.school_id, school.id)).orderBy(batches.slot_time),
    db.select().from(fees),
    db.select({ count: count() }).from(rto_records).where(eq(rto_records.test_status, 'scheduled')),
  ])

  // Today's sessions across active batches
  const activeBatchIds = allBatches.filter(b => b.status === 'active').map(b => b.id)
  const studentIds = new Set(allStudents.map(student => student.id))
  const allSessions = activeBatchIds.length > 0
    ? await db.select().from(sessions).where(eq(sessions.session_date, today))
    : []
  const todaySessions = allSessions.filter(s => activeBatchIds.includes(s.batch_id))

  const activeStudents = allStudents.filter(s => s.status === 'active').length
  const unpaidFees     = allFees.filter(f => f.payment_status === 'unpaid' && studentIds.has(f.student_id)).length
  const recentStudents = [...allStudents]
    .sort((a, b) => new Date(b.enrolled_at).getTime() - new Date(a.enrolled_at).getTime())
    .slice(0, 5)
  const rescheduleRequests = await listRescheduleRequests(
    sql`where rr.school_id = ${school.id}::uuid and rr.status = 'pending'`
  )

  return (
    <Shell role="admin" userName={user.name} schoolName={school.name}>
      <AdminDashboard
        stats={{
          students:      activeStudents,
          activeBatches: allBatches.filter(b => b.status === 'active').length,
          todaySessions: todaySessions.length,
          pendingRto:    scheduledRto[0]?.count ?? 0,
          unpaidFees,
          pendingReschedules: rescheduleRequests.length,
        }}
        recentStudents={recentStudents}
        todayBatches={allBatches.filter(b => b.status === 'active')}
        todaySessions={todaySessions}
        rescheduleRequests={rescheduleRequests.slice(0, 5)}
      />
    </Shell>
  )
}
