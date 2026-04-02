import { eq, and, gte, lte } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { batches, sessions, students, attendance, users, vehicles } from '@/db/schema'
import { getSessionWithUser } from '@/lib/auth/session'
import Shell from '@/components/shared/Shell'
import AttendancePage from '@/components/admin/AttendancePage'

export default async function AdminAttendancePage() {
  const { user, school } = await getSessionWithUser()

  const today = new Date().toISOString().split('T')[0]

  const allBatches = await db.select().from(batches).where(
    and(eq(batches.school_id, school.id), eq(batches.status, 'active'))
  )

  // Today's sessions across all active batches
  const todaySessions = await db.select().from(sessions).where(
    and(
      eq(sessions.session_date, today),
    )
  ).orderBy(sessions.session_num)

  const allStudents = await db.select().from(students).where(eq(students.school_id, school.id))
  const allAttendance = await db.select().from(attendance)

  return (
    <Shell role="admin" userName={user.name} schoolName={school.name}>
      <AttendancePage
        batches={allBatches}
        todaySessions={todaySessions}
        students={allStudents}
        existingAttendance={allAttendance}
        today={today}
      />
    </Shell>
  )
}
