import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { leads, students, rto_records, fees } from '@/db/schema'
import { verifyToken } from '@/lib/auth/jwt'
import { revalidatePath } from 'next/cache'
import { COURSE_SESSIONS, generatePortalToken } from '@/lib/course/config'

const schema = z.object({
  batch_id:       z.string().uuid().optional(),
  fee_amount:     z.number().positive(),
  day_pref:       z.enum(['weekdays','weekends','all']).default('weekdays'),
  preferred_time: z.string().default('07:00'),
})

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const token = req.cookies.get('token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyToken(token)
  if (payload.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const [lead] = await db.select().from(leads).where(eq(leads.id, params.id))
  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const portal_token = generatePortalToken()
  const [student] = await db.insert(students).values({
    school_id:      payload.school_id,
    batch_id:       parsed.data.batch_id || null,
    name:           lead.name,
    phone:          lead.phone,
    portal_token,
    course_type:    lead.course_type as any,
    day_pref:       parsed.data.day_pref as any,
    preferred_time: parsed.data.preferred_time,
    status:         'enrolled' as any,
  }).returning()

  await db.insert(rto_records).values({ student_id: student.id } as any)
  await db.insert(fees).values({
    student_id:     student.id,
    total_amount:   String(parsed.data.fee_amount),
    paid_amount:    '0',
    payment_status: 'unpaid' as any,
  })
  await db.update(leads)
    .set({ status: 'enrolled' as any, converted_student_id: student.id, updated_at: new Date() })
    .where(eq(leads.id, params.id))

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const portal_url = appUrl ? `${appUrl}/s/${portal_token}` : `/s/${portal_token}`
  revalidatePath('/admin/students')
  revalidatePath('/admin/dashboard')
  return NextResponse.json({ data: student, portal_url }, { status: 201 })
}
