'use client'
import { useState } from 'react'
import { Button, Badge, Card, Modal, Input, Select, Avatar } from '@/components/ui'
import PageHeader from '@/components/shared/PageHeader'
import { formatSlotTime, getDayLabel, COURSE_SESSIONS, TIME_SLOTS } from '@/lib/course/config'
import { toast } from 'sonner'

interface Props {
  batches: any[]; instructors: any[]; vehicles: any[]; students: any[]; schoolId: string
}

const courseColors: Record<string,'green'|'blue'|'amber'> = {
  '4-wheeler':'green', '2-wheeler':'blue', 'heavy':'amber'
}

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

export default function BatchesPage({ batches: initial, instructors, vehicles, students, schoolId }: Props) {
  const [batches, setBatches] = useState(initial)
  const [allStudents, setAllStudents] = useState(students)
  const [showModal, setShowModal] = useState(false)
  const [manageBatch, setManageBatch] = useState<any | null>(null)
  const [loading, setLoading] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [selectedExistingStudentId, setSelectedExistingStudentId] = useState('')
  const [form, setForm] = useState({
    instructor_id: '', vehicle_id: '', slot_time: '07:00',
    day_pref: 'weekdays', course_type: '4-wheeler',
    start_date: new Date().toISOString().split('T')[0],
    max_students: '4', name: '',
  })
  const [studentForm, setStudentForm] = useState({
    name: '', phone: '', fee_amount: '',
    course_type: '4-wheeler', batch_id: '', day_pref: 'weekdays', preferred_time: '07:00',
  })

  const instrs = instructors.filter(i => i.role === 'instructor')

  function autoName() {
    const instr = instrs.find(i => i.id === form.instructor_id)
    const v     = vehicles.find(v => v.id === form.vehicle_id)
    const time  = formatSlotTime(form.slot_time)
    const day   = form.day_pref === 'weekdays' ? 'Weekday' : form.day_pref === 'weekends' ? 'Weekend' : 'Daily'
    if (time) setForm(f => ({ ...f, name: `${time} ${day} – ${v?.make_model ?? ''}`.trim() }))
  }

  async function createBatch() {
    setLoading(true)
    const res = await fetch('/api/batches', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, max_students: Number(form.max_students) }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { toast.error(getErrorMessage(data.error, 'Failed to create batch')); return }
    setBatches(p => [data.data, ...p])
    setShowModal(false)
    toast.success(`Batch "${data.data.name}" created with ${COURSE_SESSIONS[form.course_type]} sessions scheduled`)
  }

  function studentsInBatch(batchId: string) {
    return allStudents.filter(s => s.batch_id === batchId)
  }

  function openManageBatch(batch: any) {
    setManageBatch(batch)
    setSelectedExistingStudentId('')
    setStudentForm({
      name: '',
      phone: '',
      fee_amount: '',
      course_type: batch.course_type,
      batch_id: batch.id,
      day_pref: batch.day_pref,
      preferred_time: batch.slot_time?.slice(0, 5) ?? '07:00',
    })
  }

  function getAvailableStudents(batch: any) {
    return allStudents.filter(student =>
      student.course_type === batch.course_type &&
      student.id !== undefined &&
      student.batch_id !== batch.id
    )
  }

  function getAssignableBatches(student: any) {
    return batches.filter(batch =>
      batch.status === 'active' &&
      batch.course_type === student.course_type
    )
  }

  async function updateStudent(studentId: string, updates: Record<string, unknown>) {
    const res = await fetch(`/api/students/${studentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    const data = await res.json()
    if (!res.ok) {
      throw new Error(getErrorMessage(data.error, 'Failed to update student'))
    }
    setAllStudents(prev => prev.map(student => student.id === studentId ? data.data : student))
    return data.data
  }

  async function assignExistingStudent() {
    if (!manageBatch || !selectedExistingStudentId) return
    setAssigning(true)
    try {
      await updateStudent(selectedExistingStudentId, {
        batch_id: manageBatch.id,
        day_pref: manageBatch.day_pref,
        preferred_time: manageBatch.slot_time?.slice(0, 5) ?? null,
      })
      setSelectedExistingStudentId('')
      toast.success('Student assigned to batch')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to assign student')
    } finally {
      setAssigning(false)
    }
  }

  async function enrollStudentForBatch() {
    if (!manageBatch) return
    setAssigning(true)
    const payload = {
      ...studentForm,
      batch_id: manageBatch.id,
      course_type: manageBatch.course_type,
      day_pref: manageBatch.day_pref,
      preferred_time: manageBatch.slot_time?.slice(0, 5) ?? studentForm.preferred_time,
      fee_amount: Number(studentForm.fee_amount),
    }

    const res = await fetch('/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    setAssigning(false)
    if (!res.ok) {
      toast.error(getErrorMessage(data.error, 'Enrollment failed'))
      return
    }

    setAllStudents(prev => [data.data, ...prev])
    setStudentForm({
      name: '',
      phone: '',
      fee_amount: '',
      course_type: manageBatch.course_type,
      batch_id: manageBatch.id,
      day_pref: manageBatch.day_pref,
      preferred_time: manageBatch.slot_time?.slice(0, 5) ?? '07:00',
    })
    toast.success(`${data.data.name} added to batch`)
  }

  return (
    <div className="p-4 md:p-6">
      <PageHeader title="Batches" subtitle="One batch = one instructor + vehicle + time slot + 3–4 students"
        action={<Button variant="primary" onClick={() => setShowModal(true)}>+ New batch</Button>} />

      {batches.length === 0 && (
        <Card className="p-10 text-center">
          <div className="text-4xl mb-3">📋</div>
          <p className="font-semibold text-gray-700 mb-1">No batches yet</p>
          <p className="text-sm text-gray-400 mb-4">Create your first batch to start scheduling sessions</p>
          <Button variant="primary" onClick={() => setShowModal(true)}>Create first batch</Button>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {batches.map(b => {
          const instr   = instructors.find(i => i.id === b.instructor_id)
          const vehicle  = vehicles.find(v => v.id === b.vehicle_id)
          const enrolled = studentsInBatch(b.id)
          const pct      = Math.round((enrolled.length / b.max_students) * 100)

          return (
            <Card key={b.id} className="p-4">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{b.name}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Badge variant={courseColors[b.course_type] ?? 'gray'}>{b.course_type}</Badge>
                    <span className="text-xs text-gray-400">{getDayLabel(b.day_pref)}</span>
                    <span className="text-xs text-gray-400">{b.total_sessions} sessions</span>
                  </div>
                </div>
                <Badge variant={b.status === 'active' ? 'green' : 'gray'}>{b.status}</Badge>
              </div>

              <div className="space-y-1.5 mb-3">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="text-xs">👨‍🏫</span>
                  <span>{instr?.name ?? '—'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="text-xs">🚗</span>
                  <span>{vehicle?.make_model} · {vehicle?.registration_no}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="text-xs">📅</span>
                  <span>Starts {b.start_date}</span>
                </div>
              </div>

              {/* Student slots */}
              <div className="bg-gray-50 rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Students</span>
                  <span className={`text-xs font-medium ${enrolled.length >= b.max_students ? 'text-red-500' : 'text-emerald-600'}`}>
                    {enrolled.length}/{b.max_students} {enrolled.length >= b.max_students ? '(Full)' : 'slots'}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {enrolled.map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => openManageBatch(b)}
                      className="flex items-center gap-1.5 bg-white border border-gray-100 rounded-lg px-2 py-1 hover:border-emerald-200 transition"
                    >
                      <Avatar name={s.name} size="sm" />
                      <span className="text-xs font-medium text-gray-700">{s.name.split(' ')[0]}</span>
                    </button>
                  ))}
                  {enrolled.length < b.max_students && (
                    <button
                      type="button"
                      onClick={() => openManageBatch(b)}
                      className="w-8 h-8 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 text-sm hover:border-emerald-300 hover:text-emerald-600 transition"
                      aria-label={`Add student to ${b.name}`}
                      title="Add student to this batch"
                    >
                      +
                    </button>
                  )}
                </div>
                <div className="mt-3">
                  <button type="button" onClick={() => openManageBatch(b)} className="text-xs text-emerald-600 hover:underline">
                    Manage students
                  </button>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Create new batch">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Select label="Course type" value={form.course_type}
              onChange={e => { setForm(f => ({...f, course_type: e.target.value})); setTimeout(autoName, 50) }}>
              <option value="4-wheeler">4-wheeler ({COURSE_SESSIONS['4-wheeler']} sessions)</option>
              <option value="2-wheeler">2-wheeler ({COURSE_SESSIONS['2-wheeler']} sessions)</option>
              <option value="heavy">Heavy ({COURSE_SESSIONS['heavy']} sessions)</option>
            </Select>
            <Select label="Max students" value={form.max_students}
              onChange={e => setForm(f => ({...f, max_students: e.target.value}))}>
              {[2,3,4,5,6].map(n => <option key={n} value={n}>{n} students</option>)}
            </Select>
          </div>

          <Select label="Instructor" value={form.instructor_id}
            onChange={e => { setForm(f => ({...f, instructor_id: e.target.value})); setTimeout(autoName, 50) }}>
            <option value="">— Select instructor —</option>
            {instrs.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
          </Select>

          <Select label="Vehicle" value={form.vehicle_id}
            onChange={e => { setForm(f => ({...f, vehicle_id: e.target.value})); setTimeout(autoName, 50) }}>
            <option value="">— Select vehicle —</option>
            {vehicles.filter(v => v.status === 'available').map(v =>
              <option key={v.id} value={v.id}>{v.make_model} · {v.registration_no}</option>
            )}
          </Select>

          <div className="grid grid-cols-2 gap-3">
            <Select label="Time slot" value={form.slot_time}
              onChange={e => { setForm(f => ({...f, slot_time: e.target.value})); setTimeout(autoName, 50) }}>
              {TIME_SLOTS.map(t => <option key={t} value={t}>{formatSlotTime(t)}</option>)}
            </Select>
            <Select label="Days" value={form.day_pref}
              onChange={e => { setForm(f => ({...f, day_pref: e.target.value})); setTimeout(autoName, 50) }}>
              <option value="weekdays">Mon–Sat (Weekdays)</option>
              <option value="weekends">Sat–Sun (Weekends)</option>
              <option value="all">Daily</option>
            </Select>
          </div>

          <Input label="Start date" type="date" value={form.start_date}
            onChange={e => setForm(f => ({...f, start_date: e.target.value}))} />

          <Input label="Batch name (auto-filled)" value={form.name} placeholder="e.g. 7 AM Weekday – Swift"
            onChange={e => setForm(f => ({...f, name: e.target.value}))} />

          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-700">
            System will auto-generate all {COURSE_SESSIONS[form.course_type]} session dates from {form.start_date}
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="primary" loading={loading} onClick={createBatch} className="flex-1 justify-center"
              disabled={!form.instructor_id || !form.vehicle_id || !form.name}>
              Create batch
            </Button>
            <Button onClick={() => setShowModal(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!manageBatch} onClose={() => setManageBatch(null)} title={manageBatch ? `Manage ${manageBatch.name}` : 'Manage batch'}>
        {manageBatch && (
          <div className="space-y-4">
            <div className="rounded-xl bg-gray-50 p-3">
              <p className="text-sm font-medium text-gray-800">{formatSlotTime(manageBatch.slot_time?.slice(0, 5))} · {getDayLabel(manageBatch.day_pref)}</p>
              <p className="text-xs text-gray-500 mt-1">{studentsInBatch(manageBatch.id).length}/{manageBatch.max_students} slots filled</p>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Add existing student</p>
              <Select value={selectedExistingStudentId} onChange={e => setSelectedExistingStudentId(e.target.value)}>
                <option value="">Select a student</option>
                {getAvailableStudents(manageBatch).map(student => (
                  <option key={student.id} value={student.id}>
                    {student.name} · {student.phone}{student.batch_id ? ` · from ${getBatchName(student.batch_id, batches)}` : ' · unassigned'}
                  </option>
                ))}
              </Select>
              <Button variant="primary" className="w-full justify-center" loading={assigning} disabled={!selectedExistingStudentId || studentsInBatch(manageBatch.id).length >= manageBatch.max_students} onClick={assignExistingStudent}>
                Add existing student
              </Button>
            </div>

            <div className="border-t border-gray-100 pt-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Add new student</p>
              <Input label="Student name" placeholder="Full name" value={studentForm.name} onChange={e => setStudentForm(f => ({ ...f, name: e.target.value }))} />
              <Input label="Phone number" type="tel" placeholder="10-digit" maxLength={10} value={studentForm.phone} onChange={e => setStudentForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))} />
              <Input label="Course fee (Rs)" type="number" placeholder="e.g. 4500" value={studentForm.fee_amount} onChange={e => setStudentForm(f => ({ ...f, fee_amount: e.target.value }))} />
              <Button variant="primary" className="w-full justify-center" loading={assigning} disabled={!studentForm.name || studentForm.phone.length !== 10 || !studentForm.fee_amount || studentsInBatch(manageBatch.id).length >= manageBatch.max_students} onClick={enrollStudentForBatch}>
                Enroll new student into this batch
              </Button>
            </div>

            <div className="border-t border-gray-100 pt-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Current students</p>
              {studentsInBatch(manageBatch.id).length === 0 && (
                <p className="text-sm text-gray-400">No students assigned yet.</p>
              )}
              {studentsInBatch(manageBatch.id).map(student => (
                <div key={student.id} className="rounded-xl border border-gray-100 p-3 space-y-2">
                  <div className="flex items-center gap-3">
                    <Avatar name={student.name} size="sm" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{student.name}</p>
                      <p className="text-xs text-gray-500">{student.phone}</p>
                    </div>
                  </div>
                  <Select
                    value={student.batch_id ?? ''}
                    onChange={async e => {
                      try {
                        const nextBatchId = e.target.value || null
                        const nextBatch = batches.find(batch => batch.id === nextBatchId)
                        await updateStudent(student.id, {
                          batch_id: nextBatchId,
                          day_pref: nextBatch?.day_pref ?? student.day_pref,
                          preferred_time: nextBatch?.slot_time?.slice(0, 5) ?? null,
                        })
                        toast.success(nextBatch ? 'Student moved successfully' : 'Student unassigned from batch')
                      } catch (error) {
                        toast.error(error instanceof Error ? error.message : 'Failed to move student')
                      }
                    }}
                  >
                    <option value="">Unassign from batch</option>
                    {getAssignableBatches(student).map(batch => (
                      <option key={batch.id} value={batch.id}>
                        {batch.name} · {formatSlotTime(batch.slot_time?.slice(0, 5))}
                      </option>
                    ))}
                  </Select>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function getBatchName(batchId: string, batches: any[]) {
  return batches.find(batch => batch.id === batchId)?.name ?? 'another batch'
}
