'use client'
import { useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { Button, Input, Card } from '@/components/ui'
import PageHeader from '@/components/shared/PageHeader'
import { toast } from 'sonner'

interface PaymentSettings { upi_id?: string | null; upi_qr_url?: string | null }
interface Props { user: any; school: any; settings: PaymentSettings | null; isAdmin: boolean }

const QR_ACCEPTED_TYPES = ['image/png', 'image/jpeg']
const QR_MAX_SIZE = 500 * 1024

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export default function ProfilePage({ user: u, school: s, settings: st, isAdmin }: Props) {
  const [user,       setUser]     = useState(u)
  const [school,     setSchool]   = useState(s)
  const [settings,   setSettings] = useState<PaymentSettings>(st ?? { upi_id: '', upi_qr_url: '' })
  const [editUser,   setEditUser] = useState(false)
  const [editSchool, setEditSchool]= useState(false)
  const [editUpi,    setEditUpi]  = useState(false)
  const [newPwd,     setNewPwd]   = useState('')
  const [loading,    setLoading]  = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [dragActive, setDragActive] = useState(false)

  async function handleQrFile(file: File) {
    if (!QR_ACCEPTED_TYPES.includes(file.type)) {
      toast.error('Only PNG and JPG files are accepted')
      return
    }
    if (file.size > QR_MAX_SIZE) {
      toast.error('Please upload an image smaller than 500KB')
      return
    }
    try {
      const dataUrl = await readFileAsDataUrl(file)
      setSettings(s => ({ ...s, upi_qr_url: dataUrl }))
    } catch {
      toast.error('Failed to read the image')
    }
  }

  function handleQrInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]
    if (file) {
      void handleQrFile(file)
    }
    event.currentTarget.value = ''
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragActive(true)
  }

  function handleDragLeave() {
    setDragActive(false)
  }

  async function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragActive(false)
    const file = event.dataTransfer?.files?.[0]
    if (file) {
      await handleQrFile(file)
    }
  }

  async function saveUser() {
    setLoading(true)
    const res = await fetch('/api/profile', {
      method:'PUT', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ type:'user', name: user.name, new_password: newPwd || undefined }),
    })
    setLoading(false)
    if (!res.ok) { toast.error('Update failed'); return }
    setEditUser(false); setNewPwd(''); toast.success('Profile updated')
  }

  async function saveSchool() {
    setLoading(true)
    const res = await fetch('/api/profile', {
      method:'PUT', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ type:'school', ...school }),
    })
    setLoading(false)
    if (!res.ok) { toast.error('Update failed'); return }
    setEditSchool(false); toast.success('School info updated')
  }

  async function saveUpi() {
    setLoading(true)
    const res = await fetch('/api/schools/settings', {
      method:'PUT', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ upi_id: settings.upi_id, upi_qr_url: settings.upi_qr_url }),
    })
    setLoading(false)
    if (!res.ok) { toast.error('Update failed'); return }
    setEditUpi(false); toast.success('UPI settings saved')
  }

  return (
    <div className="p-4 md:p-6 max-w-xl">
      <PageHeader title="My profile" />

      {/* Personal info */}
      <Card className="mb-4">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <span className="text-sm font-semibold text-slate-800">Personal info</span>
          <Button size="sm" onClick={() => setEditUser(e => !e)}>{editUser ? 'Cancel' : 'Edit'}</Button>
        </div>
        <div className="p-4">
          {editUser ? (
            <div className="space-y-3">
              <Input label="Name" value={user.name} onChange={e => setUser((u: any) => ({...u, name: e.target.value}))} />
              <Input label="New password (leave blank to keep current)" type="password" value={newPwd}
                onChange={e => setNewPwd(e.target.value)} placeholder="Min 6 characters" />
              <Button variant="primary" loading={loading} onClick={saveUser} className="w-full justify-center">Save</Button>
            </div>
          ) : (
            <div className="space-y-2">
              {[['Name', user.name], ['Phone', `+91 ${user.phone}`], ['Role', user.role]].map(([l,v]) => (
                <div key={l} className="flex justify-between text-sm">
                  <span className="text-slate-400">{l}</span>
                  <span className="font-medium text-slate-800 capitalize">{v}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* School info — admin only */}
      {isAdmin && (
        <Card className="mb-4">
          <div className="flex items-center justify-between p-4 border-b border-slate-100">
            <span className="text-sm font-semibold text-slate-800">School info</span>
            <Button size="sm" onClick={() => setEditSchool(e => !e)}>{editSchool ? 'Cancel' : 'Edit'}</Button>
          </div>
          <div className="p-4">
            {editSchool ? (
              <div className="space-y-3">
                <Input label="School name" value={school.name} onChange={e=>setSchool((s: any)=>({...s,name:e.target.value}))} />
                <Input label="Address" value={school.address} onChange={e=>setSchool((s: any)=>({...s,address:e.target.value}))} />
                <Input label="School phone" value={school.phone} onChange={e=>setSchool((s: any)=>({...s,phone:e.target.value}))} />
                <Input label="Email" value={school.email} onChange={e=>setSchool((s: any)=>({...s,email:e.target.value}))} />
                <Input label="GST number (optional)" value={school.gst_number ?? ''} onChange={e=>setSchool((s: any)=>({...s,gst_number:e.target.value}))} />
                <Button variant="primary" loading={loading} onClick={saveSchool} className="w-full justify-center">Save</Button>
              </div>
            ) : (
              <div className="space-y-2">
                {[['Name', school.name],['Address', school.address],['Phone', school.phone],['Email', school.email],['GST', school.gst_number||'—']].map(([l,v]) => (
                  <div key={l} className="flex justify-between text-sm">
                    <span className="text-slate-400">{l}</span>
                    <span className="font-medium text-slate-800 max-w-[220px] text-right truncate">{v}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* UPI settings — admin only */}
      {isAdmin && (
        <Card className="mb-4">
          <div className="flex items-center justify-between p-4 border-b border-slate-100">
            <div>
              <span className="text-sm font-semibold text-slate-800">Payment settings (UPI)</span>
              <p className="text-xs text-slate-400 mt-0.5">Students scan this to pay you directly</p>
            </div>
            <Button size="sm" onClick={() => setEditUpi(e => !e)}>{editUpi ? 'Cancel' : 'Edit'}</Button>
          </div>
          <div className="p-4">
            {editUpi ? (
              <div className="space-y-3">
                <Input label="Your UPI ID" value={settings.upi_id ?? ''} onChange={e=>setSettings(s=>({...s,upi_id:e.target.value}))}
                  placeholder="e.g. yourname@okicici" hint="Students will see this on their fee page" />
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wide text-slate-500">QR code image</p>
                  <div
                    role="button"
                    tabIndex={0}
                    className={`relative rounded-xl border-2 border-dashed px-4 py-6 text-center transition ${
                      dragActive ? 'border-green-400 bg-green-50' : 'border-slate-200 bg-white'
                    }`}
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDragEnter={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <input type="file" accept="image/png,image/jpeg" className="hidden" ref={fileInputRef}
                      onChange={handleQrInputChange} />
                    <p className="text-sm font-semibold text-slate-800">Tap or drag QR code here</p>
                    <p className="text-xs text-slate-400 mt-1">PNG or JPG, up to 500KB</p>
                    {settings.upi_qr_url ? (
                      <>
                        <div className="mt-3 flex justify-center">
                          <img src={settings.upi_qr_url} alt="UPI QR" className="w-32 h-32 object-contain border border-slate-200 rounded-lg" />
                        </div>
                        <button type="button" onClick={() => setSettings(s => ({ ...s, upi_qr_url: '' }))}
                          className="text-xs text-slate-500 hover:text-slate-800 mt-2">
                          Remove image
                        </button>
                      </>
                    ) : (
                      <p className="text-xs text-slate-400 mt-2">Preview will appear here after uploading</p>
                    )}
                  </div>
                </div>
                <Button variant="primary" loading={loading} onClick={saveUpi} className="w-full justify-center">Save UPI settings</Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">UPI ID</span>
                  <span className="font-medium text-slate-800">{settings.upi_id || <span className="text-slate-300">Not set</span>}</span>
                </div>
                {settings.upi_qr_url && (
                  <div className="mt-3">
                    <p className="text-xs text-slate-400 mb-2">QR code preview</p>
                    <img src={settings.upi_qr_url} alt="UPI QR" className="w-32 h-32 object-contain border border-slate-200 rounded-lg" />
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}
