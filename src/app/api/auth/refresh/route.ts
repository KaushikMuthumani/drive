import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { users } from '@/db/schema'
import { verifyRefreshToken, signToken, signRefreshToken } from '@/lib/auth/jwt'

const isProd = process.env.NODE_ENV === 'production'

export async function POST(req: NextRequest) {
  // refresh_token cookie path is /api/auth/refresh — it arrives here
  const refreshToken = req.cookies.get('refresh_token')?.value
  if (!refreshToken) return NextResponse.json({ error: 'No refresh token' }, { status: 401 })

  try {
    const { sub } = await verifyRefreshToken(refreshToken)
    const [user] = await db.select().from(users).where(eq(users.id, sub))
    if (!user || !user.is_active) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const [newAccess, newRefresh] = await Promise.all([
      signToken({ sub: user.id, school_id: user.school_id, role: user.role }),
      signRefreshToken(user.id),
    ])

    const res = NextResponse.json({ ok: true })

    res.cookies.set('token', newAccess, {
      httpOnly: true, secure: isProd, sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, path: '/',
    })
    res.cookies.set('refresh_token', newRefresh, {
      httpOnly: true, secure: isProd, sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365, path: '/api/auth/refresh',
    })

    return res
  } catch {
    return NextResponse.json({ error: 'Invalid refresh token' }, { status: 401 })
  }
}
