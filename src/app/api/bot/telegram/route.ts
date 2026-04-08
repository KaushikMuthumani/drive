import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { school_settings } from '@/db/schema'
import { buildSchoolContext } from '@/lib/bot/context'
import { executeAction, BotAction } from '@/lib/bot/actions'

const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? ''
const BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME ?? 'DriveIndiaBot'
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? ''

// ── Telegram API helpers ───────────────────────────────────────────────────
async function sendMessage(chatId: number | string, text: string, extra?: object) {
  if (!TG_TOKEN) return
  await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', ...extra }),
  })
}

async function sendTyping(chatId: number | string) {
  if (!TG_TOKEN) return
  await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendChatAction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, action: 'typing' }),
  })
}

// ── In-memory pending actions (per chat) ──────────────────────────────────
const pendingActions = new Map<string, { action: BotAction; description: string }>()

// ── Claude system prompt ──────────────────────────────────────────────────
function buildSystemPrompt(context: any): string {
  return `You are a helpful assistant for a driving school management system called DriveIndia.
The admin is messaging you via Telegram. Today is ${context.today}.

SCHOOL DATA:
- Total students: ${context.total_students}, Active batches: ${context.active_batches}
- Sessions today: ${context.today_sessions}
- Fees: ${context.fee_summary.paid} paid, ${context.fee_summary.partial} partial, ${context.fee_summary.unpaid} unpaid | Collected: ₹${context.fee_summary.total_collected} | Pending: ₹${context.fee_summary.total_pending}
- Payments awaiting confirmation: ${context.fee_summary.pending_confirmations}
- Leads: ${context.lead_summary.new} new, ${context.lead_summary.interested} interested, ${context.lead_summary.enrolled} enrolled | Follow-ups today: ${context.lead_summary.follow_up_today}
- RTO: ${context.rto_summary.test_upcoming} tests upcoming, ${context.rto_summary.ll_pending} LL pending

TODAY'S SESSIONS:
${context.today_attendance.map((s: any) => `  - ${s.batch}: Session ${s.session_num}, ${s.total_students} students, ${s.marked ? `MARKED (${s.present?.length ?? 0} present)` : 'NOT YET MARKED'}`).join('\n') || '  None today'}

STUDENTS (${context.students.length}):
${context.students.map((s: any) => `  - ${s.name} | ${s.phone} | ${s.batch} | ${s.sessions_done}/${s.sessions_total} sessions | Fee: ${s.fee_status} (balance ₹${s.fee_balance}) | RTO: ${s.test_date ? `test ${s.test_date}` : s.ll_number ? 'LL issued' : 'LL pending'}`).join('\n') || '  No students yet'}

RULES:
1. QUERIES → answer directly, short, plain text, use ₹ for money
2. ACTIONS → respond with ONLY a JSON block:
   {"action": "UPDATE_RTO", "payload": {"student_name": "...", "test_date": "YYYY-MM-DD", "test_venue": "..."}}
   {"action": "RECORD_PAYMENT", "payload": {"student_name": "...", "amount": 2000, "payment_mode": "cash"}}
   {"action": "ADD_LEAD", "payload": {"name": "...", "phone": "...", "course_type": "4-wheeler", "source": "phone"}}
   {"action": "UPDATE_LEAD_STATUS", "payload": {"phone": "...", "status": "enrolled"}}
3. If admin says YES/CONFIRM/y → execute pending action
4. Be SHORT. This is a chat interface.
5. Never make up data. Only use what is given above.`
}

// ── Webhook handler ────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body?.message) return NextResponse.json({ ok: true })

  const { message } = body
  const chatId = String(message.chat?.id ?? '')
  const text   = (message.text ?? '').trim()
  const msgId  = message.message_id

  if (!chatId || !text) return NextResponse.json({ ok: true })

  // ── /link CODE — pair this Telegram chat to a school ────────────────────
  if (text.startsWith('/link ') || text.startsWith('/link')) {
    const code = text.replace('/link', '').trim()
    if (!code || code.length !== 6) {
      await sendMessage(chatId, '❌ Send <code>/link</code> followed by your 6-digit code.\nExample: <code>/link 482917</code>')
      return NextResponse.json({ ok: true })
    }
    const allSettings = await db.select().from(school_settings)
      .where(eq(school_settings.telegram_verify_code as any, code))
    if (allSettings.length === 0) {
      await sendMessage(chatId, '❌ Invalid code. Go to <b>Admin → Telegram bot</b> and generate a new code.')
      return NextResponse.json({ ok: true })
    }
    const settings = allSettings[0]
    await db.update(school_settings)
      .set({ telegram_chat_id: chatId, telegram_verify_code: null as any, updated_at: new Date() })
      .where(eq(school_settings.id, settings.id))
    await sendMessage(chatId,
      `✅ <b>Account linked!</b>\n\nYour DriveIndia school is now connected.\n\nTry asking:\n• "Who has pending fees?"\n• "Today's summary"\n• "Who missed class today?"`)
    return NextResponse.json({ ok: true })
  }

  // ── /start — welcome ────────────────────────────────────────────────────
  if (text.startsWith('/start')) {
    // Check if already linked
    const linked = await getSchoolIdForChat(chatId)
    if (linked) {
      await sendMessage(chatId, `👋 <b>Welcome back!</b>\n\nYou're already connected to your school.\n\nAsk me anything about your students, fees, or attendance.`)
    } else {
      await sendMessage(chatId,
        `👋 <b>Welcome to DriveIndia Bot!</b>\n\nTo connect your school:\n1. Go to your DriveIndia dashboard\n2. Click <b>Telegram bot</b> in the menu\n3. Generate a pairing code\n4. Send <code>/link YOUR_CODE</code> here\n\nExample: <code>/link 482917</code>`)
    }
    return NextResponse.json({ ok: true })
  }

  // ── /help ────────────────────────────────────────────────────────────────
  if (text.startsWith('/help')) {
    await sendMessage(chatId,
      `<b>DriveIndia Bot — Commands</b>\n\n<b>Queries:</b>\n• Who missed class today?\n• Who has pending fees?\n• What is [name]'s progress?\n• Upcoming RTO tests?\n• Today's summary\n• How many new enquiries?\n\n<b>Actions:</b>\n• Set [name]'s test to [date] at [venue]\n• Mark [name] fee paid ₹[amount] cash\n• Add lead: [name] [phone] [course]\n\nNot linked? Send <code>/start</code> for setup instructions.`)
    return NextResponse.json({ ok: true })
  }

  // ── Get school from chat ID ───────────────────────────────────────────────
  const schoolId = await getSchoolIdForChat(chatId)
  if (!schoolId) {
    await sendMessage(chatId,
      `❌ Your account is not connected.\n\nGo to <b>Admin → Telegram bot</b>, generate a pairing code, then send:\n<code>/link YOUR_CODE</code>`)
    return NextResponse.json({ ok: true })
  }

  if (!ANTHROPIC_API_KEY) {
    await sendMessage(chatId,
      '⚠️ AI unavailable until you set the ANTHROPIC_API_KEY environment variable with your Claude API key.')
    return NextResponse.json({ ok: true })
  }

  // ── Handle YES/CONFIRM for pending actions ────────────────────────────────
  const norm = text.toLowerCase()
  if (norm === 'yes' || norm === 'y' || norm === 'confirm') {
    const pending = pendingActions.get(chatId)
    if (pending) {
      pendingActions.delete(chatId)
      await sendTyping(chatId)
      const result = await executeAction(pending.action, schoolId)
      await sendMessage(chatId, result)
      return NextResponse.json({ ok: true })
    }
  }

  // ── Cancel pending action ─────────────────────────────────────────────────
  if (norm === 'no' || norm === 'cancel') {
    if (pendingActions.has(chatId)) {
      pendingActions.delete(chatId)
      await sendMessage(chatId, '↩️ Action cancelled.')
      return NextResponse.json({ ok: true })
    }
  }

  // ── Show typing and call Claude ───────────────────────────────────────────
  await sendTyping(chatId)
  const context = await buildSchoolContext(schoolId)
  const systemPrompt = buildSystemPrompt(context)

  const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
      'Authorization': `Bearer ${ANTHROPIC_API_KEY}`,
    },
    body: JSON.stringify({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system:     systemPrompt,
      messages:   [{ role: 'user', content: text }],
    }),
  })

  if (!claudeRes.ok) {
    await sendMessage(chatId, '⚠️ AI unavailable. Try again in a moment.')
    return NextResponse.json({ ok: true })
  }

  const claudeData = await claudeRes.json()
  const reply = claudeData.content?.[0]?.text ?? ''

  // Try to parse as action
  const actionMatch = reply.match(/\{"action"[\s\S]*?\}/)
  if (actionMatch) {
    try {
      const parsed = JSON.parse(actionMatch[0])
      if (parsed.action && parsed.payload) {
        const action: BotAction = { type: parsed.action, payload: parsed.payload }
        const desc = buildActionDescription(action)
        pendingActions.set(chatId, { action, description: desc })
        await sendMessage(chatId, `${desc}\n\nReply <b>YES</b> to confirm or <b>NO</b> to cancel.`)
        return NextResponse.json({ ok: true })
      }
    } catch {}
  }

  // Send plain reply (truncate to Telegram's 4096 limit)
  await sendMessage(chatId, reply.length > 4000 ? reply.slice(0, 3990) + '…' : reply)
  return NextResponse.json({ ok: true })
}

async function getSchoolIdForChat(chatId: string): Promise<string | null> {
  const allSettings = await db.select().from(school_settings)
    .where(eq(school_settings.telegram_chat_id as any, chatId))
  return allSettings[0]?.school_id ?? null
}

function buildActionDescription(action: BotAction): string {
  const p = action.payload
  switch (action.type) {
    case 'UPDATE_RTO': {
      const parts = [`Student: ${p.student_name}`]
      if (p.test_date)  parts.push(`Test date: ${p.test_date}`)
      if (p.test_venue) parts.push(`Venue: ${p.test_venue}`)
      if (p.ll_number)  parts.push(`LL: ${p.ll_number}`)
      if (p.dl_number)  parts.push(`DL: ${p.dl_number}`)
      return `🗓 <b>Update RTO?</b>\n${parts.join('\n')}`
    }
    case 'RECORD_PAYMENT':
      return `💰 <b>Record payment?</b>\nStudent: ${p.student_name}\nAmount: ₹${p.amount}\nMode: ${p.payment_mode}`
    case 'ADD_LEAD':
      return `👤 <b>Add lead?</b>\nName: ${p.name}\nPhone: ${p.phone}\nCourse: ${p.course_type}`
    case 'UPDATE_LEAD_STATUS':
      return `📋 <b>Update lead status?</b>\nPhone: ${p.phone}\nStatus: ${p.status}`
    default:
      return `Action: ${JSON.stringify(p)}`
  }
}

// ── GET: register webhook with Telegram ────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  if (searchParams.get('setup') !== '1') {
    return NextResponse.json({ ok: true, message: 'Bot webhook endpoint active' })
  }
  if (!TG_TOKEN) {
    return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN not set in env' }, { status: 400 })
  }
  const origin = searchParams.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? ''
  if (!origin.startsWith('https://')) {
    return NextResponse.json({ error: 'Telegram requires an HTTPS URL. Use your Vercel deployment URL.' }, { status: 400 })
  }
  const webhookUrl = `${origin}/api/bot/telegram`
  const res  = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: webhookUrl, allowed_updates: ['message'] }),
  })
  const data = await res.json()
  return NextResponse.json({ webhook_set: data.ok, url: webhookUrl, telegram_response: data })
}
