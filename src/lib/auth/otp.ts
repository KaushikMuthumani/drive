// OTP via MSG91 — in dev mode, any 6-digit OTP is accepted (123456)

export async function sendOtp(phone: string): Promise<void> {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[DEV] OTP for ${phone}: 123456`)
    return
  }
  const res = await fetch(
    `https://api.msg91.com/api/v5/otp?template_id=${process.env.MSG91_TEMPLATE_ID}&mobile=91${phone}`,
    { method: 'POST', headers: { authkey: process.env.MSG91_AUTH_KEY! } }
  )
  if (!res.ok) throw new Error('Failed to send OTP')
}

export async function verifyOtp(phone: string, otp: string): Promise<boolean> {
  if (process.env.NODE_ENV !== 'production') {
    return otp === '123456'
  }
  const res = await fetch(
    `https://api.msg91.com/api/v5/otp/verify?mobile=91${phone}&otp=${otp}`,
    { headers: { authkey: process.env.MSG91_AUTH_KEY! } }
  )
  const data = await res.json()
  return data.type === 'success'
}
