import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { attendance } from '@/db/schema'
import { verifyToken } from '@/lib/auth/jwt'

const schema = z.object({
  records: z.array(z.object({
    student_id:   z.string().uuid(),
    status:       z.enum(['present', 'absent', 'holiday']),
    skill_scores: z.record(z.number()).nullish(),
    notes:        z.string().nullish(),
  }))
})

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const result = await db.select().from(attendance).where(eq(attendance.session_id, params.id))
  return NextResponse.json({ data: result })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const token = req.cookies.get('token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await verifyToken(token)

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  // Upsert — delete existing then re-insert (simpler than complex upsert)
  await db.delete(attendance).where(eq(attendance.session_id, params.id))
  const rows = await db.insert(attendance).values(
    parsed.data.records.map(r => ({
      session_id: params.id,
      student_id: r.student_id,
      status:     r.status as any,
      skill_scores: r.skill_scores ?? {},
      notes:      r.notes,
    }))
  ).returning()

  return NextResponse.json({ data: rows })
}
