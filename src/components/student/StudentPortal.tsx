'use client'
import { useState } from 'react'
import { Badge, ProgressBar, Avatar, Card } from '@/components/ui'
import { formatDate, formatSlotTime, getDayLabel, formatINR } from '@/lib/utils'
import { toast } from 'sonner'

type Tab = 'home' | 'sessions' | 'fee' | 'rto'

interface Props {
  student: any; school: any; batch: any; instructor: any
  allSessions: any[]; studentAttendance: any[]
  rtoRecord: any; fee: any; paymentHistory: any[]; upiSettings: any
}

export default function StudentPortal({
  student, school, batch, instructor, allSessions, studentAttendance,
  rtoRecord, fee, paymentHistory, upiSettings
}: Props) {
  const [tab, setTab]           = useState<Tab>('home')
  const [payAmount, setPayAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [payments, setPayments] = useState(paymentHistory)

  const today            = new Date().toISOString().split('T')[0]
  const totalSessions    = batch?.total_sessions ?? 0
  const presentSessions  = studentAttendance.filter(a => a.status === 'present').length
  const progress         = totalSessions > 0 ? Math.round((presentSessions / totalSessions) * 100) : 0
  const totalFee         = Number(fee?.total_amount ?? 0)
  const paidFee          = Number(fee?.paid_amount ?? 0)
  const balanceFee       = Math.max(0, totalFee - paidFee)

  // Next upcoming session
  const nextSession = allSessions
    .filter(s => s.session_date >= today && !studentAttendance.some(a => a.session_id === s.id))
    .sort((a, b) => a.session_date.localeCompare(b.session_date))[0] ?? null

  const rtoStep = !rtoRecord ? 0
    : rtoRecord.dl_number ? 4
    : rtoRecord.test_status === 'passed' ? 4
    : rtoRecord.test_date ? 3
    : rtoRecord.ll_number ? 2 : 1

  function getAttStatus(sessionId: string) {
    return studentAttendance.find(a => a.session_id === sessionId)?.status
  }

  async function submitPayment() {
    const amount = Number(payAmount)
    if (!amount || amount <= 0 || amount > balanceFee) {
      toast.error(`Enter amount between ₹1 and ${formatINR(balanceFee)}`); return
    }
    setSubmitting(true)
    const res = await fetch('/api/fee-payments', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_id: student.id, amount, payment_mode: 'upi' }),
    })
    const data = await res.json()
    setSubmitting(false)
    if (!res.ok) { toast.error('Failed to submit'); return }
    setPayments(p => [...p, data.data])
    setPayAmount('')
    toast.success('Payment submitted! Your school will confirm shortly.')
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'home', label: 'Home' }, { id: 'sessions', label: 'Sessions' },
    { id: 'fee', label: 'Fee' },   { id: 'rto', label: 'RTO' },
  ]

  return (
    <div className="min-h-screen bg-slate-50" style={{ paddingTop: 'env(safe-area-inset-top,0px)' }}>
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-slate-900">Drive<span className="text-green-600">India</span></div>
            <div className="text-xs text-slate-400 truncate max-w-[180px]">{school?.name}</div>
          </div>
          <div className="flex items-center gap-2">
            <Avatar name={student.name} size="sm" />
            <div>
              <p className="text-sm font-medium text-slate-800 leading-tight">{student.name}</p>
              <p className="text-xs text-slate-400">{student.course_type}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200 sticky top-[57px] z-10">
        <div className="max-w-lg mx-auto flex overflow-x-auto">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-shrink-0 px-5 py-3 text-sm font-medium border-b-2 transition ${tab === t.id ? 'border-green-500 text-green-600' : 'border-transparent text-slate-400'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 pb-10">

        {/* ── HOME ──────────────────────────────────────────── */}
        {tab === 'home' && (
          <div className="space-y-3">
            {/* Next session highlight */}
            {nextSession && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                  #{nextSession.session_num}
                </div>
                <div>
                  <p className="text-xs text-green-700 font-medium">Next session</p>
                  <p className="text-sm font-semibold text-green-900">{formatDate(nextSession.session_date)}</p>
                  {batch && (
                    <p className="text-xs text-green-700 mt-0.5">{formatSlotTime(batch.slot_time?.slice(0, 5))} · {getDayLabel(batch.day_pref)}</p>
                  )}
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Done', value: presentSessions, color: 'text-slate-900' },
                { label: 'Left', value: totalSessions - presentSessions, color: 'text-slate-900' },
                { label: 'Progress', value: `${progress}%`, color: 'text-green-600' },
              ].map(s => (
                <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-3 text-center">
                  <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            <Card className="p-4">
              <p className="text-xs text-slate-400 mb-2">Course progress</p>
              <ProgressBar value={presentSessions} max={totalSessions} />
              <p className="text-xs text-slate-400 mt-1.5">{presentSessions} of {totalSessions} sessions attended</p>
            </Card>

            {instructor && (
              <Card className="p-4 flex items-center gap-3">
                <Avatar name={instructor.name} />
                <div>
                  <p className="text-xs text-slate-400">Instructor</p>
                  <p className="text-sm font-semibold text-slate-800">{instructor.name}</p>
                </div>
              </Card>
            )}

            {fee && (
              <Card className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-slate-400">Fee status</p>
                  <Badge variant={fee.payment_status === 'paid' ? 'green' : fee.payment_status === 'partial' ? 'amber' : 'red'}>
                    {fee.payment_status}
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Paid: <span className="font-medium text-green-600">{formatINR(paidFee)}</span></span>
                  <span className="text-slate-600">Balance: <span className="font-medium text-amber-600">{formatINR(balanceFee)}</span></span>
                </div>
                {balanceFee > 0 && (
                  <button onClick={() => setTab('fee')} className="mt-2 text-xs text-green-600 font-medium hover:underline">
                    Pay now →
                  </button>
                )}
              </Card>
            )}
          </div>
        )}

        {/* ── SESSIONS ──────────────────────────────────────── */}
        {tab === 'sessions' && (
          <div className="space-y-2">
            {allSessions.length === 0 && (
              <Card className="p-8 text-center text-slate-400">No sessions scheduled yet</Card>
            )}
            {allSessions.map(sess => {
              const status = getAttStatus(sess.id)
              const isUpcoming = sess.session_date > today
              return (
                <Card key={sess.id} className="p-3 flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold flex-shrink-0 ${
                    status === 'present' ? 'bg-green-100 text-green-700'
                    : status === 'absent' ? 'bg-red-100 text-red-600'
                    : status === 'holiday' ? 'bg-amber-100 text-amber-700'
                    : 'bg-slate-100 text-slate-400'
                  }`}>{sess.session_num}</div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-800">Session {sess.session_num}</p>
                    <p className="text-xs text-slate-400">{formatDate(sess.session_date)}</p>
                  </div>
                  {status
                    ? <Badge variant={status === 'present' ? 'green' : status === 'absent' ? 'red' : 'amber'}>{status}</Badge>
                    : <Badge variant={sess.session_date === today ? 'amber' : 'gray'}>{sess.session_date === today ? 'Today' : 'Upcoming'}</Badge>
                  }
                </Card>
              )
            })}
          </div>
        )}

        {/* ── FEE ───────────────────────────────────────────── */}
        {tab === 'fee' && (
          <div className="space-y-3">
            {fee ? (
              <>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Total', value: formatINR(totalFee), color: 'text-slate-900' },
                    { label: 'Paid', value: formatINR(paidFee), color: 'text-green-600' },
                    { label: 'Balance', value: formatINR(balanceFee), color: balanceFee > 0 ? 'text-amber-600' : 'text-green-600' },
                  ].map(s => (
                    <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-3 text-center">
                      <p className={`text-base font-bold ${s.color}`}>{s.value}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>
                <ProgressBar value={paidFee} max={totalFee} />

                {balanceFee > 0 && upiSettings?.upi_id && (
                  <Card className="p-4">
                    <p className="text-sm font-semibold text-slate-800 mb-3">Pay via UPI</p>
                    {upiSettings.upi_qr_url && (
                      <div className="text-center mb-3">
                        <img src={upiSettings.upi_qr_url} alt="UPI QR"
                          className="w-36 h-36 object-contain mx-auto border border-slate-200 rounded-xl" />
                      </div>
                    )}
                    <div className="bg-slate-50 rounded-xl p-3 text-center mb-4">
                      <p className="text-xs text-slate-400 mb-1">UPI ID</p>
                      <p className="font-mono font-semibold text-slate-800 text-sm">{upiSettings.upi_id}</p>
                      <button onClick={() => { navigator.clipboard.writeText(upiSettings.upi_id); toast.success('Copied!') }}
                        className="text-xs text-green-600 hover:underline mt-1">Copy UPI ID</button>
                    </div>
                    <p className="text-xs text-slate-500 mb-3">After paying on GPay / PhonePe, enter the amount below:</p>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-slate-400 font-medium">₹</span>
                      <input type="number" value={payAmount}
                        onChange={e => setPayAmount(e.target.value)}
                        placeholder={`Max ₹${balanceFee}`} max={balanceFee} min={1}
                        className="flex-1 border border-slate-200 rounded-lg px-3 py-2.5 text-base font-semibold focus:outline-none focus:border-green-500" />
                    </div>
                    <div className="flex gap-2 mb-3">
                      {[500, 1000, balanceFee]
                        .filter((v, i, a) => a.indexOf(v) === i && v > 0)
                        .map(v => (
                          <button key={v} onClick={() => setPayAmount(String(v))}
                            className={`flex-1 text-xs font-medium py-2 rounded-lg border transition ${
                              v === balanceFee ? 'bg-green-50 text-green-700 border-green-200' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}>
                            {v === balanceFee ? 'Pay full' : formatINR(v)}
                          </button>
                        ))}
                    </div>
                    <button onClick={submitPayment} disabled={submitting || !payAmount}
                      className="w-full bg-green-600 text-white font-semibold py-3 rounded-xl text-sm hover:bg-green-700 transition disabled:opacity-40 flex items-center justify-center gap-2">
                      {submitting
                        ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Submitting…</>
                        : "I've paid via UPI ✓"}
                    </button>
                    <p className="text-xs text-slate-400 text-center mt-2">Your school will confirm and receipt will appear here</p>
                  </Card>
                )}

                {balanceFee <= 0 && (
                  <Card className="p-6 text-center">
                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3 text-xl">✓</div>
                    <p className="font-semibold text-green-700">All fees paid!</p>
                  </Card>
                )}

                {payments.length > 0 && (
                  <Card>
                    <div className="p-3 border-b border-slate-100">
                      <p className="text-sm font-semibold text-slate-700">Payment history</p>
                    </div>
                    {payments.map((p: any) => (
                      <div key={p.id} className="flex items-center gap-3 px-4 py-3 border-b border-slate-50 last:border-0">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-800">{formatINR(Number(p.amount))}</p>
                          <p className="text-xs text-slate-400">{formatDate(p.paid_at)} · {p.payment_mode}</p>
                        </div>
                        <Badge variant={p.is_confirmed ? 'green' : 'amber'}>
                          {p.is_confirmed ? 'Confirmed' : 'Pending'}
                        </Badge>
                        {p.is_confirmed && (
                          <a href={`/api/receipts/${p.id}`} target="_blank" rel="noreferrer"
                            className="text-xs text-green-600 hover:underline">Receipt</a>
                        )}
                      </div>
                    ))}
                  </Card>
                )}
              </>
            ) : (
              <Card className="p-8 text-center text-slate-400">No fee record found</Card>
            )}
          </div>
        )}

        {/* ── RTO ───────────────────────────────────────────── */}
        {tab === 'rto' && (
          <div className="space-y-3">
            <Card className="p-4">
              <p className="text-sm font-semibold text-slate-800 mb-4">Licence progress</p>
              {['Learner\'s licence (LL)', 'Training sessions', 'RTO driving test', 'Permanent licence (DL)'].map((step, i) => {
                const done = rtoStep > i
                const now  = rtoStep === i
                return (
                  <div key={step} className="flex items-start gap-3 mb-4 last:mb-0">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      done ? 'bg-green-500 text-white' : now ? 'bg-amber-100 text-amber-700 border border-amber-400' : 'bg-slate-100 text-slate-400'
                    }`}>{done ? '✓' : i + 1}</div>
                    <div className="flex-1 pt-0.5">
                      <p className={`text-sm font-medium ${done ? 'text-green-700' : now ? 'text-amber-700' : 'text-slate-400'}`}>{step}</p>
                      {i === 0 && rtoRecord?.ll_number && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          LL: {rtoRecord.ll_number}
                          {rtoRecord.ll_expiry_date && ` · Expires ${rtoRecord.ll_expiry_date}`}
                        </p>
                      )}
                      {i === 2 && rtoRecord?.test_date && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          Test: {rtoRecord.test_date}
                          {rtoRecord.test_venue && ` · ${rtoRecord.test_venue}`}
                        </p>
                      )}
                      {i === 3 && rtoRecord?.dl_number && (
                        <p className="text-xs text-slate-500 mt-0.5">DL: {rtoRecord.dl_number}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
