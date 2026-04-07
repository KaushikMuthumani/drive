'use client'
import { useState } from 'react'
import { Button, Badge, Avatar, Input, Select, Modal, Card, ProgressBar, Empty } from '@/components/ui'
import PageHeader from '@/components/shared/PageHeader'
import { formatDate, formatINR, formatSlotTime, getDayLabel } from '@/lib/utils'
import { COURSE_SESSIONS, TIME_SLOTS } from '@/lib/course/config'
import { toast } from 'sonner'

interface Props { students: any[]; batches: any[]; attendance: any[]; fees: any[]; rto: any[]; schoolId: string }

const statusV: Record<string,'green'|'blue'|'amber'|'gray'|'red'> = {
  active:'green', completed:'blue', enrolled:'blue', on_hold:'amber', dropped:'gray'
}
const feeV: Record<string,'green'|'amber'|'red'> = { paid:'green', partial:'amber', unpaid:'red' }

export default function StudentsPage({ students: initial, batches, attendance, fees, rto, schoolId }: Props) {
  const [students, setStudents] = useState(initial)
  const [search, setSearch]     = useState('')
  const [tab, setTab]           = useState<'all'|'active'|'fee'|'rto'>('all')
  const [showModal, setShowModal] = useState(false)
  const [viewStudent, setViewStudent] = useState<any>(null)
  const [editModal, setEditModal] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [form, setForm] = useState({
    name:'', phone:'', course_type:'4-wheeler', batch_id:'', day_pref:'weekdays', preferred_time:'07:00', fee_amount:'',
  })

  const feeMap    = Object.fromEntries(fees.map(f => [f.student_id, f]))
  const rtoMap    = Object.fromEntries(rto.map(r => [r.student_id, r]))
  const presentCount = (sid: string) => attendance.filter(a => a.student_id === sid && a.status === 'present').length

  const filtered = students
    .filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.phone.includes(search))
    .filter(s => {
      if (tab === 'active') return s.status === 'active' || s.status === 'enrolled'
      if (tab === 'fee')    return feeMap[s.id]?.payment_status !== 'paid'
      if (tab === 'rto')    return !rtoMap[s.id]?.dl_number
      return true
    })

  const activeBatches = batches.filter(b => b.status === 'active' && b.course_type === form.course_type)

  async function enroll() {
    setLoading(true)
    const res = await fetch('/api/students', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ ...form, fee_amount: Number(form.fee_amount) }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { toast.error(data.error || 'Enrollment failed'); return }
    setStudents(p => [data.data, ...p])
    setShowModal(false)
    setForm({ name:'', phone:'', course_type:'4-wheeler', batch_id:'', day_pref:'weekdays', preferred_time:'07:00', fee_amount:'' })
    if (data.portal_url && navigator.clipboard) navigator.clipboard.writeText(data.portal_url)
    toast.success(`${data.data.name} enrolled! Portal link copied.`)
  }

  async function saveEdit() {
    if (!viewStudent) return
    setLoading(true)
    const res = await fetch(`/api/students/${viewStudent.id}`, {
      method:'PUT', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ name: viewStudent.name, phone: viewStudent.phone, status: viewStudent.status, batch_id: viewStudent.batch_id }),
    })
    setLoading(false)
    if (!res.ok) { toast.error('Update failed'); return }
    setStudents(p => p.map(s => s.id === viewStudent.id ? { ...s, ...viewStudent } : s))
    setEditModal(false)
    toast.success('Student updated')
  }

  function copyPortalLink(s: any) {
    const url = `${window.location.origin}/s/${s.portal_token}`
    navigator.clipboard.writeText(url)
    toast.success('Portal link copied!')
  }

  const tabs = [
    { id:'all', label:`All (${students.length})` },
    { id:'active', label:`Active (${students.filter(s=>s.status==='active'||s.status==='enrolled').length})` },
    { id:'fee', label:`Fee pending (${students.filter(s=>feeMap[s.id]?.payment_status!=='paid').length})` },
    { id:'rto', label:`RTO pending (${students.filter(s=>!rtoMap[s.id]?.dl_number).length})` },
  ] as const

  return (
    <div className="p-4 md:p-6">
      <PageHeader title="Students" subtitle={`${students.length} enrolled`}
        action={<Button variant="primary" onClick={() => setShowModal(true)}>+ Enroll</Button>} />

      {/* Tabs */}
      <div className="flex gap-0 border-b border-slate-200 mb-4">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={`px-4 py-2.5 text-xs font-medium border-b-2 transition ${tab===t.id?'border-green-500 text-green-600':'border-transparent text-slate-400 hover:text-slate-600'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <Input placeholder="Search name or phone…" value={search} onChange={e=>setSearch(e.target.value)} className="mb-4 max-w-xs" />

      {filtered.length === 0 && <Empty icon="◉" title="No students found" />}

      {/* Desktop table */}
      <Card className="hidden md:block">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              {['Student','Batch','Progress','Fee','RTO',''].map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-slate-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => {
              const batch = batches.find(b => b.id === s.batch_id)
              const fee   = feeMap[s.id]
              const r     = rtoMap[s.id]
              const done  = presentCount(s.id)
              const total = batch?.total_sessions ?? 0
              return (
                <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition" onClick={() => setViewStudent(s)}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={s.name} size="sm" />
                      <div>
                        <p className="font-medium text-slate-800">{s.name}</p>
                        <p className="text-xs text-slate-400">{s.phone}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{batch ? `${formatSlotTime(batch.slot_time?.slice(0,5))} ${getDayLabel(batch.day_pref)}` : '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 w-28">
                      <ProgressBar value={done} max={total} className="flex-1" />
                      <span className="text-xs text-slate-400 whitespace-nowrap">{done}/{total}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {fee ? <Badge variant={feeV[fee.payment_status]}>{fee.payment_status}</Badge> : <span className="text-slate-300 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {r?.dl_number ? 'DL issued' : r?.test_date ? 'Test booked' : r?.ll_number ? 'LL issued' : 'LL pending'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                      <button className="text-xs text-green-600 hover:underline" onClick={() => setViewStudent(s)}>View</button>
                      <button className="text-xs text-slate-400 hover:underline" onClick={() => copyPortalLink(s)}>Portal link</button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {filtered.map(s => {
          const batch = batches.find(b => b.id === s.batch_id)
          const fee   = feeMap[s.id]
          const done  = presentCount(s.id)
          const total = batch?.total_sessions ?? 0
          return (
            <Card key={s.id} className="p-4 cursor-pointer" onClick={() => setViewStudent(s)}>
              <div className="flex items-start gap-3">
                <Avatar name={s.name} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-slate-800 truncate">{s.name}</p>
                    <Badge variant={statusV[s.status] ?? 'gray'}>{s.status}</Badge>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{s.phone} · {s.course_type}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <ProgressBar value={done} max={total} className="flex-1" />
                    <span className="text-xs text-slate-400">{done}/{total}</span>
                  </div>
                  {fee && fee.payment_status !== 'paid' && (
                    <p className="text-xs text-amber-600 mt-1">
                      Fee: {formatINR(Number(fee.total_amount) - Number(fee.paid_amount))} pending
                    </p>
                  )}
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Student detail panel */}
      {viewStudent && (() => {
        const s     = viewStudent
        const batch = batches.find(b => b.id === s.batch_id)
        const fee   = feeMap[s.id]
        const r     = rtoMap[s.id]
        const done  = presentCount(s.id)
        const total = batch?.total_sessions ?? 0
        return (
          <div className="fixed inset-0 z-50 bg-black/30" onClick={() => setViewStudent(null)}>
            <div className="absolute right-0 top-0 bottom-0 w-full max-w-lg bg-white shadow-xl overflow-y-auto"
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3 p-4 border-b border-slate-200">
                <Avatar name={s.name} size="lg" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 text-base">{s.name}</p>
                  <p className="text-sm text-slate-500">{s.phone} · {s.course_type}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => { setEditModal(true) }}>Edit</Button>
                  <Button size="sm" onClick={() => copyPortalLink(s)}>Portal link</Button>
                  <button onClick={() => setViewStudent(null)} className="text-slate-400 hover:text-slate-600 text-xl leading-none w-8 h-8 flex items-center justify-center">×</button>
                </div>
              </div>

              <div className="p-4 space-y-4">
                {/* Info grid */}
                <div className="grid grid-cols-2 gap-0 border border-slate-200 rounded-xl overflow-hidden">
                  {[
                    ['Status', <Badge variant={statusV[s.status]??'gray'}>{s.status}</Badge>],
                    ['Enrolled', formatDate(s.enrolled_at)],
                    ['Batch', batch?.name ?? 'Unassigned'],
                    ['Slot', batch ? `${formatSlotTime(batch.slot_time?.slice(0,5))} ${getDayLabel(batch.day_pref)}` : '—'],
                  ].map(([l, v], i) => (
                    <div key={i} className={`p-3 ${i%2===0?'border-r':''} border-b border-slate-100 last:border-b-0`}>
                      <p className="text-xs text-slate-400 mb-1">{l as string}</p>
                      <div className="text-sm font-medium text-slate-800">{v as any}</div>
                    </div>
                  ))}
                </div>

                {/* Progress */}
                <div className="border border-slate-200 rounded-xl p-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium text-slate-700">Session progress</span>
                    <span className="text-slate-400">{done}/{total}</span>
                  </div>
                  <ProgressBar value={done} max={total} />
                  <div className="flex gap-1.5 mt-3 flex-wrap">
                    {Array.from({length: total}).map((_, i) => (
                      <div key={i} className={`w-6 h-6 rounded flex items-center justify-center text-xs ${i < done ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`}>
                        {i + 1}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Fee */}
                {fee && (
                  <div className="border border-slate-200 rounded-xl p-4">
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-medium text-slate-700">Fee</span>
                      <Badge variant={feeV[fee.payment_status]}>{fee.payment_status}</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div><p className="text-xs text-slate-400">Total</p><p className="font-semibold">{formatINR(Number(fee.total_amount))}</p></div>
                      <div><p className="text-xs text-slate-400">Paid</p><p className="font-semibold text-green-600">{formatINR(Number(fee.paid_amount))}</p></div>
                      <div><p className="text-xs text-slate-400">Balance</p><p className="font-semibold text-amber-600">{formatINR(Math.max(0,Number(fee.total_amount)-Number(fee.paid_amount)))}</p></div>
                    </div>
                  </div>
                )}

                {/* RTO */}
                {r && (
                  <div className="border border-slate-200 rounded-xl p-4">
                    <p className="font-medium text-slate-700 mb-3">RTO</p>
                    <div className="flex gap-0 mb-4">
                      {['LL issued','Training','Test','DL received'].map((step, i) => {
                        const stepDone = (i===0&&r.ll_number)||(i===1&&done>0)||(i===2&&(r.test_status==='passed'||r.dl_number))||(i===3&&r.dl_number)
                        const stepNow  = (i===0&&!r.ll_number)||(i===2&&r.test_date&&r.test_status==='scheduled')
                        return (
                          <div key={step} className="flex-1 text-center relative">
                            <div className={`w-6 h-6 rounded-full mx-auto mb-1.5 flex items-center justify-center text-xs font-medium ${stepDone?'bg-green-500 text-white':stepNow?'bg-amber-100 text-amber-700 border border-amber-400':'bg-slate-100 text-slate-400'}`}>
                              {stepDone ? '✓' : i+1}
                            </div>
                            <p className="text-xs text-slate-400 leading-tight">{step}</p>
                            {i < 3 && <div className="absolute top-3 left-[60%] w-[80%] h-px bg-slate-200" />}
                          </div>
                        )
                      })}
                    </div>
                    <div className="space-y-1.5 text-sm">
                      {r.ll_number && <p className="text-slate-600">LL: <span className="font-medium">{r.ll_number}</span>{r.ll_expiry_date&&` · expires ${r.ll_expiry_date}`}</p>}
                      {r.test_date && <p className="text-slate-600">Test: <span className="font-medium">{r.test_date}</span>{r.test_venue&&` · ${r.test_venue}`}</p>}
                      {r.dl_number && <p className="text-slate-600">DL: <span className="font-medium">{r.dl_number}</span></p>}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      {/* Edit modal */}
      {editModal && viewStudent && (
        <Modal open title="Edit student" onClose={() => setEditModal(false)}>
          <div className="space-y-3">
            <Input label="Name" value={viewStudent.name} onChange={e => setViewStudent((s: any) => ({...s, name: e.target.value}))} />
            <Input label="Phone" value={viewStudent.phone} onChange={e => setViewStudent((s: any) => ({...s, phone: e.target.value}))} />
            <Select label="Status" value={viewStudent.status} onChange={e => setViewStudent((s: any) => ({...s, status: e.target.value}))}>
              <option value="enrolled">Enrolled</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="on_hold">On hold</option>
              <option value="dropped">Dropped</option>
            </Select>
            <Select label="Batch" value={viewStudent.batch_id ?? ''} onChange={e => setViewStudent((s: any) => ({...s, batch_id: e.target.value || null}))}>
              <option value="">Unassigned</option>
              {batches.filter(b=>b.status==='active').map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
            <div className="flex gap-2 pt-2">
              <Button variant="primary" loading={loading} onClick={saveEdit} className="flex-1 justify-center">Save</Button>
              <Button onClick={() => setEditModal(false)}>Cancel</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Enroll modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Enroll new student">
        <div className="space-y-3">
          <Input label="Full name" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Student's full name" />
          <Input label="Phone" type="tel" maxLength={10} value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value.replace(/\D/g,'').slice(0,10)}))} placeholder="10-digit number" />
          <Select label="Course" value={form.course_type} onChange={e=>setForm(f=>({...f,course_type:e.target.value,batch_id:''}))}>
            <option value="4-wheeler">4-wheeler (22 sessions)</option>
            <option value="2-wheeler">2-wheeler (12 sessions)</option>
            <option value="heavy">Heavy vehicle (30 sessions)</option>
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Day preference" value={form.day_pref} onChange={e=>setForm(f=>({...f,day_pref:e.target.value}))}>
              <option value="weekdays">Mon–Sat</option>
              <option value="weekends">Sat–Sun</option>
              <option value="all">Daily</option>
            </Select>
            <Select label="Preferred slot" value={form.preferred_time} onChange={e=>setForm(f=>({...f,preferred_time:e.target.value}))}>
              {TIME_SLOTS.map(t=><option key={t} value={t}>{t}</option>)}
            </Select>
          </div>
          <Select label="Assign to batch (optional)" value={form.batch_id} onChange={e=>setForm(f=>({...f,batch_id:e.target.value}))}>
            <option value="">— Select batch —</option>
            {activeBatches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
          </Select>
          <Input label="Course fee (₹)" type="number" value={form.fee_amount} onChange={e=>setForm(f=>({...f,fee_amount:e.target.value}))} placeholder="e.g. 4500" />
          <div className="flex gap-2 pt-2">
            <Button variant="primary" loading={loading} onClick={enroll} className="flex-1 justify-center"
              disabled={!form.name||form.phone.length!==10||!form.fee_amount}>
              Enroll & copy portal link
            </Button>
            <Button onClick={()=>setShowModal(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
