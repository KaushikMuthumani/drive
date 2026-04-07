import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { leads } from '@/db/schema'
import { verifyToken } from '@/lib/auth/jwt'

const schema = z.object({
  name:        z.string().min(2),
  phone:       z.string().min(10),
  course_type: z.enum(['2-wheeler','4-wheeler','heavy']).default('4-wheeler'),
  source:      z.enum(['walk_in','phone','whatsapp','referral','facebook','other']).default('phone'),
  notes:       z.string().optional(),
})

export async function GET(req: NextRequest) {
  const token = req.cookies.get('token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyToken(token)
  const result = await db.select().from(leads)
    .where(eq(leads.school_id, payload.school_id))
    .orderBy(leads.created_at)
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
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
  const [lead] = await db.insert(leads).values({
    ...parsed.data, school_id: payload.school_id,
    course_type: parsed.data.course_type as any,
    source: parsed.data.source as any,
    status: 'new' as any,
    follow_up_at: tomorrow.toISOString().split('T')[0],
  }).returning()
  return NextResponse.json({ data: lead }, { status: 201 })
}
