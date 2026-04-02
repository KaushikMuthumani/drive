import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { attendance, batches, students } from '@/db/schema'
import { getSessionWithUser } from '@/lib/auth/session'
import Shell from '@/components/shared/Shell'
import InstructorBatches from '@/components/instructor/InstructorBatches'

export default async function InstructorBatchesPage() {
  const { user, school } = await getSessionWithUser()
  const myBatches = await db.select().from(batches).where(
    and(eq(batches.instructor_id, user.id), eq(batches.school_id, school.id))
  )
  const batchIds = myBatches.map(batch => batch.id)
  const allStudents = await db.select().from(students).where(eq(students.school_id, school.id))
  const myStudents = allStudents.filter(student => student.batch_id && batchIds.includes(student.batch_id))
  const allAttendance = myStudents.length ? await db.select().from(attendance) : []
  const myAttendance = allAttendance.filter(record => myStudents.some(student => student.id === record.student_id))
  return (
    <Shell role="instructor" userName={user.name} schoolName={school.name}>
      <InstructorBatches batches={myBatches} students={myStudents} attendance={myAttendance} />
    </Shell>
  )
}
