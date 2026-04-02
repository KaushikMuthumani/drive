import { eq, and } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { students, batches, sessions, attendance } from '@/db/schema'
import { getSessionWithUser } from '@/lib/auth/session'
import Shell from '@/components/shared/Shell'
import ProgressLogger from '@/components/instructor/ProgressLogger'

export default async function InstructorProgressPage() {
  const { user, school } = await getSessionWithUser()

  // Students in this instructor's batches
  const myBatches   = await db.select().from(batches).where(
    and(eq(batches.instructor_id, user.id), eq(batches.status, 'active'))
  )
  const batchIds = myBatches.map(b => b.id)

  const allStudents = await db.select().from(students).where(eq(students.school_id, school.id))
  const myStudents  = allStudents.filter(s => s.batch_id && batchIds.includes(s.batch_id))

  // Sessions for skill logging
  const allSessions = batchIds.length
    ? await db.select().from(sessions)
    : []
  const mySessions = allSessions.filter(s => batchIds.includes(s.batch_id))

  // All attendance with skill scores
  const allAttendance = myStudents.length
    ? await db.select().from(attendance)
    : []
  const myAttendance = allAttendance.filter(a =>
    myStudents.some(s => s.id === a.student_id)
  )

  return (
    <Shell role="instructor" userName={user.name} schoolName={school.name}>
      <ProgressLogger
        students={myStudents}
        sessions={mySessions}
        batches={myBatches}
        attendanceLogs={myAttendance}
        instructorId={user.id}
      />
    </Shell>
  )
}
