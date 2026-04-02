import { NextRequest, NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/lib/db/client'
import { fees, students } from '@/db/schema'
import { verifyToken } from '@/lib/auth/jwt'

const updateFeeSchema = z.object({
  total_amount: z.coerce.number().positive(),
  paid_amount: z.coerce.number().min(0),
})

export async function PATCH(req: NextRequest, { params }: { params: { studentId: string } }) {
  const token = req.cookies.get('token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const payload = await verifyToken(token)
  if (payload.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const parsed = updateFeeSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const [student] = await db.select().from(students).where(
    and(eq(students.id, params.studentId), eq(students.school_id, payload.school_id))
  )

  if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 })

  const totalAmount = Number(parsed.data.total_amount)
  const paidAmount = Number(parsed.data.paid_amount)

  if (paidAmount > totalAmount) {
    return NextResponse.json({ error: 'Paid amount cannot exceed total amount' }, { status: 400 })
  }

  const paymentStatus = paidAmount <= 0
    ? 'unpaid'
    : paidAmount >= totalAmount
      ? 'paid'
      : 'partial'

  const [updated] = await db.update(fees)
    .set({
      total_amount: totalAmount.toFixed(2),
      paid_amount: paidAmount.toFixed(2),
      payment_status: paymentStatus as any,
      paid_at: paidAmount > 0 ? new Date() : null,
    })
    .where(eq(fees.student_id, params.studentId))
    .returning()

  if (!updated) return NextResponse.json({ error: 'Fee record not found' }, { status: 404 })

  return NextResponse.json({ data: updated })
}
