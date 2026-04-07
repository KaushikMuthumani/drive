import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { students } from '@/db/schema'
import { verifyToken } from '@/lib/auth/jwt'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const token = req.cookies.get('token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyToken(token)
  if (payload.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await req.json()
  const [student] = await db.update(students)
    .set({ name: body.name, phone: body.phone, status: body.status, batch_id: body.batch_id })
    .where(eq(students.id, params.id))
    .returning()
  return NextResponse.json({ data: student })
}
