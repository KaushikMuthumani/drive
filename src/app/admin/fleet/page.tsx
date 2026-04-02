import { eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { vehicles } from '@/db/schema'
import { getSessionWithUser } from '@/lib/auth/session'
import Shell from '@/components/shared/Shell'
import FleetPage from '@/components/admin/FleetPage'

export default async function AdminFleetPage() {
  const { user, school } = await getSessionWithUser()
  const fleet = await db.select().from(vehicles).where(eq(vehicles.school_id, school.id))
  return (
    <Shell role="admin" userName={user.name} schoolName={school.name}>
      <FleetPage vehicles={fleet} schoolId={school.id}/>
    </Shell>
  )
}
