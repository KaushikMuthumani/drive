import { NextResponse } from 'next/server'
export async function POST() {
  const res = NextResponse.redirect(new URL('/auth/login', process.env.NEXT_PUBLIC_APP_URL!))
  res.cookies.delete('token')
  return res
}
