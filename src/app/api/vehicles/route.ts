import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { vehicles } from '@/db/schema'
import { verifyToken } from '@/lib/auth/jwt'

const schema = z.object({
  registration_no: z.string().min(5),
  make_model: z.string().min(2),
  type: z.enum(['2-wheeler','4-wheeler','heavy']),
  service_due_date: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const token = req.cookies.get('token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyToken(token)
  const result = await db.select().from(vehicles).where(eq(vehicles.school_id, payload.school_id))
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

  const service_due_date = parsed.data.service_due_date?.trim()

  try {
    const [vehicle] = await db.insert(vehicles).values({
      ...parsed.data,
      school_id: payload.school_id,
      service_due_date: service_due_date ? service_due_date : null,
    } as any).returning()

    return NextResponse.json({ data: vehicle }, { status: 201 })
  } catch (error: any) {
    if (error?.code === '23505') {
      return NextResponse.json(
        { error: 'A vehicle with this registration number already exists.' },
        { status: 409 }
      )
    }
    throw error
  }
}
