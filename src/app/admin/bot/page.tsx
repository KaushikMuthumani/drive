import { getSessionWithUser } from '@/lib/auth/session'
import Shell from '@/components/shared/Shell'
import BotSetupPage from '@/components/admin/BotSetupPage'
import { db } from '@/lib/db/client'
import { school_settings } from '@/db/schema'
import { eq } from 'drizzle-orm'

const BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME ?? 'DriveIndiaBot'

export default async function AdminBotPage() {
  const { user, school } = await getSessionWithUser()

  const [settings] = await db.select().from(school_settings)
    .where(eq(school_settings.school_id, school.id))

  return (
    <Shell role="admin" userName={user.name} schoolName={school.name}>
      <BotSetupPage
        verifyCode={settings?.telegram_verify_code ?? null}
        telegramLinked={!!settings?.telegram_chat_id}
        botUsername={BOT_USERNAME}
      />
    </Shell>
  )
}
