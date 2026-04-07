import { eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { leads } from '@/db/schema'
import { getSessionWithUser } from '@/lib/auth/session'
import Shell from '@/components/shared/Shell'
import EnquiriesPage from '@/components/admin/EnquiriesPage'

export default async function AdminEnquiriesPage() {
  const { user, school } = await getSessionWithUser()
  const allLeads = await db.select().from(leads)
    .where(eq(leads.school_id, school.id))
    .orderBy(leads.created_at)
  return (
    <Shell role="admin" userName={user.name} schoolName={school.name}>
      <EnquiriesPage leads={allLeads} />
    </Shell>
  )
}
