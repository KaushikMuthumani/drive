import { eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { students, sessions, attendance, fees, batches } from '@/db/schema'
import { getSessionWithUser } from '@/lib/auth/session'
import Shell from '@/components/shared/Shell'
import ReportsPage from '@/components/admin/ReportsPage'

export default async function AdminReportsPage() {
  const { user, school } = await getSessionWithUser()

  const [allStudents, allFees, allBatches] = await Promise.all([
    db.select().from(students).where(eq(students.school_id, school.id)),
    db.select().from(fees),
    db.select().from(batches).where(eq(batches.school_id, school.id)),
  ])

  const batchIds       = allBatches.map(b => b.id)
  const studentIds     = allStudents.map(s => s.id)
  const allSessions    = batchIds.length    ? await db.select().from(sessions)   : []
  const allAttendance  = studentIds.length  ? await db.select().from(attendance) : []

  const mySessions     = allSessions.filter(s => batchIds.includes(s.batch_id))
  const myAttendance   = allAttendance.filter(a => studentIds.includes(a.student_id))

  const completed      = allStudents.filter(s => s.status === 'completed').length
  const totalRevenue   = allFees.reduce((sum, f) => sum + Number(f.paid_amount), 0)
  const totalDue       = allFees.reduce((sum, f) => sum + (Number(f.total_amount) - Number(f.paid_amount)), 0)
  const presentCount   = myAttendance.filter(a => a.status === 'present').length
  const totalSessions  = mySessions.length

  return (
    <Shell role="admin" userName={user.name} schoolName={school.name}>
      <ReportsPage stats={{
        totalStudents:     allStudents.length,
        activeStudents:    allStudents.filter(s => s.status === 'active').length,
        completedStudents: completed,
        completionRate:    allStudents.length ? Math.round((completed / allStudents.length) * 100) : 0,
        totalRevenue,
        totalDue,
        totalSessions,
        presentSessions: presentCount,
        totalBatches:    allBatches.length,
        activeBatches:   allBatches.filter(b => b.status === 'active').length,
      }} />
    </Shell>
  )
}
