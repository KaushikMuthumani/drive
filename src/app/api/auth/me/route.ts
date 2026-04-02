import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, shouldRefresh, signToken } from '@/lib/auth/jwt'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { users } from '@/db/schema'

const isProd = process.env.NODE_ENV === 'production'

export async function GET(req: NextRequest) {
  const token = req.cookies.get('token')?.value
  if (!token) return NextResponse.json({ authenticated: false }, { status: 401 })

  try {
    const payload = await verifyToken(token)
    const [user] = await db.select().from(users).where(eq(users.id, payload.sub))
    if (!user || !user.is_active) return NextResponse.json({ authenticated: false }, { status: 401 })

    const res = NextResponse.json({
      authenticated: true,
      user: { id: user.id, name: user.name, role: user.role, school_id: user.school_id },
    })

    // Silently rotate access token if it's within 7 days of expiry
    if (shouldRefresh(payload)) {
      const newToken = await signToken({ sub: user.id, school_id: user.school_id, role: user.role })
      res.cookies.set('token', newToken, {
        httpOnly: true, secure: isProd, sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, path: '/',
      })
    }

    return res
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }
}
