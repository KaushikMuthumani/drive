import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { users } from '@/db/schema'
import { buildSchoolContext } from '@/lib/bot/context'
import { executeAction, BotAction } from '@/lib/bot/actions'

// ─── Telegram helpers ──────────────────────────────────────────────────────
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? ''

async function sendMessage(chatId: number | string, text: string, replyToMessageId?: number) {
  if (!TG_TOKEN) return
  await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id:             chatId,
      text,
      parse_mode:          'HTML',
      reply_to_message_id: replyToMessageId,
    }),
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

// ─── System prompt for Claude ──────────────────────────────────────────────
function buildSystemPrompt(context: any): string {
  return `You are a helpful assistant for a driving school management system called DriveIndia.
The admin is messaging you via Telegram to get information about their school or to make changes.

Today is ${context.today}.

SCHOOL DATA SUMMARY:
- Total students: ${context.total_students}
- Active batches: ${context.active_batches}
- Sessions today: ${context.today_sessions}
- Fee summary: ${context.fee_summary.paid} paid, ${context.fee_summary.partial} partial, ${context.fee_summary.unpaid} unpaid
  Total collected: ₹${context.fee_summary.total_collected}, Pending: ₹${context.fee_summary.total_pending}
  Payments awaiting confirmation: ${context.fee_summary.pending_confirmations}
- Leads: ${context.lead_summary.new} new, ${context.lead_summary.interested} interested, ${context.lead_summary.enrolled} enrolled
  Follow-ups due today: ${context.lead_summary.follow_up_today}
- RTO: ${context.rto_summary.test_upcoming} tests upcoming, ${context.rto_summary.ll_pending} LL pending, ${context.rto_summary.dl_issued} DL issued

TODAY'S SESSIONS:
${context.today_attendance.map((s: any) =>
  `  - ${s.batch}: Session ${s.session_num}, ${s.total_students} students, ${s.marked ? `marked (${s.present?.length ?? 0} present)` : 'NOT YET MARKED'}`
).join('\n') || '  None today'}

STUDENTS (${context.students.length}):
${context.students.map((s: any) =>
  `  - ${s.name} | ${s.phone} | ${s.batch} | ${s.sessions_done}/${s.sessions_total} sessions | Fee: ${s.fee_status} (balance ₹${s.fee_balance}) | RTO: ${s.test_date ? `test ${s.test_date}` : s.ll_number ? 'LL issued' : 'LL pending'}`
).join('\n') || '  No students yet'}

INSTRUCTIONS:
1. For QUERIES: Answer directly in plain text using the data above. Be concise. Use ₹ for money amounts.
2. For ACTIONS: If the admin wants to make a change, respond with ONLY a JSON object in this format:
   {"action": "UPDATE_RTO", "payload": {"student_name": "...", "test_date": "YYYY-MM-DD", "test_venue": "..."}}
   {"action": "RECORD_PAYMENT", "payload": {"student_name": "...", "amount": 2000, "payment_mode": "cash"}}
   {"action": "ADD_LEAD", "payload": {"name": "...", "phone": "...", "course_type": "4-wheeler", "source": "phone"}}
   {"action": "UPDATE_LEAD_STATUS", "payload": {"phone": "...", "status": "enrolled"}}
3. For CONFIRMATIONS: If the admin says YES/CONFIRM to a pending action, execute it.
4. Keep answers SHORT — this is WhatsApp-style messaging.
5. Use emojis sparingly for better readability.
6. If you don't have enough info to do an action, ask for the missing detail.
7. Never make up data. Only use what's in the school data above.`
}

// ─── Pending action storage (in-memory, keyed by chatId) ───────────────────
// In production you'd store this in Redis or the DB, but in-memory is fine for
// a single-admin bot with low traffic
const pendingActions = new Map<string, { action: BotAction; description: string }>()

// ─── Main webhook handler ──────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // Always respond 200 immediately so Telegram doesn't retry
  const body = await req.json().catch(() => null)
  if (!body?.message) return NextResponse.json({ ok: true })

  const { message } = body
  const chatId    = message.chat?.id
  const text      = message.text ?? ''
  const msgId     = message.message_id

  if (!chatId || !text) return NextResponse.json({ ok: true })

  // ── Security: only the registered admin chat can use this bot ────────────
  const allowedChatId = process.env.TELEGRAM_ADMIN_CHAT_ID
  if (allowedChatId && String(chatId) !== String(allowedChatId)) {
    await sendMessage(chatId, '❌ Unauthorized. This bot is private.')
    return NextResponse.json({ ok: true })
  }

  // Handle /start command
  if (text.startsWith('/start')) {
    await sendMessage(chatId, `👋 <b>DriveIndia Bot</b>\n\nI can help you manage your driving school.\n\nAsk me anything:\n• "Who missed class today?"\n• "Which students haven't paid?"\n• "How many enquiries this week?"\n\nOr make changes:\n• "Set Priya's RTO test to 15 May at Coimbatore RTO"\n• "Mark Rahul's fee as paid ₹2000 cash"\n• "Add lead: Suresh 9876543000 4-wheeler walk-in"`)
    return NextResponse.json({ ok: true })
  }

  // Handle /help command
  if (text.startsWith('/help')) {
    await sendMessage(chatId, `<b>What I can do:</b>\n\n<b>Queries:</b>\n• "Who attended today?"\n• "Who has pending fees?"\n• "What is Priya's progress?"\n• "Upcoming RTO tests?"\n• "Today's summary"\n• "Leads this week"\n\n<b>Actions:</b>\n• "Set [name]'s test date to [date] at [venue]"\n• "Mark [name] fee paid ₹[amount] [mode]"\n• "Add lead: [name] [phone] [course]"\n\nYour chat ID: <code>${chatId}</code>\nSet this as TELEGRAM_ADMIN_CHAT_ID in your .env`)
    return NextResponse.json({ ok: true })
  }

  // Handle YES/CONFIRM for pending actions
  const normalised = text.trim().toLowerCase()
  if (normalised === 'yes' || normalised === 'confirm' || normalised === 'y') {
    const pending = pendingActions.get(String(chatId))
    if (pending) {
      pendingActions.delete(String(chatId))
      await sendTyping(chatId)
      // Get school ID for this admin
      const schoolId = await getSchoolIdForChat(chatId)
      if (!schoolId) { await sendMessage(chatId, '❌ Could not find your school.'); return NextResponse.json({ ok: true }) }
      const result = await executeAction(pending.action, schoolId)
      await sendMessage(chatId, result, msgId)
      return NextResponse.json({ ok: true })
    }
  }

  // Get school ID
  const schoolId = await getSchoolIdForChat(chatId)
  if (!schoolId) {
    await sendMessage(chatId, `❌ Your Telegram chat ID (<code>${chatId}</code>) is not linked to any school.\n\nSet TELEGRAM_ADMIN_CHAT_ID=${chatId} in your Vercel environment variables.`)
    return NextResponse.json({ ok: true })
  }

  // Show typing indicator
  await sendTyping(chatId)

  // Build context and call Claude
  const context = await buildSchoolContext(schoolId)
  const systemPrompt = buildSystemPrompt(context)

  const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system:     systemPrompt,
      messages:   [{ role: 'user', content: text }],
    }),
  })

  if (!claudeRes.ok) {
    await sendMessage(chatId, '⚠️ AI error. Try again in a moment.')
    return NextResponse.json({ ok: true })
  }

  const claudeData = await claudeRes.json()
  const reply = claudeData.content?.[0]?.text ?? ''

  // Try to parse as action JSON
  const actionMatch = reply.match(/\{"action"[\s\S]*?\}(?=\s*$|\n)/)
  if (actionMatch) {
    try {
      const parsed = JSON.parse(actionMatch[0])
      if (parsed.action && parsed.payload) {
        const action: BotAction = { type: parsed.action, payload: parsed.payload }
        // Build a human-readable description of what will happen
        const desc = buildActionDescription(action)
        pendingActions.set(String(chatId), { action, description: desc })
        await sendMessage(chatId, `${desc}\n\nReply <b>YES</b> to confirm or anything else to cancel.`, msgId)
        return NextResponse.json({ ok: true })
      }
    } catch {}
  }

  // Plain text response — send directly
  // Telegram has 4096 char limit, truncate if needed
  const finalReply = reply.length > 4000 ? reply.slice(0, 3990) + '…' : reply
  await sendMessage(chatId, finalReply, msgId)
  return NextResponse.json({ ok: true })
}

async function getSchoolIdForChat(chatId: number | string): Promise<string | null> {
  const adminPhone = process.env.TELEGRAM_ADMIN_PHONE
  if (!adminPhone) return null
  const [user] = await db.select().from(users).where(eq(users.phone, adminPhone))
  return user?.school_id ?? null
}

function buildActionDescription(action: BotAction): string {
  switch (action.type) {
    case 'UPDATE_RTO': {
      const { student_name, test_date, test_venue, ll_number, dl_number } = action.payload
      const parts = [`Student: ${student_name}`]
      if (test_date)  parts.push(`Test date: ${test_date}`)
      if (test_venue) parts.push(`Venue: ${test_venue}`)
      if (ll_number)  parts.push(`LL number: ${ll_number}`)
      if (dl_number)  parts.push(`DL number: ${dl_number}`)
      return `🗓 <b>Update RTO record?</b>\n${parts.join('\n')}`
    }
    case 'RECORD_PAYMENT': {
      const { student_name, amount, payment_mode } = action.payload
      return `💰 <b>Record payment?</b>\nStudent: ${student_name}\nAmount: ₹${amount}\nMode: ${payment_mode}`
    }
    case 'ADD_LEAD': {
      const { name, phone, course_type, source } = action.payload
      return `👤 <b>Add new lead?</b>\nName: ${name}\nPhone: ${phone}\nCourse: ${course_type}\nSource: ${source}`
    }
    case 'UPDATE_LEAD_STATUS': {
      return `📋 <b>Update lead status?</b>\nPhone: ${action.payload.phone}\nNew status: ${action.payload.status}`
    }
    default:
      return `Perform action: ${JSON.stringify(action.payload)}`
  }
}

// Vercel CRON or one-time setup: register webhook with Telegram
// Call GET /api/bot/telegram?setup=1 once after deploy
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  if (searchParams.get('setup') !== '1') return NextResponse.json({ ok: true, message: 'Bot endpoint active' })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!appUrl || !TG_TOKEN) {
    return NextResponse.json({ error: 'Set TELEGRAM_BOT_TOKEN and NEXT_PUBLIC_APP_URL in env' }, { status: 400 })
  }

  const webhookUrl = `${appUrl}/api/bot/telegram`
  const res = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: webhookUrl, allowed_updates: ['message'] }),
  })
  const data = await res.json()
  return NextResponse.json({ webhook_set: data.ok, url: webhookUrl, telegram_response: data })
}
