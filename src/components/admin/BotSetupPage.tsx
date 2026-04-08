'use client'
import { useState, useEffect } from 'react'
import { Card, Button } from '@/components/ui'
import PageHeader from '@/components/shared/PageHeader'
import { toast } from 'sonner'

interface Props {
  verifyCode: string | null      // 6-digit code from DB
  telegramLinked: boolean        // whether chat_id is already saved
  botUsername: string            // e.g. "DriveIndiaBot"
}

export default function BotSetupPage({ verifyCode, telegramLinked, botUsername }: Props) {
  const [code, setCode]         = useState(verifyCode)
  const [linked, setLinked]     = useState(telegramLinked)
  const [generating, setGen]    = useState(false)
  const [checking, setChecking] = useState(false)

  // Poll every 4 seconds to check if user has linked
  useEffect(() => {
    if (linked) return
    const interval = setInterval(async () => {
      const res = await fetch('/api/bot/status')
      const data = await res.json()
      if (data.linked) {
        setLinked(true)
        clearInterval(interval)
        toast.success('Telegram linked! You can now message the bot.')
      }
    }, 4000)
    return () => clearInterval(interval)
  }, [linked])

  async function generateCode() {
    setGen(true)
    const res = await fetch('/api/bot/generate-code', { method: 'POST' })
    const data = await res.json()
    setGen(false)
    if (data.code) {
      setCode(data.code)
      setLinked(false)
      toast.success('New pairing code generated')
    } else {
      toast.error('Failed to generate code')
    }
  }

  async function unlink() {
    const res = await fetch('/api/bot/unlink', { method: 'POST' })
    if (res.ok) {
      setLinked(false)
      setCode(null)
      toast.success('Bot unlinked')
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-lg">
      <PageHeader title="Telegram bot" subtitle="Get instant answers about your school — right in Telegram" />

      {linked ? (
        /* ── LINKED STATE ─────────────────────────────────────────── */
        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-xl">✓</div>
              <div>
                <p className="font-semibold text-slate-800">Telegram connected</p>
                <p className="text-xs text-slate-400">Message <strong>@{botUsername}</strong> anytime</p>
              </div>
            </div>
            <button onClick={unlink} className="text-xs text-red-500 hover:underline">Unlink Telegram</button>
          </Card>

          <Card>
            <div className="p-4 border-b border-slate-100">
              <p className="text-sm font-semibold text-slate-800">What you can ask</p>
            </div>
            <div className="p-4 grid grid-cols-1 gap-4">
              {[
                ['Queries', [
                  'Who missed class today?',
                  'Who has pending fees?',
                  "What is Priya's progress?",
                  'Upcoming RTO tests?',
                  "Today's summary",
                  'How many new enquiries?',
                ]],
                ['Actions', [
                  "Set Priya's test to 15 May at Coimbatore RTO",
                  'Mark Rahul fee paid ₹2000 cash',
                  'Add lead: Suresh 9876543000 4-wheeler',
                ]],
              ].map(([label, examples]) => (
                <div key={label as string}>
                  <p className="text-xs font-semibold text-slate-500 mb-2">{label}</p>
                  <div className="space-y-1.5">
                    {(examples as string[]).map(ex => (
                      <div key={ex} className="bg-slate-50 rounded-lg px-3 py-2 text-xs text-slate-600">"{ex}"</div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      ) : (
        /* ── SETUP STATE ──────────────────────────────────────────── */
        <div className="space-y-4">
          {/* How it works */}
          <Card className="p-4 bg-blue-50 border-blue-200">
            <p className="text-sm font-semibold text-blue-800 mb-1">How it works</p>
            <p className="text-xs text-blue-700">
              You get a pairing code. Open Telegram, message our bot with your code, and your account is linked.
            </p>
          </Card>

          {/* Step 1: Get code */}
          <Card>
            <div className="flex items-center gap-3 p-4 border-b border-slate-100">
              <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">1</div>
              <p className="text-sm font-semibold text-slate-800">Get your pairing code</p>
            </div>
            <div className="p-4">
              {code ? (
                <div className="space-y-3">
                  <div className="bg-slate-900 rounded-xl px-6 py-4 text-center">
                    <p className="text-3xl font-bold tracking-[0.3em] text-green-400 font-mono">{code}</p>
                    <p className="text-xs text-slate-400 mt-1">Your pairing code</p>
                  </div>
                  <button onClick={generateCode} disabled={generating}
                    className="text-xs text-slate-400 hover:text-slate-600 hover:underline w-full text-center">
                    {generating ? 'Generating…' : 'Generate new code'}
                  </button>
                </div>
              ) : (
                <Button variant="primary" loading={generating} onClick={generateCode} className="w-full justify-center">
                  Generate pairing code
                </Button>
              )}
            </div>
          </Card>

          {/* Step 2: Open Telegram */}
          <Card>
            <div className="flex items-center gap-3 p-4 border-b border-slate-100">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${code ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-400'}`}>2</div>
              <p className="text-sm font-semibold text-slate-800">Open Telegram and message the bot</p>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-sm text-slate-600">
                Search for <strong>@{botUsername}</strong> on Telegram and send this message:
              </p>
              {code && (
                <div className="bg-slate-100 rounded-lg px-4 py-3 flex items-center justify-between gap-3">
                  <code className="text-sm font-mono text-slate-800">/link {code}</code>
                  <button
                    onClick={() => { navigator.clipboard.writeText(`/link ${code}`); toast.success('Copied!') }}
                    className="text-xs text-green-600 hover:underline flex-shrink-0"
                  >Copy</button>
                </div>
              )}
              {!code && <p className="text-xs text-slate-400">Generate your code first (step 1)</p>}
              <a
                href={`https://t.me/${botUsername}`}
                target="_blank"
                rel="noreferrer"
                className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold transition ${code ? 'bg-[#2AABEE] text-white hover:bg-[#229ED9]' : 'bg-slate-100 text-slate-400 pointer-events-none'}`}
              >
                Open Telegram bot →
              </a>
            </div>
          </Card>

          {/* Step 3: Waiting */}
          <Card>
            <div className="flex items-center gap-3 p-4 border-b border-slate-100">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 bg-slate-100 text-slate-400`}>3</div>
              <p className="text-sm font-semibold text-slate-800">Waiting for confirmation</p>
            </div>
            <div className="p-4 flex items-center gap-3 text-sm text-slate-500">
              <span className="w-4 h-4 border-2 border-slate-300 border-t-green-500 rounded-full animate-spin flex-shrink-0" />
              Checking for Telegram connection…
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
