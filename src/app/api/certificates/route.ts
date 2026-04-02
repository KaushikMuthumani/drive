import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { certificates, students, sessions, attendance, batches } from '@/db/schema'
import { verifyToken } from '@/lib/auth/jwt'

export async function POST(req: NextRequest) {
  const token = req.cookies.get('token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyToken(token)
  if (payload.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { student_id } = await req.json()
  if (!student_id) return NextResponse.json({ error: 'student_id required' }, { status: 400 })

  const [student] = await db.select().from(students).where(eq(students.id, student_id))
  if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 })
  if (!student.batch_id) return NextResponse.json({ error: 'Student not assigned to a batch' }, { status: 400 })

  const [batch] = await db.select().from(batches).where(eq(batches.id, student.batch_id))
  const allSessions   = await db.select().from(sessions).where(eq(sessions.batch_id, student.batch_id))
  const studentAtt    = await db.select().from(attendance).where(eq(attendance.student_id, student_id))
  const presentCount  = studentAtt.filter(a => a.status === 'present').length

  if (presentCount < batch.total_sessions) {
    return NextResponse.json({
      error: `Student has attended ${presentCount} of ${batch.total_sessions} sessions. Complete all sessions first.`
    }, { status: 400 })
  }

  const certNumber = `DI-${Date.now().toString(36).toUpperCase()}`
  const [cert] = await db.insert(certificates).values({
    student_id,
    certificate_number: certNumber,
    issued_date: new Date().toISOString().split('T')[0],
    pdf_url: null,
  }).returning()

  return NextResponse.json({ data: cert }, { status: 201 })
}
