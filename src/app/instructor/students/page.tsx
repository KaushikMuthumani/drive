import { eq, and } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { students, batches, attendance } from '@/db/schema'
import { getSessionWithUser } from '@/lib/auth/session'
import Shell from '@/components/shared/Shell'
import InstructorStudents from '@/components/instructor/InstructorStudents'

export default async function InstructorStudentsPage() {
  const { user, school } = await getSessionWithUser()

  const myBatches = await db.select().from(batches).where(
    and(eq(batches.instructor_id, user.id), eq(batches.status, 'active'))
  )
  const batchIds    = myBatches.map(b => b.id)
  const allStudents = await db.select().from(students).where(eq(students.school_id, school.id))
  const myStudents  = allStudents.filter(s => s.batch_id && batchIds.includes(s.batch_id))
  const allAtt      = myStudents.length ? await db.select().from(attendance) : []
  const myAtt       = allAtt.filter(a => myStudents.some(s => s.id === a.student_id))

  return (
    <Shell role="instructor" userName={user.name} schoolName={school.name}>
      <InstructorStudents students={myStudents} batches={myBatches} attendance={myAtt} />
    </Shell>
  )
}
