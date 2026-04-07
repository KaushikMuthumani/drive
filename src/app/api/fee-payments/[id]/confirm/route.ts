import { NextRequest, NextResponse } from 'next/server'
import { eq, and } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { fee_payments, fees } from '@/db/schema'
import { verifyToken } from '@/lib/auth/jwt'

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

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const token = req.cookies.get('token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyToken(token)
  if (payload.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const [payment] = await db.update(fee_payments)
    .set({ is_confirmed: true, confirmed_by: payload.sub, admin_note: body.admin_note })
    .where(eq(fee_payments.id, params.id))
    .returning()

  if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
  await recalcFee(payment.student_id)

  return NextResponse.json({ data: payment })
}
