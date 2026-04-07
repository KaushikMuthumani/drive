import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { eq, and, sql } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { fee_payments, fees, students } from '@/db/schema'
import { verifyToken } from '@/lib/auth/jwt'

const schema = z.object({
  student_id:   z.string().uuid(),
  amount:       z.number().positive(),
  payment_mode: z.enum(['upi', 'cash', 'card', 'bank_transfer']).default('upi'),
  admin_note:   z.string().optional(),
})

async function generateReceiptNumber(schoolId: string): Promise<string> {
  const year = new Date().getFullYear()
  // Count receipts for THIS school's students only
  const schoolStudents = await db.select({ id: students.id })
    .from(students).where(eq(students.school_id, schoolId))
  const ids = schoolStudents.map(s => s.id)
  if (ids.length === 0) return `RCPT-${year}-0001`
  const allPayments = await db.select().from(fee_payments)
  const schoolPayments = allPayments.filter(p => ids.includes(p.student_id))
  const count = schoolPayments.length + 1
  return `RCPT-${year}-${String(count).padStart(4, '0')}`
}

async function recalcFee(studentId: string) {
  const payments = await db.select().from(fee_payments)
    .where(and(eq(fee_payments.student_id, studentId), eq(fee_payments.is_confirmed, true)))
  const total_paid = payments.reduce((s, p) => s + Number(p.amount), 0)
  const [fee] = await db.select().from(fees).where(eq(fees.student_id, studentId))
  if (!fee) return
  const total = Number(fee.total_amount)
  const status = total_paid <= 0 ? 'unpaid' : total_paid >= total ? 'paid' : 'partial'
  await db.update(fees)
    .set({ paid_amount: String(total_paid), payment_status: status as any })
    .where(eq(fees.student_id, studentId))
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const token = req.cookies.get('token')?.value
  let isAdmin = false
  let adminId: string | undefined
  if (token) {
    const p = await verifyToken(token).catch(() => null)
    if (p?.role === 'admin') { isAdmin = true; adminId = p.sub }
  }

  const [student] = await db.select().from(students).where(eq(students.id, parsed.data.student_id))
  if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 })

  const receipt_number = await generateReceiptNumber(student.school_id)
  const is_confirmed = isAdmin && parsed.data.payment_mode !== 'upi'

  const [payment] = await db.insert(fee_payments).values({
    student_id:     parsed.data.student_id,
    amount:         String(parsed.data.amount),
    payment_mode:   parsed.data.payment_mode as any,
    receipt_number,
    admin_note:     parsed.data.admin_note,
    confirmed_by:   is_confirmed ? adminId : null,
    is_confirmed,
  }).returning()

  if (is_confirmed) await recalcFee(parsed.data.student_id)
  return NextResponse.json({ data: payment, receipt_number }, { status: 201 })
}
