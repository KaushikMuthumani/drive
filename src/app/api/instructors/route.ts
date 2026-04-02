import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { users } from '@/db/schema'
import { verifyToken } from '@/lib/auth/jwt'
import { hashPassword } from '@/lib/auth/password'

const schema = z.object({
  name:     z.string().min(2),
  phone:    z.string().length(10),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export async function GET(req: NextRequest) {
  const token = req.cookies.get('token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyToken(token)
  const result = await db.select().from(users).where(
    and(eq(users.school_id, payload.school_id), eq(users.role, 'instructor'))
  )
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

  // Check phone not already taken
  const existing = await db.select().from(users).where(eq(users.phone, parsed.data.phone))
  if (existing.length > 0) return NextResponse.json({ error: 'This phone number is already registered.' }, { status: 409 })

  const password_hash = await hashPassword(parsed.data.password)
  const [user] = await db.insert(users).values({
    school_id: payload.school_id,
    name:      parsed.data.name,
    phone:     parsed.data.phone,
    password_hash,
    role: 'instructor',
  }).returning()

  return NextResponse.json({ data: user }, { status: 201 })
}
