'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Button, Badge, Avatar, Input, Select, Modal, Card, ProgressBar } from '@/components/ui'
import PageHeader from '@/components/shared/PageHeader'
import { formatDate } from '@/lib/utils'
import { COURSE_SESSIONS, formatSlotTime, getDayLabel } from '@/lib/course/config'
import { toast } from 'sonner'

interface Props { students: any[]; batches: any[]; schoolId: string }

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'string') return error
  if (error && typeof error === 'object') {
    const formErrors = (error as any).formErrors
    if (Array.isArray(formErrors) && formErrors.length > 0) return formErrors[0]

    const fieldErrors = (error as any).fieldErrors
    if (fieldErrors && typeof fieldErrors === 'object') {
      const firstField = Object.values(fieldErrors).find(value => Array.isArray(value) && value.length > 0) as string[] | undefined
      if (firstField?.[0]) return firstField[0]
    }
  }
  return fallback
}

export default function StudentsPage({ students: initial, batches, schoolId }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [students, setStudents]   = useState(initial)
  const [search, setSearch]       = useState('')
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading]     = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null)
  const [form, setForm] = useState({
    name: '', phone: '', course_type: '4-wheeler',
    batch_id: '', day_pref: 'weekdays', preferred_time: '07:00',
    fee_amount: '',
  })

  const filtered = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) || s.phone.includes(search)
  )

  const activeBatches = batches.filter(b =>
    b.status === 'active' && b.course_type === form.course_type
  )

  useEffect(() => {
    if (searchParams.get('enroll') !== '1') return

    const batchId = searchParams.get('batchId') ?? ''
    const batch = batches.find(b => b.id === batchId)
    if (batch) {
      setForm(f => ({
        ...f,
        batch_id: batch.id,
        course_type: batch.course_type,
        day_pref: batch.day_pref,
        preferred_time: batch.slot_time?.slice(0, 5) ?? f.preferred_time,
      }))
    }
    setShowModal(true)
  }, [batches, searchParams])

  async function enroll() {
    setLoading(true)
    const payload = {
      ...form,
      batch_id: form.batch_id || undefined,
      fee_amount: Number(form.fee_amount),
    }
    const res = await fetch('/api/students', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { toast.error(getErrorMessage(data.error, 'Enrollment failed')); return }
    setStudents(p => [data.data, ...p])
    closeEnrollModal()
    setForm({ name: '', phone: '', course_type: '4-wheeler', batch_id: '', day_pref: 'weekdays', preferred_time: '07:00', fee_amount: '' })
    if (data.portal_url && navigator.clipboard) {
      navigator.clipboard.writeText(data.portal_url)
      toast.success(`${data.data.name} enrolled! Portal link copied to clipboard`)
    } else {
      toast.success(`${data.data.name} enrolled!`)
    }
  }

  function getBatch(batchId: string) { return batches.find(b => b.id === batchId) }

  function closeEnrollModal() {
    setShowModal(false)
    if (searchParams.get('enroll') === '1') {
      router.replace(pathname)
    }
  }

  async function copyPortalLink(student: any) {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/s/${student.portal_token}`)
      toast.success('Portal link copied')
    } catch {
      toast.error('Could not copy portal link')
    }
  }

  async function updateSelectedStudent(updates: Record<string, unknown>) {
    if (!selectedStudent) return
    const res = await fetch(`/api/students/${selectedStudent.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    const data = await res.json()
    if (!res.ok) {
      toast.error(getErrorMessage(data.error, 'Failed to update student'))
      return
    }

    setStudents(prev => prev.map(student => student.id === selectedStudent.id ? data.data : student))
    setSelectedStudent(data.data)
    toast.success('Student updated')
  }

  function completedSessions(student: any) {
    // placeholder — in real app query attendance count
    return 0
  }

  return (
    <div className="p-4 md:p-6">
      <PageHeader title="Students" subtitle={`${students.length} enrolled`}
        action={<Button variant="primary" onClick={() => setShowModal(true)}>+ Enroll</Button>} />

      <Input placeholder="Search name or phone…" value={search} onChange={e => setSearch(e.target.value)} className="mb-4 md:w-72" />

      {/* Desktop table */}
      <Card className="hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Student','Course','Batch / Slot','Sessions','Status',''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={6} className="text-center py-10 text-gray-400">No students found</td></tr>}
              {filtered.map(s => {
                const batch = getBatch(s.batch_id)
                const done  = completedSessions(s)
                const total = COURSE_SESSIONS[s.course_type] ?? 22
                return (
                  <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={s.name} size="sm" />
                        <div>
                          <p className="font-medium text-gray-800">{s.name}</p>
                          <p className="text-xs text-gray-400">{s.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{s.course_type}</td>
                    <td className="px-4 py-3">
                      {batch ? (
                        <div>
                          <p className="text-xs font-medium text-gray-700">{formatSlotTime(batch.slot_time?.slice(0,5))}</p>
                          <p className="text-xs text-gray-400">{getDayLabel(batch.day_pref)}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-amber-600">No batch assigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="w-24">
                        <p className="text-xs text-gray-500 mb-1">{done}/{total}</p>
                        <ProgressBar value={done} max={total} />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={s.status==='active'?'green':s.status==='completed'?'blue':s.status==='on_hold'?'amber':'gray'}>
                        {s.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <button type="button" onClick={() => setSelectedStudent(s)} className="text-xs text-emerald-600 hover:underline">
                        View
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {filtered.map(s => {
          const batch = getBatch(s.batch_id)
          const done  = completedSessions(s)
          const total = COURSE_SESSIONS[s.course_type] ?? 22
          return (
            <Card key={s.id} className="p-4">
              <div className="flex items-start gap-3">
                <Avatar name={s.name} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-gray-800 truncate">{s.name}</p>
                    <Badge variant={s.status==='active'?'green':s.status==='completed'?'blue':'amber'}>{s.status}</Badge>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{s.phone} · {s.course_type}</p>
                  {batch ? (
                    <p className="text-xs text-emerald-600 mt-0.5">
                      {formatSlotTime(batch.slot_time?.slice(0,5))} · {getDayLabel(batch.day_pref)}
                    </p>
                  ) : (
                    <p className="text-xs text-amber-500 mt-0.5">No batch assigned</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-gray-400">{done}/{total}</span>
                    <ProgressBar value={done} max={total} className="flex-1" />
                  </div>
                  <button type="button" onClick={() => setSelectedStudent(s)} className="text-xs text-emerald-600 hover:underline mt-2">
                    View student
                  </button>
                </div>
              </div>
            </Card>
          )
        })}
        {filtered.length === 0 && <Card className="p-8 text-center text-gray-400">No students found</Card>}
      </div>

      {/* Enroll Modal */}
      <Modal open={showModal} onClose={closeEnrollModal} title="Enroll new student">
        <div className="space-y-3">
          <Input label="Student name" placeholder="Full name" value={form.name}
            onChange={e => setForm(f => ({...f, name: e.target.value}))} />
          <Input label="Phone number" type="tel" placeholder="10-digit" maxLength={10} value={form.phone}
            onChange={e => setForm(f => ({...f, phone: e.target.value.replace(/\D/g,'').slice(0,10)}))} />

          <Select label="Course type" value={form.course_type}
            onChange={e => setForm(f => ({...f, course_type: e.target.value, batch_id:''}))}>
            <option value="4-wheeler">4-wheeler</option>
            <option value="2-wheeler">2-wheeler</option>
            <option value="heavy">Heavy vehicle</option>
          </Select>

          <div className="grid grid-cols-2 gap-3">
            <Select label="Day preference" value={form.day_pref}
              onChange={e => setForm(f => ({...f, day_pref: e.target.value}))}>
              <option value="weekdays">Mon–Sat</option>
              <option value="weekends">Sat–Sun</option>
              <option value="all">Daily</option>
            </Select>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Preferred time</label>
              <input type="time" value={form.preferred_time}
                onChange={e => setForm(f => ({...f, preferred_time: e.target.value}))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
          </div>

          <Select label="Assign to batch" value={form.batch_id}
            onChange={e => setForm(f => ({...f, batch_id: e.target.value}))}>
            <option value="">— Assign batch later —</option>
            {activeBatches.map(b => {
              const slots = students.filter(s => s.batch_id === b.id).length
              const avail = b.max_students - slots
              return (
                <option key={b.id} value={b.id} disabled={avail <= 0}>
                  {b.name} · {formatSlotTime(b.slot_time?.slice(0,5))} · {avail > 0 ? `${avail} slots left` : 'Full'}
                </option>
              )
            })}
          </Select>

          <Input label="Course fee (₹)" type="number" placeholder="e.g. 4500" value={form.fee_amount}
            onChange={e => setForm(f => ({...f, fee_amount: e.target.value}))} />

          <div className="flex gap-2 pt-1">
            <Button variant="primary" loading={loading} onClick={enroll}
              className="flex-1 justify-center"
              disabled={!form.name || form.phone.length !== 10 || !form.fee_amount}>
              Enroll & copy link
            </Button>
            <Button onClick={closeEnrollModal}>Cancel</Button>
          </div>
          <p className="text-xs text-gray-400 text-center">Portal link copied to clipboard after enrollment</p>
        </div>
      </Modal>

      <Modal open={!!selectedStudent} onClose={() => setSelectedStudent(null)} title="Student details">
        {selectedStudent && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar name={selectedStudent.name} />
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 truncate">{selectedStudent.name}</p>
                <p className="text-sm text-gray-500">{selectedStudent.phone}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-gray-50 p-3">
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Course</p>
                <p className="font-medium text-gray-800">{selectedStudent.course_type}</p>
              </div>
              <div className="rounded-xl bg-gray-50 p-3">
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Status</p>
                <Badge variant={selectedStudent.status==='active'?'green':selectedStudent.status==='completed'?'blue':selectedStudent.status==='on_hold'?'amber':'gray'}>
                  {selectedStudent.status}
                </Badge>
              </div>
              <div className="rounded-xl bg-gray-50 p-3">
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Batch</p>
                <Select value={selectedStudent.batch_id ?? ''} onChange={e => {
                  const nextBatchId = e.target.value || null
                  const nextBatch = batches.find(batch => batch.id === nextBatchId)
                  updateSelectedStudent({
                    batch_id: nextBatchId,
                    day_pref: nextBatch?.day_pref ?? selectedStudent.day_pref,
                    preferred_time: nextBatch?.slot_time?.slice(0, 5) ?? null,
                  })
                }}>
                  <option value="">Not assigned</option>
                  {batches.filter(batch => batch.status === 'active' && batch.course_type === selectedStudent.course_type).map(batch => (
                    <option key={batch.id} value={batch.id}>
                      {batch.name} · {formatSlotTime(batch.slot_time?.slice(0, 5))}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="rounded-xl bg-gray-50 p-3">
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Enrolled</p>
                <p className="font-medium text-gray-800">{formatDate(selectedStudent.enrolled_at)}</p>
              </div>
            </div>

            <div className="rounded-xl border border-gray-100 p-3">
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Student portal</p>
              <p className="text-sm text-gray-700 break-all mb-3">{`${typeof window !== 'undefined' ? window.location.origin : ''}/s/${selectedStudent.portal_token}`}</p>
              <div className="flex gap-2">
                <Button variant="primary" className="flex-1 justify-center" onClick={() => copyPortalLink(selectedStudent)}>
                  Copy portal link
                </Button>
                <Link href={`/s/${selectedStudent.portal_token}`} target="_blank" className="flex-1">
                  <Button className="w-full justify-center">Open portal</Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
