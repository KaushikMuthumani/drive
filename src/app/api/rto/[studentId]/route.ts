import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { rto_records } from '@/db/schema'
import { verifyToken } from '@/lib/auth/jwt'

export async function GET(_: NextRequest, { params }: { params: { studentId: string } }) {
  const [record] = await db.select().from(rto_records)
    .where(eq(rto_records.student_id, params.studentId))
  return NextResponse.json({ data: record ?? null })
}

export async function PUT(req: NextRequest, { params }: { params: { studentId: string } }) {
  const token = req.cookies.get('token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyToken(token)
  if (payload.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const existing = await db.select().from(rto_records)
    .where(eq(rto_records.student_id, params.studentId))
  let record
  if (existing.length > 0) {
    const [updated] = await db.update(rto_records)
      .set(body)
      .where(eq(rto_records.student_id, params.studentId))
      .returning()
    record = updated
  } else {
    const [inserted] = await db.insert(rto_records)
      .values({ ...body, student_id: params.studentId })
      .returning()
    record = inserted
  }
  return NextResponse.json({ data: record })
}
