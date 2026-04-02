'use client'
import { useState } from 'react'
import { Badge, Card, Avatar, Input, Button, Modal, Select } from '@/components/ui'
import PageHeader from '@/components/shared/PageHeader'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'

interface Props { students: any[]; rtoRecords: any[] }

const steps = ["LL issued", "Training", "Test booked", "DL issued"]

export default function RtoPage({ students, rtoRecords }: Props) {
  const [records, setRecords] = useState(rtoRecords)
  const [search, setSearch] = useState('')
  const [editRecord, setEditRecord] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  function getRecord(studentId: string) {
    return records.find(r => r.student_id === studentId)
  }

  function getStep(record: any): number {
    if (!record) return 0
    if (record.dl_number) return 4
    if (record.test_status === 'passed') return 4
    if (record.test_date) return 3
    if (record.ll_number) return 2
    return 1
  }

  async function saveRecord() {
    setLoading(true)
    const res = await fetch(`/api/rto/${editRecord.student_id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editRecord),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { toast.error('Update failed'); return }
    setRecords(prev => prev.map(r => r.student_id === editRecord.student_id ? data.data : r))
    setEditRecord(null)
    toast.success('RTO record updated')
  }

  const filtered = students.filter(s => s.name.toLowerCase().includes(search.toLowerCase()))
  const stepCounts = steps.map((_, i) => students.filter(s => getStep(getRecord(s.id)) > i).length)

  return (
    <div className="p-4 md:p-6">
      <PageHeader title="RTO Tracker" subtitle="Track licence progress for all students" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {steps.map((step, i) => (
          <div key={step} className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-400 mb-0.5">Step {i + 1}</p>
            <p className="text-xs font-medium text-gray-600">{step}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stepCounts[i]}</p>
          </div>
        ))}
      </div>

      <div className="mb-4">
        <Input placeholder="Search student…" value={search} onChange={e => setSearch(e.target.value)} className="md:w-64" />
      </div>

      <Card>
        <div className="divide-y divide-gray-50">
          {filtered.map(s => {
            const rec = getRecord(s.id)
            const step = getStep(rec)
            return (
              <div key={s.id} className="flex items-center gap-3 px-4 py-3.5">
                <Avatar name={s.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{s.name}</p>
                  <p className="text-xs text-gray-400">{s.phone}</p>
                  <div className="flex gap-1 mt-1.5">
                    {steps.map((_, i) => (
                      <div key={i} className={`h-1.5 rounded-full flex-1 ${i < step ? 'bg-emerald-500' : 'bg-gray-200'}`} />
                    ))}
                  </div>
                </div>
                <Badge variant={step >= 4 ? 'green' : step >= 2 ? 'blue' : 'amber'}>
                  {steps[Math.max(0, step - 1)] ?? 'Not started'}
                </Badge>
                <button
                  className="text-xs text-emerald-600 hover:underline flex-shrink-0"
                  onClick={() => setEditRecord(rec || { student_id: s.id, test_status: 'not_scheduled' })}
                >
                  Update
                </button>
              </div>
            )
          })}
        </div>
      </Card>

      {editRecord && (
        <Modal open={!!editRecord} onClose={() => setEditRecord(null)} title="Update RTO record">
          <div className="space-y-3">
            <Input label="LL number" value={editRecord.ll_number ?? ''}
              onChange={e => setEditRecord((r: any) => ({ ...r, ll_number: e.target.value }))} />
            <Input label="LL issued date" type="date" value={editRecord.ll_issued_date ?? ''}
              onChange={e => setEditRecord((r: any) => ({ ...r, ll_issued_date: e.target.value }))} />
            <Input label="Test date" type="date" value={editRecord.test_date ?? ''}
              onChange={e => setEditRecord((r: any) => ({ ...r, test_date: e.target.value }))} />
            <Input label="Test venue" value={editRecord.test_venue ?? ''}
              onChange={e => setEditRecord((r: any) => ({ ...r, test_venue: e.target.value }))} />
            <Select label="Test status" value={editRecord.test_status}
              onChange={e => setEditRecord((r: any) => ({ ...r, test_status: e.target.value }))}>
              <option value="not_scheduled">Not scheduled</option>
              <option value="scheduled">Scheduled</option>
              <option value="passed">Passed</option>
              <option value="failed">Failed</option>
            </Select>
            <Input label="DL number" value={editRecord.dl_number ?? ''}
              onChange={e => setEditRecord((r: any) => ({ ...r, dl_number: e.target.value }))} />
            <div className="flex gap-2 pt-2">
              <Button variant="primary" loading={loading} onClick={saveRecord} className="flex-1 justify-center">Save</Button>
              <Button onClick={() => setEditRecord(null)}>Cancel</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
