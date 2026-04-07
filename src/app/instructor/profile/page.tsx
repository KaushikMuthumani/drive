import { getSessionWithUser } from '@/lib/auth/session'
import Shell from '@/components/shared/Shell'
import ProfilePage from '@/components/shared/ProfilePage'

export default async function InstructorProfilePage() {
  const { user, school } = await getSessionWithUser()
  return (
    <Shell role="instructor" userName={user.name} schoolName={school.name}>
      <ProfilePage user={user} school={school} settings={null} isAdmin={false} />
    </Shell>
  )
}
