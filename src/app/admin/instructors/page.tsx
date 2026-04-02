import { eq, and } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { users, students } from '@/db/schema'
import { getSessionWithUser } from '@/lib/auth/session'
import Shell from '@/components/shared/Shell'
import InstructorsPage from '@/components/admin/InstructorsPage'

export default async function AdminInstructorsPage() {
  const { user, school } = await getSessionWithUser()
  const instructors = await db.select().from(users).where(and(eq(users.school_id, school.id), eq(users.role, 'instructor')))
  const allStudents = await db.select().from(students).where(eq(students.school_id, school.id))
  return (
    <Shell role="admin" userName={user.name} schoolName={school.name}>
      <InstructorsPage instructors={instructors} students={allStudents}/>
    </Shell>
  )
}
