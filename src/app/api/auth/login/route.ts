import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { users } from '@/db/schema'
import { signToken, signRefreshToken } from '@/lib/auth/jwt'
import { verifyPassword } from '@/lib/auth/password'

const schema = z.object({
  phone:    z.string().length(10),
  password: z.string().min(1),
})

const isProd = process.env.NODE_ENV === 'production'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const [user] = await db.select().from(users).where(eq(users.phone, parsed.data.phone))
  if (!user)         return NextResponse.json({ error: 'No account with this number. Register your school first.' }, { status: 404 })
  if (!user.is_active) return NextResponse.json({ error: 'Account inactive. Contact support.' }, { status: 403 })
  if (!user.password_hash) return NextResponse.json({ error: 'Account setup incomplete. Contact admin.' }, { status: 403 })

  const ok = await verifyPassword(parsed.data.password, user.password_hash)
  if (!ok) return NextResponse.json({ error: 'Incorrect password.' }, { status: 401 })

  const [accessToken, refreshToken] = await Promise.all([
    signToken({ sub: user.id, school_id: user.school_id, role: user.role }),
    signRefreshToken(user.id),
  ])

  const res = NextResponse.json({
    user: { id: user.id, name: user.name, role: user.role, school_id: user.school_id },
  })
  res.cookies.set('token', accessToken, {
    httpOnly: true, secure: isProd, sameSite: 'lax', maxAge: 60 * 60 * 24 * 30, path: '/',
  })
  res.cookies.set('refresh_token', refreshToken, {
    httpOnly: true, secure: isProd, sameSite: 'lax', maxAge: 60 * 60 * 24 * 365, path: '/api/auth/refresh',
  })
  return res
}
