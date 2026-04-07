import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { fee_payments, fees, students, batches, schools } from '@/db/schema'

export async function GET(_: NextRequest, { params }: { params: { paymentId: string } }) {
  const [payment] = await db.select().from(fee_payments).where(eq(fee_payments.id, params.paymentId))
  if (!payment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const [student]  = await db.select().from(students).where(eq(students.id, payment.student_id))
  const [school]   = await db.select().from(schools).where(eq(schools.id, student.school_id))
  const [fee]      = await db.select().from(fees).where(eq(fees.student_id, student.id))
  const batch      = student.batch_id
    ? (await db.select().from(batches).where(eq(batches.id, student.batch_id)))[0]
    : null

  const paid  = Number(fee?.paid_amount ?? 0)
  const total = Number(fee?.total_amount ?? 0)
  const bal   = Math.max(0, total - paid)
  const paidAt = new Date(payment.paid_at).toLocaleString('en-IN', { dateStyle:'medium', timeStyle:'short' })

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Receipt ${payment.receipt_number}</title>
<style>
  body{font-family:Arial,sans-serif;margin:0;padding:24px;max-width:480px;color:#111}
  .head{background:#f0fdf4;border-bottom:2px solid #16a34a;padding:16px;text-align:center}
  .school-name{font-size:18px;font-weight:bold;color:#15803d}
  .school-sub{font-size:12px;color:#3b6d11;margin-top:2px}
  .rcpt-row{display:flex;justify-content:space-between;font-size:12px;color:#555;margin-top:8px}
  .body{padding:16px}
  .section{font-size:11px;font-weight:bold;color:#888;text-transform:uppercase;letter-spacing:.06em;margin:14px 0 6px}
  table{width:100%;border-collapse:collapse;font-size:13px}
  td{padding:5px 0;border-bottom:1px solid #eee}
  td:last-child{text-align:right;font-weight:500}
  .total-row td{font-weight:bold;font-size:14px;border-top:2px solid #16a34a;border-bottom:none;padding-top:8px}
  .paid-amt{color:#16a34a}
  .footer{background:#f8f8f8;border-top:1px solid #eee;padding:10px 16px;text-align:center;font-size:11px;color:#888}
  @media print{body{padding:0}}
</style>
</head><body>
<div class="head">
  <div style="width:44px;height:44px;border-radius:50%;background:#dcfce7;border:2px solid #86efac;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:bold;color:#15803d;margin:0 auto 8px">
    ${school.name.split(' ').map((w: string) => w[0]).join('').slice(0,2).toUpperCase()}
  </div>
  <div class="school-name">${school.name}</div>
  <div class="school-sub">${school.address} &nbsp;·&nbsp; ${school.phone}</div>
  <div class="rcpt-row">
    <span style="font-family:monospace;color:#15803d;font-weight:bold">${payment.receipt_number}</span>
    <span>${paidAt}</span>
  </div>
</div>
<div class="body">
  <div class="section">Student details</div>
  <table>
    <tr><td>Name</td><td>${student.name}</td></tr>
    <tr><td>Phone</td><td>+91 ${student.phone}</td></tr>
    <tr><td>Course</td><td>${student.course_type}</td></tr>
    ${batch ? `<tr><td>Batch</td><td>${batch.name}</td></tr>` : ''}
  </table>
  <div class="section">Payment details</div>
  <table>
    <tr><td>Amount paid</td><td class="paid-amt">₹${Number(payment.amount).toLocaleString('en-IN')}</td></tr>
    <tr><td>Payment mode</td><td style="text-transform:capitalize">${payment.payment_mode?.replace('_',' ')}</td></tr>
    ${payment.admin_note ? `<tr><td>Note</td><td>${payment.admin_note}</td></tr>` : ''}
    <tr><td>Total course fee</td><td>₹${total.toLocaleString('en-IN')}</td></tr>
    <tr><td>Total paid to date</td><td>₹${paid.toLocaleString('en-IN')}</td></tr>
    <tr class="total-row"><td>Balance remaining</td><td style="color:${bal > 0 ? '#d97706' : '#16a34a'}">₹${bal.toLocaleString('en-IN')}</td></tr>
  </table>
</div>
<div class="footer">Computer-generated receipt — no signature required</div>
<script>if(window.location.search.includes('print'))window.print()</script>
</body></html>`

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  })
}
