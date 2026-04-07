import { getSessionWithUser } from '@/lib/auth/session'
import Shell from '@/components/shared/Shell'
import ProfilePage from '@/components/shared/ProfilePage'
import { db } from '@/lib/db/client'
import { school_settings } from '@/db/schema'
import { eq } from 'drizzle-orm'

export default async function AdminProfilePage() {
  const { user, school } = await getSessionWithUser()
  const [settings] = await db.select().from(school_settings).where(eq(school_settings.school_id, school.id))
  return (
    <Shell role="admin" userName={user.name} schoolName={school.name}>
      <ProfilePage user={user} school={school} settings={settings ?? null} isAdmin />
    </Shell>
  )
}
