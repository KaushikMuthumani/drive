'use client'
import { useState } from 'react'
import { Badge, ProgressBar, Avatar, Card } from '@/components/ui'
import { formatDate, formatSlotTime, getDayLabel } from '@/lib/utils'

type Tab = 'home' | 'sessions' | 'rto' | 'certificate'

interface Props {
  student: any; school: any; batch: any | null; instructor: any | null
  allSessions: any[]; studentAttendance: any[]
  rtoRecord: any | null; fee: any | null
}

export default function StudentPortal({ student, school, batch, instructor, allSessions, studentAttendance, rtoRecord, fee }: Props) {
  const [tab, setTab] = useState<Tab>('home')

  const totalSessions   = batch?.total_sessions ?? 0
  const presentSessions = studentAttendance.filter(a => a.status === 'present').length
  const progress        = totalSessions > 0 ? Math.round((presentSessions / totalSessions) * 100) : 0

  const rtoStep = !rtoRecord ? 0
    : rtoRecord.dl_number ? 4
    : rtoRecord.test_status === 'passed' ? 4
    : rtoRecord.test_date ? 3
    : rtoRecord.ll_number ? 2 : 1

  const tabs: { id: Tab; label: string }[] = [
    { id:'home',        label:'Home' },
    { id:'sessions',    label:'Sessions' },
    { id:'rto',         label:'RTO' },
    { id:'certificate', label:'Certificate' },
  ]

  function getAttendance(sessionId: string) {
    return studentAttendance.find(a => a.session_id === sessionId)
  }

  return (
    <div className="min-h-screen bg-gray-50" style={{ paddingTop:'env(safe-area-inset-top, 0px)' }}>
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <div className="text-base font-bold text-gray-900">Drive<span className="text-emerald-600">India</span></div>
            <div className="text-xs text-gray-400 truncate max-w-[180px]">{school?.name}</div>
          </div>
          <div className="flex items-center gap-2">
            <Avatar name={student.name} size="sm" />
            <div>
              <p className="text-sm font-medium text-gray-800 leading-tight">{student.name}</p>
              <p className="text-xs text-gray-400">{student.course_type}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-100 sticky top-[57px] z-10">
        <div className="max-w-lg mx-auto flex">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition ${
                tab === t.id ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-gray-500'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4" style={{ paddingBottom:'max(env(safe-area-inset-bottom, 0px), 24px)' }}>

        {/* HOME */}
        {tab === 'home' && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
                <p className="text-xl font-bold text-gray-900">{presentSessions}</p>
                <p className="text-xs text-gray-400">Attended</p>
              </div>
              <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
                <p className="text-xl font-bold text-gray-900">{totalSessions - presentSessions}</p>
                <p className="text-xs text-gray-400">Remaining</p>
              </div>
              <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
                <p className="text-xl font-bold text-emerald-600">{progress}%</p>
                <p className="text-xs text-gray-400">Done</p>
              </div>
            </div>

            <Card className="p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Course progress</p>
              <ProgressBar value={presentSessions} max={totalSessions} className="mb-1.5"/>
              <p className="text-xs text-gray-400">{presentSessions} of {totalSessions} sessions attended</p>
            </Card>

            {batch && (
              <Card className="p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Your batch</p>
                <p className="text-sm font-semibold text-gray-800">{batch.name}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {formatSlotTime(batch.slot_time?.slice(0,5))} · {getDayLabel(batch.day_pref)}
                </p>
                {instructor && (
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-50">
                    <Avatar name={instructor.name} size="sm"/>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{instructor.name}</p>
                      <p className="text-xs text-gray-400">Your instructor</p>
                    </div>
                  </div>
                )}
              </Card>
            )}

            {fee && (
              <Card className="p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Fee status</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-700">Total: <span className="font-medium">₹{Number(fee.total_amount).toLocaleString('en-IN')}</span></p>
                    <p className="text-xs text-gray-400">Paid: ₹{Number(fee.paid_amount).toLocaleString('en-IN')}</p>
                  </div>
                  <Badge variant={fee.payment_status==='paid'?'green':fee.payment_status==='partial'?'amber':'red'}>
                    {fee.payment_status}
                  </Badge>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* SESSIONS */}
        {tab === 'sessions' && (
          <div className="space-y-2">
            {allSessions.length === 0 && <Card className="p-8 text-center text-gray-400">No sessions scheduled yet</Card>}
            {allSessions.map(s => {
              const att = getAttendance(s.id)
              const status = att?.status ?? 'upcoming'
              return (
                <Card key={s.id} className="p-3.5 flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                    status === 'present' ? 'bg-emerald-100 text-emerald-700'
                    : status === 'absent' ? 'bg-red-100 text-red-600'
                    : status === 'holiday' ? 'bg-amber-100 text-amber-700'
                    : 'bg-gray-100 text-gray-400'
                  }`}>{s.session_num}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">Session {s.session_num}</p>
                    <p className="text-xs text-gray-400">{formatDate(s.session_date)}</p>
                  </div>
                  <Badge variant={status==='present'?'green':status==='absent'?'red':status==='holiday'?'amber':'gray'}>
                    {status === 'upcoming' ? 'Upcoming' : status}
                  </Badge>
                </Card>
              )
            })}
          </div>
        )}

        {/* RTO */}
        {tab === 'rto' && (
          <Card className="p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">RTO progress</p>
            {["Learner's licence (LL)", 'Training sessions', 'RTO driving test', 'Permanent licence (DL)'].map((step, i) => (
              <div key={step} className="flex items-start gap-3 mb-4 last:mb-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                  rtoStep > i ? 'bg-emerald-500 text-white'
                  : rtoStep === i ? 'bg-amber-100 text-amber-700 border-2 border-amber-400'
                  : 'bg-gray-100 text-gray-400'
                }`}>{rtoStep > i ? '✓' : i + 1}</div>
                <div className="flex-1 pt-1">
                  <p className={`text-sm font-medium ${rtoStep > i ? 'text-emerald-700' : rtoStep === i ? 'text-amber-700' : 'text-gray-400'}`}>{step}</p>
                  {i === 0 && rtoRecord?.ll_number && <p className="text-xs text-gray-400 mt-0.5">LL: {rtoRecord.ll_number}{rtoRecord.ll_expiry_date ? ` · Expires ${formatDate(rtoRecord.ll_expiry_date)}` : ''}</p>}
                  {i === 2 && rtoRecord?.test_date && <p className="text-xs text-gray-400 mt-0.5">Test: {formatDate(rtoRecord.test_date)}{rtoRecord.test_venue ? ` · ${rtoRecord.test_venue}` : ''}</p>}
                  {i === 3 && rtoRecord?.dl_number && <p className="text-xs text-gray-400 mt-0.5">DL: {rtoRecord.dl_number}</p>}
                </div>
              </div>
            ))}
          </Card>
        )}

        {/* CERTIFICATE */}
        {tab === 'certificate' && (
          presentSessions >= totalSessions && totalSessions > 0 ? (
            <Card className="p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-100 border-2 border-emerald-500 flex items-center justify-center mx-auto mb-4 text-2xl text-emerald-600">✓</div>
              <p className="text-lg font-bold text-gray-900 mb-1">Course completed!</p>
              <p className="text-sm text-gray-500 mb-1">This certifies that</p>
              <p className="text-xl font-semibold text-gray-900 mb-1">{student.name}</p>
              <p className="text-sm text-gray-500 mb-4">has completed the {student.course_type} driving course at<br/><strong>{school?.name}</strong></p>
              <button className="px-6 py-3 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition active:scale-95">Download certificate</button>
            </Card>
          ) : (
            <Card className="p-8 text-center">
              <div className="text-4xl mb-3">🎓</div>
              <p className="font-semibold text-gray-700 mb-1">Not available yet</p>
              <p className="text-sm text-gray-400 mb-4">Complete all {totalSessions} sessions to get your certificate</p>
              <ProgressBar value={presentSessions} max={totalSessions} className="mb-2"/>
              <p className="text-xs text-gray-400">{presentSessions}/{totalSessions} sessions done</p>
            </Card>
          )
        )}
      </div>
    </div>
  )
}
