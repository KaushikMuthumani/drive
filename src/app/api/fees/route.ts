import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { fees } from '@/db/schema'
import { verifyToken } from '@/lib/auth/jwt'

export async function GET(req: NextRequest) {
  const token = req.cookies.get('token')?.value!
  await verifyToken(token)
  const result = await db.select().from(fees)
  return NextResponse.json({ data: result })
}
