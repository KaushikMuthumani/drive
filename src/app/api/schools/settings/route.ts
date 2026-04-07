import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { school_settings } from '@/db/schema'
import { verifyToken } from '@/lib/auth/jwt'

export async function GET(req: NextRequest) {
  const token = req.cookies.get('token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyToken(token)
  const [settings] = await db.select().from(school_settings)
    .where(eq(school_settings.school_id, payload.school_id))
  return NextResponse.json({ data: settings ?? null })
}

export async function PUT(req: NextRequest) {
  const token = req.cookies.get('token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyToken(token)
  if (payload.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await req.json()
  const existing = await db.select().from(school_settings)
    .where(eq(school_settings.school_id, payload.school_id))
  let result
  if (existing.length > 0) {
    ;[result] = await db.update(school_settings)
      .set({ upi_id: body.upi_id, upi_qr_url: body.upi_qr_url, updated_at: new Date() })
      .where(eq(school_settings.school_id, payload.school_id))
      .returning()
  } else {
    ;[result] = await db.insert(school_settings)
      .values({ school_id: payload.school_id, upi_id: body.upi_id, upi_qr_url: body.upi_qr_url })
      .returning()
  }
  return NextResponse.json({ data: result })
}
