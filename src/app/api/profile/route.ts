import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { users, schools } from '@/db/schema'
import { verifyToken } from '@/lib/auth/jwt'
import { hashPassword } from '@/lib/auth/password'

export async function GET(req: NextRequest) {
  const token = req.cookies.get('token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyToken(token)
  const [user]   = await db.select().from(users).where(eq(users.id, payload.sub))
  const [school] = await db.select().from(schools).where(eq(schools.id, payload.school_id))
  return NextResponse.json({ user: { ...user, password_hash: undefined }, school })
}

export async function PUT(req: NextRequest) {
  const token = req.cookies.get('token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyToken(token)
  const body = await req.json()

  if (body.type === 'user') {
    const updates: Record<string, any> = { name: body.name }
    if (body.new_password) updates.password_hash = await hashPassword(body.new_password)
    await db.update(users).set(updates).where(eq(users.id, payload.sub))
  } else if (body.type === 'school' && payload.role === 'admin') {
    await db.update(schools).set({
      name: body.name, address: body.address,
      phone: body.phone, email: body.email, gst_number: body.gst_number,
    }).where(eq(schools.id, payload.school_id))
  }
  return NextResponse.json({ ok: true })
}
