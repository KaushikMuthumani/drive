import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { students, rto_records, fees } from '@/db/schema'
import { verifyToken } from '@/lib/auth/jwt'
import { COURSE_SESSIONS, generatePortalToken } from '@/lib/course/config'

const enrollSchema = z.object({
  name:           z.string().min(2),
  phone:          z.string().length(10),
  course_type:    z.enum(['2-wheeler', '4-wheeler', 'heavy']),
  batch_id:       z.preprocess(
    value => value === '' || value == null ? undefined : value,
    z.string().uuid().optional()
  ),
  day_pref:       z.enum(['weekdays', 'weekends', 'all']).default('weekdays'),
  preferred_time: z.string().optional(),
  fee_amount:     z.number().positive(),
})

export async function GET(req: NextRequest) {
  const token = req.cookies.get('token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyToken(token)
  const result = await db.select().from(students)
    .where(eq(students.school_id, payload.school_id))
    .orderBy(students.enrolled_at)
  return NextResponse.json({ data: result })
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get('token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyToken(token)
  if (payload.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const parsed = enrollSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { name, phone, course_type, batch_id, day_pref, preferred_time, fee_amount } = parsed.data
  const portal_token = generatePortalToken()
  const totalSessions = COURSE_SESSIONS[course_type]

  const legacyStudentsColumns = await db.execute(sql`
    select column_name
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'students'
      and column_name = 'total_lessons'
  `)

  let student: any

  if (legacyStudentsColumns.rows.length > 0) {
    const inserted = await db.execute(sql`
      insert into students (
        school_id,
        name,
        phone,
        portal_token,
        course_type,
        total_lessons,
        batch_id,
        day_pref,
        preferred_time,
        status
      ) values (
        ${payload.school_id}::uuid,
        ${name},
        ${phone},
        ${portal_token},
        ${course_type}::course_type,
        ${totalSessions},
        ${batch_id ?? null}::uuid,
        ${day_pref}::day_pref,
        ${preferred_time ?? null},
        ${'active'}::student_status
      )
      returning *
    `)
    student = inserted.rows[0]
  } else {
    ;[student] = await db.insert(students).values({
      school_id:      payload.school_id,
      name, phone,
      course_type:    course_type as any,
      portal_token,
      batch_id:       batch_id || null,
      day_pref:       day_pref as any,
      preferred_time: preferred_time || null,
      status:         'active' as any,
    }).returning()
  }

  if (!student) {
    return NextResponse.json({ error: 'Failed to create student' }, { status: 500 })
  }

  // Auto-create RTO record and fee record
  await db.insert(rto_records).values({ student_id: student.id } as any)
  await db.insert(fees).values({
    student_id:     student.id,
    total_amount:   String(fee_amount),
    paid_amount:    '0',
    payment_status: 'unpaid' as any,
  })

  const appUrl     = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const portal_url = `${appUrl}/s/${portal_token}`
  return NextResponse.json({ data: student, portal_url }, { status: 201 })
}
