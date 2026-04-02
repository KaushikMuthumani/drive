import { NextRequest, NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/lib/db/client'
import { verifyToken } from '@/lib/auth/jwt'
import { ensureRescheduleRequestsTable } from '@/lib/reschedule/requests'

const createSchema = z.object({
  student_id: z.string().uuid(),
  portal_token: z.string().min(8),
  requested_date: z.string().optional(),
  requested_time: z.string().optional(),
  reason: z.string().min(5),
})

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  await ensureRescheduleRequestsTable()

  const [student] = (await db.execute(sql`
    select s.*, b.instructor_id
    from students s
    left join batches b on b.id = s.batch_id
    where s.id = ${parsed.data.student_id}::uuid
      and s.portal_token = ${parsed.data.portal_token}
  `)).rows

  if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 })

  const inserted = await db.execute(sql`
    insert into reschedule_requests (
      school_id, batch_id, student_id, instructor_id,
      requested_date, requested_time, reason, status
    ) values (
      ${student.school_id}::uuid,
      ${student.batch_id ?? null}::uuid,
      ${student.id}::uuid,
      ${student.instructor_id ?? null}::uuid,
      ${parsed.data.requested_date ?? null},
      ${parsed.data.requested_time ?? null},
      ${parsed.data.reason},
      'pending'
    )
    returning *
  `)

  return NextResponse.json({ data: inserted.rows[0] }, { status: 201 })
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get('token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const payload = await verifyToken(token)
  await ensureRescheduleRequestsTable()

  const whereClause = payload.role === 'admin'
    ? sql`where rr.school_id = ${payload.school_id}::uuid`
    : sql`where rr.instructor_id = ${payload.sub}::uuid`

  const result = await db.execute(sql`
    select rr.*, s.name as student_name, b.name as batch_name
    from reschedule_requests rr
    join students s on s.id = rr.student_id
    left join batches b on b.id = rr.batch_id
    ${whereClause}
    order by rr.created_at desc
  `)

  return NextResponse.json({ data: result.rows })
}
