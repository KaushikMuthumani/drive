import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { school_settings } from '@/db/schema'
import { verifyToken } from '@/lib/auth/jwt'

export async function POST(req: NextRequest) {
  const token = req.cookies.get('token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyToken(token)
  await db.update(school_settings)
    .set({ telegram_chat_id: null as any, telegram_verify_code: null as any, updated_at: new Date() })
    .where(eq(school_settings.school_id, payload.school_id))
  return NextResponse.json({ ok: true })
}
