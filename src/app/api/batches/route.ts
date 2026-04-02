import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { batches, sessions } from '@/db/schema'
import { verifyToken } from '@/lib/auth/jwt'
import { COURSE_SESSIONS, generateSessionDates } from '@/lib/course/config'

const schema = z.object({
  instructor_id:  z.string().uuid(),
  vehicle_id:     z.string().uuid(),
  name:           z.string().min(3),
  slot_time:      z.string().regex(/^\d{2}:\d{2}$/),
  day_pref:       z.enum(['weekdays', 'weekends', 'all']),
  course_type:    z.enum(['2-wheeler', '4-wheeler', 'heavy']),
  start_date:     z.string(),
  max_students:   z.number().min(1).max(6).default(4),
})

export async function GET(req: NextRequest) {
  const token = req.cookies.get('token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyToken(token)
  const result = await db.select().from(batches)
    .where(eq(batches.school_id, payload.school_id))
    .orderBy(batches.slot_time)
  return NextResponse.json({ data: result })
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get('token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyToken(token)
  if (payload.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const d = parsed.data
  const total_sessions = COURSE_SESSIONS[d.course_type]

  const [batch] = await db.insert(batches).values({
    ...d,
    school_id:      payload.school_id,
    slot_time:      d.slot_time + ':00',
    total_sessions,
    status:         'active',
  } as any).returning()

  // Pre-generate all session dates for this batch
  const dates = generateSessionDates(d.start_date, d.day_pref as any, total_sessions)
  if (dates.length > 0) {
    await db.insert(sessions).values(
      dates.map((session_date, i) => ({
        batch_id:     batch.id,
        session_date,
        session_num:  i + 1,
      }))
    )
  }

  return NextResponse.json({ data: batch }, { status: 201 })
}
