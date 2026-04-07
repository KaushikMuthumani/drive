import { eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { students, batches, attendance, fees, rto_records } from '@/db/schema'
import { getSessionWithUser } from '@/lib/auth/session'
import Shell from '@/components/shared/Shell'
import StudentsPage from '@/components/admin/StudentsPage'

export default async function AdminStudentsPage() {
  const { user, school } = await getSessionWithUser()
  const [allStudents, allBatches, allFees, allRto] = await Promise.all([
    db.select().from(students).where(eq(students.school_id, school.id)),
    db.select().from(batches).where(eq(batches.school_id, school.id)),
    db.select().from(fees),
    db.select().from(rto_records),
  ])
  const studentIds = allStudents.map(s => s.id)
  const allAttendance = studentIds.length ? await db.select().from(attendance) : []
  const myAttendance  = allAttendance.filter(a => studentIds.includes(a.student_id))
  const myFees        = allFees.filter(f => studentIds.includes(f.student_id))
  const myRto         = allRto.filter(r => studentIds.includes(r.student_id))
  return (
    <Shell role="admin" userName={user.name} schoolName={school.name}>
      <StudentsPage
        students={allStudents} batches={allBatches}
        attendance={myAttendance} fees={myFees} rto={myRto}
        schoolId={school.id}
      />
    </Shell>
  )
}
