import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { students, batches, sessions, attendance, rto_records, fees, users } from '@/db/schema'
import { verifyToken } from '@/lib/auth/jwt'

function formatExportDate(value?: string | Date | null) {
  if (!value) return ''
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().split('T')[0]
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get('token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyToken(token)

  const [allStudents, allBatches, allUsers, allFees] = await Promise.all([
    db.select().from(students).where(eq(students.school_id, payload.school_id)),
    db.select().from(batches).where(eq(batches.school_id, payload.school_id)),
    db.select().from(users).where(eq(users.school_id, payload.school_id)),
    db.select().from(fees),
  ])
  const batchIds   = allBatches.map((b: any) => b.id)
  const studentIds = allStudents.map((s: any) => s.id)
  const allSessions   = batchIds.length   ? await db.select().from(sessions)    : []
  const allAttendance = studentIds.length ? await db.select().from(attendance)  : []
  const allRto        = studentIds.length ? await db.select().from(rto_records) : []
  const batchMap      = Object.fromEntries(allBatches.map((b: any) => [b.id, b]))
  const instrMap      = Object.fromEntries(allUsers.map((u: any) => [u.id, u.name]))
  const myAtt         = allAttendance.filter((a: any) => studentIds.includes(a.student_id))
  const mySess        = allSessions.filter((s: any) => batchIds.includes(s.batch_id))
  const myRto         = allRto.filter((r: any) => studentIds.includes(r.student_id))
  const myFees        = allFees.filter((f: any) => studentIds.includes(f.student_id))

  const present = (id: string) => myAtt.filter((a: any) => a.student_id === id && a.status === 'present').length

  return NextResponse.json({
    generated: new Date().toISOString(),
    students: allStudents.map((s: any) => ({
      Name: s.name, Phone: s.phone, Course: s.course_type,
      Batch: s.batch_id ? batchMap[s.batch_id]?.name ?? '' : 'Unassigned',
      'Sessions done': `${present(s.id)}/${batchMap[s.batch_id]?.total_sessions ?? '?'}`,
      'Present': present(s.id),
      'Absent': myAtt.filter((a: any) => a.student_id === s.id && a.status === 'absent').length,
      Status: s.status, 'Enrolled on': formatExportDate(s.enrolled_at),
    })),
    batches: allBatches.map((b: any) => ({
      Name: b.name, Instructor: instrMap[b.instructor_id] ?? '',
      'Time slot': b.slot_time, Days: b.day_pref, Course: b.course_type,
      'Max students': b.max_students, 'Total sessions': b.total_sessions,
      'Start date': b.start_date, Status: b.status,
    })),
    attendance: myAtt.map((a: any) => {
      const s = allStudents.find((st: any) => st.id === a.student_id)
      const sess = mySess.find((se: any) => se.id === a.session_id)
      return {
        Student: s?.name ?? '', Phone: s?.phone ?? '',
        Batch: sess ? batchMap[sess.batch_id]?.name ?? '' : '',
        'Session #': sess?.session_num ?? '', Date: sess?.session_date ?? '',
        Status: a.status,
      }
    }),
    rto: myRto.map((r: any) => {
      const s = allStudents.find((st: any) => st.id === r.student_id)
      return {
        Student: s?.name ?? '', Phone: s?.phone ?? '',
        'LL number': r.ll_number ?? '', 'LL issued': r.ll_issued_date ?? '',
        'LL expiry': r.ll_expiry_date ?? '', 'Test date': r.test_date ?? '',
        'Test venue': r.test_venue ?? '', 'Test status': r.test_status,
        'DL number': r.dl_number ?? '', 'DL issued': r.dl_issued_date ?? '',
      }
    }),
    fees: myFees.map((f: any) => {
      const s = allStudents.find((st: any) => st.id === f.student_id)
      return {
        Student: s?.name ?? '', Phone: s?.phone ?? '',
        'Total (₹)': f.total_amount, 'Paid (₹)': f.paid_amount,
        'Balance (₹)': (Number(f.total_amount) - Number(f.paid_amount)).toFixed(2),
        Status: f.payment_status,
      }
    }),
  })
}
