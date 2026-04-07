import { eq, and } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { students, rto_records, fees, fee_payments, leads } from '@/db/schema'

export interface BotAction {
  type: 'UPDATE_RTO' | 'RECORD_PAYMENT' | 'ADD_LEAD' | 'UPDATE_LEAD_STATUS'
  payload: any
}

export async function executeAction(action: BotAction, schoolId: string): Promise<string> {
  switch (action.type) {

    case 'UPDATE_RTO': {
      const { student_name, test_date, test_venue, ll_number, dl_number } = action.payload
      // Find student by name (fuzzy match)
      const allStudents = await db.select().from(students).where(eq(students.school_id, schoolId))
      const match = allStudents.find(s =>
        s.name.toLowerCase().includes(student_name.toLowerCase()) ||
        student_name.toLowerCase().includes(s.name.toLowerCase().split(' ')[0])
      )
      if (!match) return `Could not find student matching "${student_name}". Check the name and try again.`

      const existing = await db.select().from(rto_records).where(eq(rto_records.student_id, match.id))
      const updates: any = {}
      if (test_date)   { updates.test_date = test_date; updates.test_status = 'scheduled' }
      if (test_venue)  updates.test_venue = test_venue
      if (ll_number)   updates.ll_number = ll_number
      if (dl_number)   { updates.dl_number = dl_number; updates.test_status = 'passed' }

      if (existing.length > 0) {
        await db.update(rto_records).set(updates).where(eq(rto_records.student_id, match.id))
      } else {
        await db.insert(rto_records).values({ student_id: match.id, ...updates } as any)
      }
      const parts = []
      if (test_date)  parts.push(`test date: ${test_date}`)
      if (test_venue) parts.push(`venue: ${test_venue}`)
      if (ll_number)  parts.push(`LL: ${ll_number}`)
      if (dl_number)  parts.push(`DL: ${dl_number}`)
      return `✅ Updated RTO for ${match.name}\n${parts.join('\n')}`
    }

    case 'RECORD_PAYMENT': {
      const { student_name, amount, payment_mode = 'cash' } = action.payload
      const allStudents = await db.select().from(students).where(eq(students.school_id, schoolId))
      const match = allStudents.find(s =>
        s.name.toLowerCase().includes(student_name.toLowerCase()) ||
        student_name.toLowerCase().includes(s.name.toLowerCase().split(' ')[0])
      )
      if (!match) return `Could not find student "${student_name}".`

      const [fee] = await db.select().from(fees).where(eq(fees.student_id, match.id))
      if (!fee) return `No fee record found for ${match.name}.`

      const balance = Number(fee.total_amount) - Number(fee.paid_amount)
      if (amount > balance) return `Amount ₹${amount} exceeds balance ₹${balance} for ${match.name}.`

      // Generate receipt number
      const year = new Date().getFullYear()
      const allPayments = await db.select().from(fee_payments)
      const schoolStudents = await db.select().from(students).where(eq(students.school_id, schoolId))
      const sIds = schoolStudents.map(s => s.id)
      const schoolPayments = allPayments.filter(p => sIds.includes(p.student_id))
      const receipt_number = `RCPT-${year}-${String(schoolPayments.length + 1).padStart(4, '0')}`

      const [payment] = await db.insert(fee_payments).values({
        student_id:   match.id,
        amount:       String(amount),
        payment_mode: payment_mode as any,
        receipt_number,
        is_confirmed: true,
        admin_note:   'Recorded via Telegram bot',
      }).returning()

      // Recalc
      const allP = await db.select().from(fee_payments)
        .where(and(eq(fee_payments.student_id, match.id), eq(fee_payments.is_confirmed, true)))
      const total_paid = allP.reduce((s, p) => s + Number(p.amount), 0)
      const total = Number(fee.total_amount)
      const status = total_paid <= 0 ? 'unpaid' : total_paid >= total ? 'paid' : 'partial'
      await db.update(fees)
        .set({ paid_amount: String(total_paid), payment_status: status as any })
        .where(eq(fees.student_id, match.id))

      const newBalance = Math.max(0, total - total_paid)
      return `✅ Payment recorded for ${match.name}\nAmount: ₹${amount} (${payment_mode})\nReceipt: ${receipt_number}\nBalance remaining: ₹${newBalance}`
    }

    case 'ADD_LEAD': {
      const { name, phone, course_type = '4-wheeler', source = 'phone', notes = '' } = action.payload
      const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
      await db.insert(leads).values({
        school_id:    schoolId,
        name, phone,
        course_type:  course_type as any,
        source:       source as any,
        status:       'new' as any,
        notes,
        follow_up_at: tomorrow.toISOString().split('T')[0],
      })
      return `✅ Lead added: ${name} (${phone})\nCourse: ${course_type}\nFollow-up set for tomorrow`
    }

    case 'UPDATE_LEAD_STATUS': {
      const { phone, status } = action.payload
      const allLeads = await db.select().from(leads).where(eq(leads.school_id, schoolId))
      const match = allLeads.find(l => l.phone === phone || l.phone.includes(phone))
      if (!match) return `No lead found with phone ${phone}.`
      await db.update(leads).set({ status: status as any, updated_at: new Date() }).where(eq(leads.id, match.id))
      return `✅ Lead ${match.name} status → ${status}`
    }

    default:
      return 'Unknown action type.'
  }
}
