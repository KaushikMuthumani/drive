import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { leads } from '@/db/schema'
import { verifyToken } from '@/lib/auth/jwt'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const token = req.cookies.get('token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await verifyToken(token)
  const body = await req.json()
  const [lead] = await db.update(leads)
    .set({ ...body, updated_at: new Date() })
    .where(eq(leads.id, params.id))
    .returning()
  return NextResponse.json({ data: lead })
}
