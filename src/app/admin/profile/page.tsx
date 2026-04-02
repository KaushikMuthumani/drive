import Shell from '@/components/shared/Shell'
import SchoolProfilePage from '@/components/admin/SchoolProfilePage'
import { getSessionWithUser } from '@/lib/auth/session'

export default async function AdminProfileRoute() {
  const { user, school } = await getSessionWithUser()

  return (
    <Shell role="admin" userName={user.name} schoolName={school.name}>
      <SchoolProfilePage school={school} admin={user} />
    </Shell>
  )
}
