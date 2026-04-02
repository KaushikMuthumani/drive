'use client'
import { useState } from 'react'
import { Button, Badge, Card, Modal, Input, Select } from '@/components/ui'
import PageHeader from '@/components/shared/PageHeader'
import { toast } from 'sonner'

interface Vehicle {
  id: string; registration_no: string; make_model: string
  type: string; status: string; service_due_date?: string | null
}
interface Props { vehicles: Vehicle[]; schoolId: string }

const statusVariant: Record<string, 'green' | 'blue' | 'amber' | 'red'> = {
  available: 'green', in_session: 'blue', service_due: 'amber', under_repair: 'red',
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

export default function FleetPage({ vehicles: initial, schoolId }: Props) {
  const [vehicles, setVehicles] = useState(initial)
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ registration_no: '', make_model: '', type: '4-wheeler', service_due_date: '' })

  async function addVehicle() {
    setLoading(true)
    const res = await fetch('/api/vehicles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { toast.error(getErrorMessage(data.error, 'Failed to add vehicle')); return }
    setVehicles(prev => [data.data, ...prev])
    setShowModal(false)
    setForm({ registration_no: '', make_model: '', type: '4-wheeler', service_due_date: '' })
    toast.success('Vehicle added')
  }

  const available = vehicles.filter(v => v.status === 'available').length
  const inSession  = vehicles.filter(v => v.status === 'in_session').length

  return (
    <div className="p-4 md:p-6">
      <PageHeader
        title="Fleet & Vehicles"
        subtitle={`${vehicles.length} total · ${available} available · ${inSession} in session`}
        action={<Button variant="primary" onClick={() => setShowModal(true)}>+ Add vehicle</Button>}
      />

      {vehicles.length === 0 && (
        <Card className="p-10 text-center text-gray-400">No vehicles added yet</Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {vehicles.map(v => (
          <Card key={v.id} className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">{v.type}</p>
                <p className="font-semibold text-gray-800">{v.make_model}</p>
                <p className="text-xs font-mono text-gray-500 mt-0.5">{v.registration_no}</p>
              </div>
              <Badge variant={statusVariant[v.status] ?? 'gray'}>{v.status.replace('_', ' ')}</Badge>
            </div>
            {v.service_due_date && (
              <p className="text-xs text-amber-600 mt-2 border-t border-gray-50 pt-2">
                Service due: {v.service_due_date}
              </p>
            )}
          </Card>
        ))}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add vehicle">
        <div className="space-y-3">
          <Input label="Registration number" placeholder="e.g. TN-33-AB-1234"
            value={form.registration_no}
            onChange={e => setForm(f => ({ ...f, registration_no: e.target.value.toUpperCase() }))} />
          <Input label="Make & model" placeholder="e.g. Maruti Swift"
            value={form.make_model}
            onChange={e => setForm(f => ({ ...f, make_model: e.target.value }))} />
          <Select label="Type" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
            <option value="2-wheeler">2-wheeler</option>
            <option value="4-wheeler">4-wheeler</option>
            <option value="heavy">Heavy</option>
          </Select>
          <Input label="Service due date (optional)" type="date"
            value={form.service_due_date}
            onChange={e => setForm(f => ({ ...f, service_due_date: e.target.value }))} />
          <div className="flex gap-2 pt-2">
            <Button variant="primary" loading={loading} onClick={addVehicle}
              className="flex-1 justify-center"
              disabled={!form.registration_no || !form.make_model}>
              Add vehicle
            </Button>
            <Button onClick={() => setShowModal(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
