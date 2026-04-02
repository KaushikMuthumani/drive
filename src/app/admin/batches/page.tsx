import { eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { batches, users, vehicles, students } from '@/db/schema'
import { getSessionWithUser } from '@/lib/auth/session'
import Shell from '@/components/shared/Shell'
import BatchesPage from '@/components/admin/BatchesPage'

export default async function AdminBatchesPage() {
  const { user, school } = await getSessionWithUser()
  const [allBatches, instructors, fleet, allStudents] = await Promise.all([
    db.select().from(batches).where(eq(batches.school_id, school.id)).orderBy(batches.slot_time),
    db.select().from(users).where(eq(users.school_id, school.id)),
    db.select().from(vehicles).where(eq(vehicles.school_id, school.id)),
    db.select().from(students).where(eq(students.school_id, school.id)),
  ])
  return (
    <Shell role="admin" userName={user.name} schoolName={school.name}>
      <BatchesPage batches={allBatches} instructors={instructors} vehicles={fleet} students={allStudents} schoolId={school.id}/>
    </Shell>
  )
}
