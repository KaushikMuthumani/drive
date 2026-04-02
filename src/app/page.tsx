import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth/jwt'

export default async function RootPage() {
  const cookieStore = cookies()
  const token = cookieStore.get('token')?.value
  if (token) {
    try {
      const payload = await verifyToken(token)
      redirect(payload.role === 'admin' ? '/admin/dashboard' : '/instructor/schedule')
    } catch {
      // invalid token — fall through to homepage
    }
  }
  redirect('/home')
}
