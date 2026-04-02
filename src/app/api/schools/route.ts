import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { and, eq, ne } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { schools, cities, users } from '@/db/schema'
import { signToken, signRefreshToken, verifyToken } from '@/lib/auth/jwt'
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

const updateSchema = z.object({
  school_name:    z.string().min(3),
  school_address: z.string().min(5),
  school_phone:   z.string().length(10),
  school_email:   z.string().email(),
  gst_number:     z.string().optional().or(z.literal('')),
  admin_name:     z.string().min(2),
  admin_phone:    z.string().length(10),
})

const isProd = process.env.NODE_ENV === 'production'

export async function POST(req: NextRequest) {
  try {
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
  } catch (error) {
    console.error('School signup failed:', error)
    return NextResponse.json({ error: 'Signup failed. Check your Vercel environment variables and database connection.' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get('token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const payload = await verifyToken(token)
  const [school] = await db.select().from(schools).where(eq(schools.id, payload.school_id))
  const [admin] = await db.select().from(users).where(eq(users.id, payload.sub))

  if (!school || !admin) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ data: { school, admin } })
}

export async function PATCH(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const payload = await verifyToken(token)
    if (payload.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    const d = parsed.data

    const existingSchoolPhone = await db.select().from(schools).where(
      and(eq(schools.phone, d.school_phone), ne(schools.id, payload.school_id))
    )
    if (existingSchoolPhone.length > 0) {
      return NextResponse.json({ error: 'Another school already uses this phone number.' }, { status: 409 })
    }

    const existingSchoolEmail = await db.select().from(schools).where(
      and(eq(schools.email, d.school_email), ne(schools.id, payload.school_id))
    )
    if (existingSchoolEmail.length > 0) {
      return NextResponse.json({ error: 'Another school already uses this email address.' }, { status: 409 })
    }

    const existingAdminPhone = await db.select().from(users).where(
      and(eq(users.phone, d.admin_phone), ne(users.id, payload.sub))
    )
    if (existingAdminPhone.length > 0) {
      return NextResponse.json({ error: 'Another user already uses this admin phone number.' }, { status: 409 })
    }

    const [school] = await db.update(schools).set({
      name: d.school_name,
      address: d.school_address,
      phone: d.school_phone,
      email: d.school_email,
      gst_number: d.gst_number || null,
    } as any).where(eq(schools.id, payload.school_id)).returning()

    const [admin] = await db.update(users).set({
      name: d.admin_name,
      phone: d.admin_phone,
    }).where(eq(users.id, payload.sub)).returning()

    return NextResponse.json({ data: { school, admin } })
  } catch (error) {
    console.error('School profile update failed:', error)
    return NextResponse.json({ error: 'Failed to update school profile.' }, { status: 500 })
  }
}
