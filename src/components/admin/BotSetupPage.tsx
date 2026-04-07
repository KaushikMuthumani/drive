'use client'
import { useState } from 'react'
import { Card, Button } from '@/components/ui'
import PageHeader from '@/components/shared/PageHeader'
import { toast } from 'sonner'

interface Props {
  botToken: string
  adminChatId: string
}

export default function BotSetupPage({ botToken, adminChatId }: Props) {
  const [registering, setRegistering] = useState(false)
  const [result, setResult]           = useState<string | null>(null)

  const isConfigured = botToken === 'configured' && !!adminChatId

  async function registerWebhook() {
    setRegistering(true)
    try {
      const origin = window.location.origin
      const res = await fetch(`/api/bot/telegram?setup=1&origin=${encodeURIComponent(origin)}`)
      const data = await res.json()
      if (data.webhook_set) {
        setResult(`✓ Webhook registered at ${data.url}`)
        toast.success('Webhook registered successfully')
      } else {
        const err = data.error ?? data.description ?? JSON.stringify(data)
        setResult(`Failed: ${err}`)
        toast.error('Webhook registration failed')
      }
    } catch (e) {
      toast.error('Failed to register webhook')
    }
    setRegistering(false)
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl">
      <PageHeader title="Telegram bot" subtitle="Query and control your school from Telegram" />

      {/* Status */}
      <Card className="mb-4">
        <div className="p-4 flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full flex-shrink-0 ${isConfigured ? 'bg-green-500' : 'bg-amber-400'}`} />
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-800">
              {isConfigured ? 'Bot configured and ready' : 'Setup required'}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {isConfigured
                ? 'Your Telegram bot is active. Message it to get started.'
                : 'Follow the steps below to activate your bot.'}
            </p>
          </div>
        </div>
      </Card>

      {/* Setup steps */}
      <div className="space-y-4">
        {[
          {
            step: 1,
            title: 'Create your Telegram bot',
            done: botToken === 'configured',
            content: (
              <div className="text-sm text-slate-600 space-y-2">
                <p>Open Telegram and message <strong>@BotFather</strong></p>
                <p>Send <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/newbot</code> and follow the prompts</p>
                <p>Copy the token BotFather gives you (looks like <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">1234567890:ABCdef...</code>)</p>
                <p>Add to Vercel environment variables:</p>
                <pre className="bg-slate-900 text-green-400 text-xs rounded-lg p-3 overflow-x-auto">TELEGRAM_BOT_TOKEN=your_token_here</pre>
              </div>
            )
          },
          {
            step: 2,
            title: 'Get your admin chat ID',
            done: !!adminChatId,
            content: (
              <div className="text-sm text-slate-600 space-y-2">
                <p>Message your new bot on Telegram: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/help</code></p>
                <p>The bot will reply with your chat ID.</p>
                <p>Add these to Vercel environment variables:</p>
                <pre className="bg-slate-900 text-green-400 text-xs rounded-lg p-3 overflow-x-auto">{`TELEGRAM_ADMIN_CHAT_ID=your_chat_id
TELEGRAM_ADMIN_PHONE=your_10_digit_phone`}</pre>
                {adminChatId && (
                  <p className="text-green-700 font-medium text-xs">✓ Chat ID is set: {adminChatId}</p>
                )}
              </div>
            )
          },
          {
            step: 3,
            title: 'Register webhook',
            done: false,
            content: (
              <div className="text-sm text-slate-600 space-y-3">
                <p>Click the button below to tell Telegram where to send messages.</p>
                <p className="text-xs text-slate-400">This only needs to be done once after each deploy.</p>
                <Button
                  variant="primary"
                  loading={registering}
                  onClick={registerWebhook}
                  disabled={botToken !== 'configured'}>
                  Register webhook now
                </Button>
                {result && (
                  <p className={`text-xs font-medium ${result.startsWith('✓') ? 'text-green-600' : 'text-red-500'}`}>
                    {result}
                  </p>
                )}
              </div>
            )
          },
        ].map(({ step, title, done, content }) => (
          <Card key={step}>
            <div className="flex items-center gap-3 p-4 border-b border-slate-100">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${done ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                {done ? '✓' : step}
              </div>
              <p className="text-sm font-semibold text-slate-800">{title}</p>
            </div>
            <div className="p-4">{content}</div>
          </Card>
        ))}
      </div>

      {/* Example commands */}
      <Card className="mt-6">
        <div className="p-4 border-b border-slate-100">
          <p className="text-sm font-semibold text-slate-800">What you can ask the bot</p>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            ['Queries', [
              'Who missed class today?',
              'Who has pending fees?',
              "What is Priya's progress?",
              'How many enquiries this week?',
              'Upcoming RTO tests?',
              "Today's summary",
            ]],
            ['Actions', [
              "Set Priya's test to 15 May at Coimbatore RTO",
              "Mark Rahul fee paid ₹2000 cash",
              "Add lead: Suresh 9876543000 4-wheeler walk-in",
              "Update lead 9876543000 status to interested",
            ]],
          ].map(([label, examples]) => (
            <div key={label as string}>
              <p className="text-xs font-semibold text-slate-500 mb-2">{label}</p>
              <div className="space-y-1.5">
                {(examples as string[]).map(ex => (
                  <div key={ex} className="bg-slate-50 rounded-lg px-3 py-2 text-xs text-slate-600">
                    "{ex}"
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

    </div>
  )
}
