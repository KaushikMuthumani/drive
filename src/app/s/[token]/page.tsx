import { notFound } from 'next/navigation'
import { eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { students, batches, sessions, attendance, rto_records, fees, users, schools } from '@/db/schema'
import StudentPortal from '@/components/student/StudentPortal'
import { ensureRescheduleRequestsTable } from '@/lib/reschedule/requests'

interface Props { params: { token: string } }

export default async function StudentPortalPage({ params }: Props) {
  const [student] = await db.select().from(students).where(eq(students.portal_token, params.token))
  if (!student) return notFound()
  await ensureRescheduleRequestsTable()

  const [school] = await db.select().from(schools).where(eq(schools.id, student.school_id))
  const batch     = student.batch_id ? (await db.select().from(batches).where(eq(batches.id, student.batch_id)))[0] : null
  const instructor = batch ? (await db.select().from(users).where(eq(users.id, batch.instructor_id)))[0] : null

  const [allSessions, studentAttendance, rtoRecords, feeRecords, rescheduleRequests] = await Promise.all([
    batch ? db.select().from(sessions).where(eq(sessions.batch_id, batch.id)).orderBy(sessions.session_num) : Promise.resolve([]),
    db.select().from(attendance).where(eq(attendance.student_id, student.id)),
    db.select().from(rto_records).where(eq(rto_records.student_id, student.id)),
    db.select().from(fees).where(eq(fees.student_id, student.id)),
    db.execute(sql`
      select *
      from reschedule_requests
      where student_id = ${student.id}::uuid
      order by created_at desc
    `).then(result => result.rows),
  ])

  return (
    <StudentPortal student={student} school={school} batch={batch}
      instructor={instructor} allSessions={allSessions}
      studentAttendance={studentAttendance}
      rtoRecord={rtoRecords[0] ?? null} fee={feeRecords[0] ?? null}
      rescheduleRequests={rescheduleRequests} />
  )
}
