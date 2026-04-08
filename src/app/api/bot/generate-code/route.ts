import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { school_settings } from '@/db/schema'
import { verifyToken } from '@/lib/auth/jwt'

function randomCode() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get('token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyToken(token)
  const code = randomCode()

  const existing = await db.select().from(school_settings)
    .where(eq(school_settings.school_id, payload.school_id))

  if (existing.length > 0) {
    await db.update(school_settings)
      .set({ telegram_verify_code: code, telegram_chat_id: null as any, updated_at: new Date() })
      .where(eq(school_settings.school_id, payload.school_id))
  } else {
    await db.insert(school_settings).values({
      school_id: payload.school_id,
      telegram_verify_code: code,
    } as any)
  }
  return NextResponse.json({ code })
}
