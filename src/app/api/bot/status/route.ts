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
  return NextResponse.json({ linked: !!settings?.telegram_chat_id })
}
