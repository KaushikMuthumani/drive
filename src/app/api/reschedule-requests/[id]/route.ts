import { NextRequest, NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/lib/db/client'
import { verifyToken } from '@/lib/auth/jwt'
import { ensureRescheduleRequestsTable } from '@/lib/reschedule/requests'

const updateSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  instructor_note: z.string().optional(),
  approved_date: z.string().optional(),
  approved_time: z.string().optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const token = req.cookies.get('token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const payload = await verifyToken(token)
  if (!['admin', 'instructor'].includes(payload.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  await ensureRescheduleRequestsTable()

  const accessClause = payload.role === 'admin'
    ? sql`and school_id = ${payload.school_id}::uuid`
    : sql`and instructor_id = ${payload.sub}::uuid`

  const updated = await db.execute(sql`
    update reschedule_requests
    set status = ${parsed.data.status},
        instructor_note = ${parsed.data.instructor_note ?? null},
        approved_date = ${parsed.data.status === 'approved' ? parsed.data.approved_date ?? null : null},
        approved_time = ${parsed.data.status === 'approved' ? parsed.data.approved_time ?? null : null},
        updated_at = now()
    where id = ${params.id}::uuid
    ${accessClause}
    returning *
  `)

  if (updated.rows.length === 0) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 })
  }

  return NextResponse.json({ data: updated.rows[0] })
}
