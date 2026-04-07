import { eq, and } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { batches, sessions, students, attendance } from '@/db/schema'
import { getSessionWithUser } from '@/lib/auth/session'
import Shell from '@/components/shared/Shell'
import AttendancePage from '@/components/admin/AttendancePage'

export default async function AdminAttendancePage() {
  const { user, school } = await getSessionWithUser()
  const today = new Date().toISOString().split('T')[0]

  const allBatches = await db.select().from(batches).where(
    and(eq(batches.school_id, school.id), eq(batches.status, 'active'))
  )
  const batchIds = allBatches.map(b => b.id)

  // Only fetch sessions for THIS school's batches
  const allSessions = batchIds.length
    ? await db.select().from(sessions)
    : []
  const todaySessions = allSessions
    .filter(s => batchIds.includes(s.batch_id) && s.session_date === today)
    .sort((a, b) => a.session_num - b.session_num)

  const sessionIds   = todaySessions.map(s => s.id)
  const allStudents  = await db.select().from(students).where(eq(students.school_id, school.id))
  const allAttendance = sessionIds.length ? await db.select().from(attendance) : []
  const todayAtt = allAttendance.filter(a => sessionIds.includes(a.session_id))

  return (
    <Shell role="admin" userName={user.name} schoolName={school.name}>
      <AttendancePage
        batches={allBatches}
        todaySessions={todaySessions}
        students={allStudents}
        existingAttendance={todayAtt}
        today={today}
      />
    </Shell>
  )
}
