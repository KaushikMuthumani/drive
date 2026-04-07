import { getSessionWithUser } from '@/lib/auth/session'
import Shell from '@/components/shared/Shell'
import BotSetupPage from '@/components/admin/BotSetupPage'

export default async function AdminBotPage() {
  const { user, school } = await getSessionWithUser()
  return (
    <Shell role="admin" userName={user.name} schoolName={school.name}>
      <BotSetupPage
        botToken={process.env.TELEGRAM_BOT_TOKEN ? 'configured' : 'not_set'}
        adminChatId={process.env.TELEGRAM_ADMIN_CHAT_ID ?? ''}
        appUrl={process.env.NEXT_PUBLIC_APP_URL ?? ''}
      />
    </Shell>
  )
}
