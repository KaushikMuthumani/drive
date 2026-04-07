import { eq, and } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import {
  students, batches, sessions, attendance, fees, fee_payments,
  leads, rto_records, users, schools
} from '@/db/schema'

export async function buildSchoolContext(schoolId: string) {
  const today = new Date().toISOString().split('T')[0]

  const [
    allStudents, allBatches, allUsers, allFees, allLeads
  ] = await Promise.all([
    db.select().from(students).where(eq(students.school_id, schoolId)),
    db.select().from(batches).where(eq(batches.school_id, schoolId)),
    db.select().from(users).where(eq(users.school_id, schoolId)),
    db.select().from(fees),
    db.select().from(leads).where(eq(leads.school_id, schoolId)),
  ])

  const batchIds   = allBatches.map(b => b.id)
  const studentIds = allStudents.map(s => s.id)

  const [allSessions, allRto, allPayments] = await Promise.all([
    batchIds.length   ? db.select().from(sessions)    : Promise.resolve([]),
    studentIds.length ? db.select().from(rto_records) : Promise.resolve([]),
    studentIds.length ? db.select().from(fee_payments): Promise.resolve([]),
  ])

  const allAttendance = allSessions.length
    ? await db.select().from(attendance)
    : []

  const mySessions   = (allSessions as any[]).filter((s: any) => batchIds.includes(s.batch_id))
  const todaySessions= mySessions.filter((s: any) => s.session_date === today)
  const myAttendance = (allAttendance as any[]).filter((a: any) => studentIds.includes(a.student_id))
  const myRto        = (allRto as any[]).filter((r: any) => studentIds.includes(r.student_id))
  const myFees       = (allFees as any[]).filter((f: any) => studentIds.includes(f.student_id))
  const myPayments   = (allPayments as any[]).filter((p: any) => studentIds.includes(p.student_id))

  const instrMap  = Object.fromEntries(allUsers.map((u: any) => [u.id, u.name]))
  const batchMap  = Object.fromEntries(allBatches.map((b: any) => [b.id, b]))
  const studentMap = Object.fromEntries(allStudents.map((s: any) => [s.id, s]))
  const feeMap    = Object.fromEntries(myFees.map((f: any) => [f.student_id, f]))
  const rtoMap    = Object.fromEntries(myRto.map((r: any) => [r.student_id, r]))

  function presentCount(studentId: string) {
    return myAttendance.filter((a: any) => a.student_id === studentId && a.status === 'present').length
  }

  const studentsData = allStudents.map((s: any) => {
    const batch = s.batch_id ? batchMap[s.batch_id] : null
    const fee   = feeMap[s.id]
    const rto   = rtoMap[s.id]
    const done  = presentCount(s.id)
    return {
      id:     s.id,
      name:   s.name,
      phone:  s.phone,
      status: s.status,
      course: s.course_type,
      batch:  batch?.name ?? 'unassigned',
      sessions_done:  done,
      sessions_total: batch?.total_sessions ?? 0,
      fee_total:   fee ? Number(fee.total_amount) : 0,
      fee_paid:    fee ? Number(fee.paid_amount)  : 0,
      fee_balance: fee ? Math.max(0, Number(fee.total_amount) - Number(fee.paid_amount)) : 0,
      fee_status:  fee?.payment_status ?? 'unknown',
      ll_number:   rto?.ll_number ?? null,
      test_date:   rto?.test_date ?? null,
      dl_number:   rto?.dl_number ?? null,
      rto_status:  rto?.test_status ?? 'not_scheduled',
    }
  })

  const todayAttendance = todaySessions.map((sess: any) => {
    const batch = batchMap[sess.batch_id]
    const batchStudents = allStudents.filter((s: any) => s.batch_id === sess.batch_id)
    const present = myAttendance
      .filter((a: any) => a.session_id === sess.id && a.status === 'present')
      .map((a: any) => studentMap[a.student_id]?.name)
    const absent  = myAttendance
      .filter((a: any) => a.session_id === sess.id && a.status === 'absent')
      .map((a: any) => studentMap[a.student_id]?.name)
    return {
      batch: batch?.name,
      session_num: sess.session_num,
      total_students: batchStudents.length,
      present, absent,
      marked: myAttendance.some((a: any) => a.session_id === sess.id),
    }
  })

  // Fee summary
  const feeSummary = {
    total_students:  allStudents.length,
    paid:     myFees.filter((f: any) => f.payment_status === 'paid').length,
    partial:  myFees.filter((f: any) => f.payment_status === 'partial').length,
    unpaid:   myFees.filter((f: any) => f.payment_status === 'unpaid').length,
    total_collected: myFees.reduce((s: number, f: any) => s + Number(f.paid_amount), 0),
    total_pending:   myFees.reduce((s: number, f: any) => s + Math.max(0, Number(f.total_amount) - Number(f.paid_amount)), 0),
    pending_confirmations: myPayments.filter((p: any) => !p.is_confirmed).length,
  }

  // Lead summary
  const leadSummary = {
    new:        allLeads.filter((l: any) => l.status === 'new').length,
    called:     allLeads.filter((l: any) => l.status === 'called').length,
    interested: allLeads.filter((l: any) => l.status === 'interested').length,
    enrolled:   allLeads.filter((l: any) => l.status === 'enrolled').length,
    lost:       allLeads.filter((l: any) => l.status === 'lost').length,
    follow_up_today: allLeads.filter((l: any) => l.follow_up_at === today && l.status !== 'enrolled' && l.status !== 'lost').length,
  }

  // RTO summary
  const rtoSummary = {
    ll_pending:   myRto.filter((r: any) => !r.ll_number).length,
    test_upcoming: myRto.filter((r: any) => r.test_date && r.test_date >= today).length,
    dl_issued:    myRto.filter((r: any) => r.dl_number).length,
  }

  return {
    today,
    total_students: allStudents.length,
    active_batches: allBatches.filter((b: any) => b.status === 'active').length,
    today_sessions: todaySessions.length,
    students: studentsData,
    today_attendance: todayAttendance,
    fee_summary: feeSummary,
    lead_summary: leadSummary,
    rto_summary: rtoSummary,
  }
}
