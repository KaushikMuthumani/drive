import { NextRequest, NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/lib/db/client'
import { students } from '@/db/schema'
import { verifyToken } from '@/lib/auth/jwt'

const updateSchema = z.object({
  batch_id: z.preprocess(
    value => value === '' || value == null ? null : value,
    z.string().uuid().nullable().optional()
  ),
  day_pref: z.enum(['weekdays', 'weekends', 'all']).optional(),
  preferred_time: z.preprocess(
    value => value === '' || value == null ? null : value,
    z.string().nullable().optional()
  ),
  status: z.enum(['enrolled', 'active', 'completed', 'on_hold', 'dropped']).optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: { studentId: string } }) {
  const token = req.cookies.get('token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const payload = await verifyToken(token)
  if (payload.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const [student] = await db.select().from(students).where(
    and(eq(students.id, params.studentId), eq(students.school_id, payload.school_id))
  )

  if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 })

  const updates = Object.fromEntries(
    Object.entries(parsed.data).filter(([, value]) => value !== undefined)
  )

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ data: student })
  }

  const [updated] = await db.update(students)
    .set(updates as any)
    .where(eq(students.id, params.studentId))
    .returning()

  return NextResponse.json({ data: updated })
}
