import { notFound } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { students, batches, sessions, attendance, rto_records, fees, fee_payments, users, schools, school_settings } from '@/db/schema'
import StudentPortal from '@/components/student/StudentPortal'

export default async function StudentPortalPage({ params }: { params: { token: string } }) {
  const [student] = await db.select().from(students).where(eq(students.portal_token, params.token))
  if (!student) return notFound()

  const [school]    = await db.select().from(schools).where(eq(schools.id, student.school_id))
  const [upiSettings] = await db.select().from(school_settings).where(eq(school_settings.school_id, student.school_id))
  const batch       = student.batch_id ? (await db.select().from(batches).where(eq(batches.id, student.batch_id)))[0] : null
  const instructor  = batch ? (await db.select().from(users).where(eq(users.id, batch.instructor_id)))[0] : null

  const [allSessions, studentAttendance, rtoRecords, feeRecords, paymentHistory] = await Promise.all([
    batch ? db.select().from(sessions).where(eq(sessions.batch_id, batch.id)).orderBy(sessions.session_num) : Promise.resolve([]),
    db.select().from(attendance).where(eq(attendance.student_id, student.id)),
    db.select().from(rto_records).where(eq(rto_records.student_id, student.id)),
    db.select().from(fees).where(eq(fees.student_id, student.id)),
    db.select().from(fee_payments).where(eq(fee_payments.student_id, student.id)).orderBy(fee_payments.paid_at),
  ])

  return (
    <StudentPortal
      student={student} school={school} batch={batch}
      instructor={instructor} allSessions={allSessions}
      studentAttendance={studentAttendance}
      rtoRecord={rtoRecords[0] ?? null}
      fee={feeRecords[0] ?? null}
      paymentHistory={paymentHistory}
      upiSettings={upiSettings ?? null}
    />
  )
}
