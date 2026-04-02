import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { sendOtp } from '@/lib/auth/otp'

const schema = z.object({ phone: z.string().length(10) })

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 })
  try {
    await sendOtp(parsed.data.phone)
    return NextResponse.json({ message: 'OTP sent' })
  } catch {
    return NextResponse.json({ error: 'Failed to send OTP' }, { status: 500 })
  }
}
