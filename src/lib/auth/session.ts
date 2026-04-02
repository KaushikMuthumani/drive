import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { verifyToken } from './jwt'
import { db } from '@/lib/db/client'
import { users, schools } from '@/db/schema'

export async function getSession() {
  const cookieStore = cookies()
  const token = cookieStore.get('token')?.value
  if (!token) redirect('/auth/login')
  try {
    return await verifyToken(token)
  } catch {
    redirect('/auth/login')
  }
}

export async function getSessionWithUser() {
  const payload = await getSession()
  const [user] = await db.select().from(users).where(eq(users.id, payload.sub))
  const [school] = await db.select().from(schools).where(eq(schools.id, payload.school_id))
  if (!user || !school) redirect('/auth/login')
  return { payload, user, school }
}
