import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { schools, cities, users } from '@/db/schema'
import { signToken, signRefreshToken } from '@/lib/auth/jwt'
import { hashPassword } from '@/lib/auth/password'

const schema = z.object({
  school_name:    z.string().min(3),
  school_address: z.string().min(5),
  school_phone:   z.string().length(10),
  school_email:   z.string().email(),
  city_name:      z.string().min(2),
  state:          z.string().min(2),
  admin_name:     z.string().min(2),
  admin_phone:    z.string().length(10),
  password:       z.string().min(6, 'Password must be at least 6 characters'),
})

const isProd = process.env.NODE_ENV === 'production'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const d = parsed.data

  const existing = await db.select().from(users).where(eq(users.phone, d.admin_phone))
  if (existing.length > 0)
    return NextResponse.json({ error: 'This phone number is already registered.' }, { status: 409 })

  const existingSchool = await db.select().from(schools).where(eq(schools.phone, d.school_phone))
  if (existingSchool.length > 0)
    return NextResponse.json({ error: 'A school with this phone number is already registered.' }, { status: 409 })

  let city = (await db.select().from(cities).where(eq(cities.name, d.city_name)))[0]
  if (!city) {
    ;[city] = await db.insert(cities).values({
      name: d.city_name, state: d.state,
      rto_office_name:    `RTO ${d.city_name}`,
      rto_office_address: `RTO Office, ${d.city_name}`,
    }).returning()
  }

  const [school] = await db.insert(schools).values({
    city_id: city.id, name: d.school_name,
    address: d.school_address, phone: d.school_phone, email: d.school_email,
  }).returning()

  const password_hash = await hashPassword(d.password)
  const [admin] = await db.insert(users).values({
    school_id: school.id, name: d.admin_name,
    phone: d.admin_phone, password_hash, role: 'admin',
  }).returning()

  const [accessToken, refreshToken] = await Promise.all([
    signToken({ sub: admin.id, school_id: school.id, role: 'admin' }),
    signRefreshToken(admin.id),
  ])

  const res = NextResponse.json({
    message: 'School registered!',
    school:  { id: school.id, name: school.name },
    user:    { id: admin.id, name: admin.name, role: 'admin' },
  }, { status: 201 })

  res.cookies.set('token', accessToken, {
    httpOnly: true, secure: isProd, sameSite: 'lax', maxAge: 60 * 60 * 24 * 30, path: '/',
  })
  res.cookies.set('refresh_token', refreshToken, {
    httpOnly: true, secure: isProd, sameSite: 'lax', maxAge: 60 * 60 * 24 * 365, path: '/api/auth/refresh',
  })
  return res
}
