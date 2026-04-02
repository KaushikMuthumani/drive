'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Card, Input } from '@/components/ui'
import PageHeader from '@/components/shared/PageHeader'
import { toast } from 'sonner'

interface Props {
  school: any
  admin: any
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

export default function SchoolProfilePage({ school, admin }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    school_name: school.name ?? '',
    school_address: school.address ?? '',
    school_phone: school.phone ?? '',
    school_email: school.email ?? '',
    gst_number: school.gst_number ?? '',
    admin_name: admin.name ?? '',
    admin_phone: admin.phone ?? '',
  })

  async function save() {
    setLoading(true)
    const res = await fetch('/api/schools', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json().catch(() => ({ error: 'Failed to save profile' }))
    setLoading(false)
    if (!res.ok) {
      toast.error(getErrorMessage(data.error, 'Failed to save profile'))
      return
    }
    if (data.data?.school && data.data?.admin) {
      setForm({
        school_name: data.data.school.name ?? '',
        school_address: data.data.school.address ?? '',
        school_phone: data.data.school.phone ?? '',
        school_email: data.data.school.email ?? '',
        gst_number: data.data.school.gst_number ?? '',
        admin_name: data.data.admin.name ?? '',
        admin_phone: data.data.admin.phone ?? '',
      })
    }
    setEditing(false)
    router.refresh()
    toast.success('Profile updated')
  }

  return (
    <div className="p-4 md:p-6">
      <PageHeader
        title="School Profile"
        subtitle="View school and admin details"
        action={
          editing ? (
            <Button onClick={() => setEditing(false)}>Cancel</Button>
          ) : (
            <Button variant="primary" onClick={() => setEditing(true)}>Edit profile</Button>
          )
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-800">School details</h2>
          {editing ? (
            <>
              <Input label="School name" value={form.school_name} onChange={e => setForm(f => ({ ...f, school_name: e.target.value }))} />
              <Input label="Address" value={form.school_address} onChange={e => setForm(f => ({ ...f, school_address: e.target.value }))} />
              <Input label="Phone" value={form.school_phone} maxLength={10} onChange={e => setForm(f => ({ ...f, school_phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))} />
              <Input label="Email" type="email" value={form.school_email} onChange={e => setForm(f => ({ ...f, school_email: e.target.value }))} />
              <Input label="GST number" value={form.gst_number} onChange={e => setForm(f => ({ ...f, gst_number: e.target.value }))} />
            </>
          ) : (
            <div className="space-y-3 text-sm">
              <ProfileRow label="School name" value={form.school_name} />
              <ProfileRow label="Address" value={form.school_address} />
              <ProfileRow label="Phone" value={form.school_phone} />
              <ProfileRow label="Email" value={form.school_email} />
              <ProfileRow label="GST number" value={form.gst_number || 'Not added'} />
            </div>
          )}
        </Card>

        <Card className="p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-800">Admin details</h2>
          {editing ? (
            <>
              <Input label="Admin name" value={form.admin_name} onChange={e => setForm(f => ({ ...f, admin_name: e.target.value }))} />
              <Input label="Admin phone" value={form.admin_phone} maxLength={10} onChange={e => setForm(f => ({ ...f, admin_phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))} />
              <div className="pt-2">
                <Button variant="primary" loading={loading} onClick={save} className="w-full justify-center">
                  Save profile
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-3 text-sm">
              <ProfileRow label="Admin name" value={form.admin_name} />
              <ProfileRow label="Admin phone" value={form.admin_phone} />
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-gray-50 p-3">
      <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">{label}</p>
      <p className="font-medium text-gray-800 break-words">{value}</p>
    </div>
  )
}
