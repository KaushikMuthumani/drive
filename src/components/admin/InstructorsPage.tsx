'use client'
import { useState } from 'react'
import { Avatar, Badge, Card, Button, Modal, Input } from '@/components/ui'
import PageHeader from '@/components/shared/PageHeader'
import { toast } from 'sonner'

interface Props { instructors: any[]; students: any[] }

export default function InstructorsPage({ instructors: initial, students }: Props) {
  const [instructors, setInstructors] = useState(initial)
  const [showModal,   setShowModal]   = useState(false)
  const [loading,     setLoading]     = useState(false)
  const [showPass,    setShowPass]    = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', password: '' })

  async function addInstructor() {
    setLoading(true)
    const res = await fetch('/api/instructors', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { toast.error(typeof data.error === 'string' ? data.error : 'Failed to add instructor'); return }
    setInstructors(prev => [data.data, ...prev])
    setShowModal(false)
    setForm({ name: '', phone: '', password: '' })
    toast.success(`${form.name} added. They can now log in with their phone + password.`)
  }

  const valid = form.name && form.phone.length === 10 && form.password.length >= 6

  return (
    <div className="p-4 md:p-6">
      <PageHeader
        title="Instructors"
        subtitle={`${instructors.length} instructor${instructors.length !== 1 ? 's' : ''}`}
        action={<Button variant="primary" onClick={() => setShowModal(true)}>+ Add instructor</Button>}
      />

      <Card>
        <div className="divide-y divide-gray-50">
          {instructors.length === 0 && (
            <div className="text-center py-14 text-gray-400">
              <p className="text-2xl mb-2">👨‍🏫</p>
              <p className="font-medium text-gray-600">No instructors yet</p>
              <p className="text-sm mt-1">Add your first instructor to start creating batches</p>
            </div>
          )}
          {instructors.map(i => {
            const assigned = students.filter(s => {
              // students assigned to batches where instructor_id = i.id is checked via batches
              return true // simplification — show all
            }).length
            return (
              <div key={i.id} className="flex items-center gap-3 px-4 py-4">
                <Avatar name={i.name} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{i.name}</p>
                  <p className="text-xs text-gray-400">+91 {i.phone}</p>
                </div>
                <Badge variant={i.is_active ? 'green' : 'gray'}>
                  {i.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            )
          })}
        </div>
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add instructor">
        <div className="space-y-3">
          <Input
            label="Full name"
            placeholder="Instructor's name"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          />
          <Input
            label="Mobile number"
            placeholder="10-digit number — they log in with this"
            type="tel" maxLength={10}
            value={form.phone}
            onChange={e => setForm(f => ({ ...f, phone: e.target.value.replace(/\D/g,'').slice(0,10) }))}
          />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                placeholder="Min 6 characters"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 pr-14"
              />
              <button type="button" onClick={() => setShowPass(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600 font-medium">
                {showPass ? 'Hide' : 'Show'}
              </button>
            </div>
            <p className="text-xs text-gray-400">Share this password with the instructor. They can log in immediately.</p>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="primary" loading={loading}
              onClick={addInstructor}
              disabled={!valid}
              className="flex-1 justify-center"
            >
              Add instructor
            </Button>
            <Button onClick={() => setShowModal(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
