import { eq, count, and } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { students, batches, sessions, fees, rto_records } from '@/db/schema'
import { getSessionWithUser } from '@/lib/auth/session'
import Shell from '@/components/shared/Shell'
import AdminDashboard from '@/components/admin/AdminDashboard'

export default async function DashboardPage() {
  const { user, school } = await getSessionWithUser()
  const today = new Date().toISOString().split('T')[0]

  const [allStudents, allBatches, allFees, scheduledRto] = await Promise.all([
    db.select().from(students).where(eq(students.school_id, school.id)),
    db.select().from(batches).where(eq(batches.school_id, school.id)).orderBy(batches.slot_time),
    db.select().from(fees),
    db.select({ count: count() }).from(rto_records).where(eq(rto_records.test_status, 'scheduled')),
  ])

  // Today's sessions across active batches
  const activeBatchIds = allBatches.filter(b => b.status === 'active').map(b => b.id)
  const allSessions = activeBatchIds.length > 0
    ? await db.select().from(sessions).where(eq(sessions.session_date, today))
    : []
  const todaySessions = allSessions.filter(s => activeBatchIds.includes(s.batch_id))

  const activeStudents = allStudents.filter(s => s.status === 'active').length
  const unpaidFees     = allFees.filter(f => f.payment_status === 'unpaid').length
  const recentStudents = [...allStudents]
    .sort((a, b) => new Date(b.enrolled_at).getTime() - new Date(a.enrolled_at).getTime())
    .slice(0, 5)

  return (
    <Shell role="admin" userName={user.name} schoolName={school.name}>
      <AdminDashboard
        stats={{
          students:      activeStudents,
          activeBatches: allBatches.filter(b => b.status === 'active').length,
          todaySessions: todaySessions.length,
          pendingRto:    scheduledRto[0]?.count ?? 0,
          unpaidFees,
        }}
        recentStudents={recentStudents}
        todayBatches={allBatches.filter(b => b.status === 'active')}
        todaySessions={todaySessions}
      />
    </Shell>
  )
}
