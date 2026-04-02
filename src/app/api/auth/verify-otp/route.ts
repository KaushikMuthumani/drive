import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { users } from '@/db/schema'
import { verifyOtp } from '@/lib/auth/otp'
import { signToken, signRefreshToken } from '@/lib/auth/jwt'

const schema = z.object({
  phone: z.string().length(10),
  otp: z.string().length(6),
})

const isProd = process.env.NODE_ENV === 'production'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const valid = await verifyOtp(parsed.data.phone, parsed.data.otp)
  if (!valid) return NextResponse.json({ error: 'Invalid OTP' }, { status: 401 })

  const [user] = await db.select().from(users).where(eq(users.phone, parsed.data.phone))
  if (!user) return NextResponse.json({ error: 'User not found. Contact your school admin.' }, { status: 404 })
  if (!user.is_active) return NextResponse.json({ error: 'Account inactive' }, { status: 403 })

  const [accessToken, refreshToken] = await Promise.all([
    signToken({ sub: user.id, school_id: user.school_id, role: user.role }),
    signRefreshToken(user.id),
  ])

  const res = NextResponse.json({
    user: { id: user.id, name: user.name, role: user.role, school_id: user.school_id },
  })

  // Access token — 30 days
  res.cookies.set('token', accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  })

  // Refresh token — 1 year, stored in separate cookie
  res.cookies.set('refresh_token', refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
    path: '/api/auth/refresh',  // only sent to refresh endpoint
  })

  return res
}
