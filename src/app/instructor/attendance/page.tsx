import { eq, and } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { batches, sessions, students, attendance } from '@/db/schema'
import { getSessionWithUser } from '@/lib/auth/session'
import Shell from '@/components/shared/Shell'
import InstructorToday from '@/components/instructor/InstructorToday'
import { ensureRescheduleRequestsTable, listRescheduleRequests } from '@/lib/reschedule/requests'
import { sql } from 'drizzle-orm'

export default async function InstructorAttendancePage() {
  const { user, school } = await getSessionWithUser()
  const today = new Date().toISOString().split('T')[0]
  await ensureRescheduleRequestsTable()

  const myBatches = await db.select().from(batches).where(
    and(eq(batches.instructor_id, user.id), eq(batches.status, 'active'))
  )
  const batchIds = myBatches.map(b => b.id)

  let todaySessions: any[] = []
  if (batchIds.length > 0) {
    const allSessions = await db.select().from(sessions)
      .where(eq(sessions.session_date, today))
      .orderBy(sessions.session_num)
    todaySessions = allSessions.filter(s => batchIds.includes(s.batch_id))
  }

  const sessionIds = todaySessions.map(s => s.id)
  const allStudents = batchIds.length > 0
    ? await db.select().from(students).where(eq(students.school_id, school.id))
    : []

  let existingAttendance: any[] = []
  if (sessionIds.length > 0) {
    const allAtt = await db.select().from(attendance)
    existingAttendance = allAtt.filter(a => sessionIds.includes(a.session_id))
  }
  const rescheduleRequests = await listRescheduleRequests(
    sql`where rr.instructor_id = ${user.id}::uuid`
  )

  return (
    <Shell role="instructor" userName={user.name} schoolName={school.name}>
      <InstructorToday
        myBatches={myBatches}
        todaySessions={todaySessions}
        students={allStudents}
        existingAttendance={existingAttendance}
        today={today}
        instructorName={user.name}
        rescheduleRequests={rescheduleRequests}
      />
    </Shell>
  )
}
