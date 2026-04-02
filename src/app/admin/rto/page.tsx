import { eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { rto_records, students } from '@/db/schema'
import { getSessionWithUser } from '@/lib/auth/session'
import Shell from '@/components/shared/Shell'
import RtoPage from '@/components/admin/RtoPage'

export default async function AdminRtoPage() {
  const { user, school } = await getSessionWithUser()
  const schoolStudents = await db.select().from(students).where(eq(students.school_id, school.id))
  const ids = schoolStudents.map(s => s.id)
  const records = ids.length > 0 ? await db.select().from(rto_records) : []
  return (
    <Shell role="admin" userName={user.name} schoolName={school.name}>
      <RtoPage students={schoolStudents} rtoRecords={records}/>
    </Shell>
  )
}
