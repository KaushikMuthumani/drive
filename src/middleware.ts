import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify, SignJWT } from 'jose'

const PUBLIC = [
  '/auth',
  '/home',
  '/api/auth',
  '/api/schools',
  '/api/bot/telegram',
  '/_next',
  '/favicon',
  '/icons',
  '/manifest',
  '/offline',
  '/sw.js',
]

function getSecret() {
  return new TextEncoder().encode(process.env.JWT_SECRET ?? 'dev-secret-change-in-production-please')
}
const isProd = process.env.NODE_ENV === 'production'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (PUBLIC.some(p => pathname.startsWith(p))) return NextResponse.next()
  if (pathname === '/') return NextResponse.next()

  const token = req.cookies.get('token')?.value
  if (!token) {
    const refresh = req.cookies.get('refresh_token')?.value
    return NextResponse.redirect(new URL(refresh ? '/api/auth/refresh' : '/auth/login', req.url))
  }

  try {
    const { payload } = await jwtVerify(token, getSecret())
    const role = (payload as any).role

    if (pathname.startsWith('/admin') && role !== 'admin')
      return NextResponse.redirect(new URL('/instructor/today', req.url))
    if (pathname.startsWith('/instructor') && role !== 'instructor')
      return NextResponse.redirect(new URL('/admin/dashboard', req.url))

    const res = NextResponse.next()
    const exp = (payload as any).exp as number
    if (exp && exp - Math.floor(Date.now() / 1000) < 7 * 24 * 60 * 60) {
      const newToken = await new SignJWT({
        sub: payload.sub, school_id: (payload as any).school_id, role
      }).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('30d').sign(getSecret())
      res.cookies.set('token', newToken, { httpOnly: true, secure: isProd, sameSite: 'lax', maxAge: 60*60*24*30, path: '/' })
    }
    return res
  } catch {
    const res = NextResponse.redirect(new URL('/auth/login', req.url))
    res.cookies.delete('token')
    return res
  }
}

export const config = {
  matcher: ['/admin/:path*', '/instructor/:path*', '/'],
}
