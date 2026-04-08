import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const envAppUrl = process.env.NODE_ENV === 'production'
    ? process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '')
    : undefined
  const origin = envAppUrl ?? req.nextUrl.origin
  const res = NextResponse.redirect(new URL('/auth/login', origin))
  res.cookies.delete('token', { path: '/' })
  res.cookies.delete('refresh_token', { path: '/api/auth/refresh' })
  return res
}
