import { eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { students, batches } from '@/db/schema'
import { getSessionWithUser } from '@/lib/auth/session'
import Shell from '@/components/shared/Shell'
import StudentsPage from '@/components/admin/StudentsPage'

export default async function AdminStudentsPage() {
  const { user, school } = await getSessionWithUser()
  const [allStudents, allBatches] = await Promise.all([
    db.select().from(students).where(eq(students.school_id, school.id)).orderBy(students.enrolled_at),
    db.select().from(batches).where(eq(batches.school_id, school.id)),
  ])
  return (
    <Shell role="admin" userName={user.name} schoolName={school.name}>
      <StudentsPage students={allStudents} batches={allBatches} schoolId={school.id}/>
    </Shell>
  )
}
