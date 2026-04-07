'use client'
import { useState } from 'react'
import { Button, Badge, Card, Modal, Input, Select, Empty } from '@/components/ui'
import PageHeader from '@/components/shared/PageHeader'
import { formatDate } from '@/lib/utils'
import { TIME_SLOTS } from '@/lib/course/config'
import { toast } from 'sonner'

interface Props { leads: any[] }

const STATUSES = ['new','called','interested','enrolled','lost'] as const
const statusColor: Record<string,string> = {
  new:'bg-slate-100 text-slate-600', called:'bg-amber-50 text-amber-700',
  interested:'bg-green-50 text-green-700', enrolled:'bg-blue-50 text-blue-700',
  lost:'bg-red-50 text-red-600',
}
const badgeV: Record<string,'gray'|'amber'|'green'|'blue'|'red'> = {
  new:'gray', called:'amber', interested:'green', enrolled:'blue', lost:'red'
}

const DEFAULT_CONVERT_FORM = { fee_amount: '', day_pref: 'weekdays', preferred_time: '07:00' }

export default function EnquiriesPage({ leads: initial }: Props) {
  const [leads, setLeads]       = useState(initial)
  const [selected, setSelected] = useState<any>(null)
  const [showAdd, setShowAdd]   = useState(false)
  const [loading, setLoading]   = useState(false)
  const [addForm, setAddForm]   = useState({ name:'', phone:'', course_type:'4-wheeler', source:'phone', notes:'' })
  const [convertLead, setConvertLead] = useState<any>(null)
  const [convertForm, setConvertForm] = useState(() => ({ ...DEFAULT_CONVERT_FORM }))
  const [converting, setConverting] = useState(false)

  const today = new Date().toISOString().split('T')[0]
  const followUpToday = leads.filter(l => l.follow_up_at === today && l.status !== 'enrolled' && l.status !== 'lost').length

  const stats = {
    total:    leads.length,
    enrolled: leads.filter(l=>l.status==='enrolled').length,
    followUp: followUpToday,
    lost:     leads.filter(l=>l.status==='lost').length,
  }

  async function addLead() {
    setLoading(true)
    const res = await fetch('/api/leads', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(addForm),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { toast.error('Failed to add'); return }
    setLeads(p => [data.data, ...p])
    setShowAdd(false)
    setAddForm({ name:'', phone:'', course_type:'4-wheeler', source:'phone', notes:'' })
    toast.success('Enquiry added · Follow-up set for tomorrow')
  }

  async function updateLead(id: string, updates: any) {
    const res = await fetch(`/api/leads/${id}`, {
      method:'PUT', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(updates),
    })
    const data = await res.json()
    if (!res.ok) { toast.error('Update failed'); return }
    setLeads(p => p.map(l => l.id === id ? data.data : l))
    if (selected?.id === id) setSelected(data.data)
    toast.success('Updated')
  }

  async function convertLeadToStudent() {
    if (!convertLead) return
    const amount = Number(convertForm.fee_amount)
    if (!amount || amount <= 0) {
      toast.error('Enter a valid fee amount')
      return
    }
    setConverting(true)
    try {
      const res = await fetch(`/api/leads/${convertLead.id}/convert`, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          fee_amount: amount,
          day_pref: convertForm.day_pref,
          preferred_time: convertForm.preferred_time,
        }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(payload.error || 'Conversion failed')
        return
      }
      setLeads(p => p.map(l => l.id === convertLead.id ? { ...l, status: 'enrolled', converted_student_id: payload.data?.id ?? l.converted_student_id } : l))
      setConvertLead(null)
      setConvertForm({ ...DEFAULT_CONVERT_FORM })
      if (payload.portal_url && navigator.clipboard) {
        navigator.clipboard.writeText(payload.portal_url)
      }
      toast.success('Lead converted · portal link copied')
    } catch {
      toast.error('Conversion failed')
    } finally {
      setConverting(false)
    }
  }

  const convRate = stats.total > 0 ? Math.round((stats.enrolled / stats.total) * 100) : 0

  return (
    <div className="p-4 md:p-6">
      <PageHeader title="Enquiries" subtitle={`${stats.total} total · ${convRate}% conversion`}
        action={<Button variant="primary" onClick={() => setShowAdd(true)}>+ Add enquiry</Button>} />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { label:'Total enquiries', value: stats.total, sub:'' },
          { label:'Conversion rate', value:`${convRate}%`, sub:`${stats.enrolled} enrolled` },
          { label:'Follow-ups today', value: stats.followUp, sub: followUpToday > 0 ? 'due today' : 'all clear' },
          { label:'Lost this month', value: stats.lost, sub:'' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-3">
            <p className="text-xs text-slate-400 mb-1">{s.label}</p>
            <p className="text-xl font-semibold text-slate-900">{s.value}</p>
            {s.sub && <p className="text-xs text-slate-400 mt-0.5">{s.sub}</p>}
          </div>
        ))}
      </div>

      {/* Pipeline columns */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {STATUSES.map(status => {
          const col = leads.filter(l => l.status === status)
          return (
            <div key={status}>
              <div className={`text-xs font-semibold px-3 py-1.5 rounded-t-lg ${statusColor[status]}`}>
                {status.charAt(0).toUpperCase() + status.slice(1)} ({col.length})
              </div>
              <div className="border border-slate-200 border-t-0 rounded-b-lg min-h-[120px] p-2 bg-white space-y-2">
                {col.length === 0 && <p className="text-xs text-slate-300 text-center py-4">—</p>}
                {col.map(lead => (
                  <div key={lead.id}
                    onClick={() => setSelected(lead)}
                    className="bg-white border border-slate-200 rounded-lg p-2.5 cursor-pointer hover:border-green-400 transition">
                    <p className="text-xs font-semibold text-slate-800 truncate">{lead.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{lead.phone}</p>
                    <p className="text-xs text-slate-400">{lead.course_type}</p>
                    {lead.follow_up_at && lead.follow_up_at === today && (
                      <p className="text-xs text-amber-600 mt-1 font-medium">Follow up today</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Lead detail side panel */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/30" onClick={() => setSelected(null)}>
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-xl overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <div>
                <p className="font-semibold text-slate-900">{selected.name}</p>
                <p className="text-sm text-slate-500">{selected.phone} · {selected.course_type}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600 text-xl w-8 h-8 flex items-center justify-center">×</button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Status</label>
                  <select value={selected.status}
                    onChange={e => { setSelected((l: any) => ({...l, status: e.target.value})); updateLead(selected.id, { status: e.target.value }) }}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white">
                    {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Follow-up date</label>
                  <input type="date" value={selected.follow_up_at ?? ''}
                    onChange={e => { setSelected((l: any) => ({...l, follow_up_at: e.target.value})); updateLead(selected.id, { follow_up_at: e.target.value }) }}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white" />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Source</label>
                <select value={selected.source}
                  onChange={e => { setSelected((l: any) => ({...l, source: e.target.value})); updateLead(selected.id, { source: e.target.value }) }}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white">
                  {['walk_in','phone','whatsapp','referral','facebook','other'].map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Notes</label>
                <textarea rows={3} value={selected.notes ?? ''}
                  onChange={e => setSelected((l: any) => ({...l, notes: e.target.value}))}
                  onBlur={() => updateLead(selected.id, { notes: selected.notes })}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white resize-none"
                  placeholder="Add notes about this enquiry…" />
              </div>
              <div className="text-xs text-slate-400">Added {formatDate(selected.created_at)}</div>
              {selected.status !== 'enrolled' && selected.status !== 'lost' && (
                <Button variant="primary" className="w-full justify-center"
                  onClick={() => {
                    setConvertLead(selected)
                    setSelected(null)
                  }}>
                  Enroll this student →
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add enquiry modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add new enquiry">
        <div className="space-y-3">
          <Input label="Name" value={addForm.name} onChange={e=>setAddForm(f=>({...f,name:e.target.value}))} placeholder="Enquirer's name" />
          <Input label="Phone" type="tel" maxLength={10} value={addForm.phone}
            onChange={e=>setAddForm(f=>({...f,phone:e.target.value.replace(/\D/g,'').slice(0,10)}))} placeholder="10-digit number" />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Course" value={addForm.course_type} onChange={e=>setAddForm(f=>({...f,course_type:e.target.value}))}>
              <option value="4-wheeler">4-wheeler</option>
              <option value="2-wheeler">2-wheeler</option>
              <option value="heavy">Heavy</option>
            </Select>
            <Select label="Source" value={addForm.source} onChange={e=>setAddForm(f=>({...f,source:e.target.value}))}>
              <option value="phone">Phone call</option>
              <option value="walk_in">Walk-in</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="referral">Referral</option>
              <option value="facebook">Facebook</option>
              <option value="other">Other</option>
            </Select>
          </div>
          <Input label="Notes (optional)" value={addForm.notes} onChange={e=>setAddForm(f=>({...f,notes:e.target.value}))} placeholder="e.g. Wants 7 AM slot, has LL already" />
          <div className="flex gap-2 pt-2">
            <Button variant="primary" loading={loading} onClick={addLead}
              disabled={!addForm.name||addForm.phone.length<10} className="flex-1 justify-center">
              Add enquiry
            </Button>
            <Button onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>

      {/* Convert lead modal */}
      {convertLead && (
        <Modal open onClose={() => {
          setConvertLead(null)
          setConvertForm({ ...DEFAULT_CONVERT_FORM })
        }} title="Enroll enquiry">
          <div className="space-y-3">
            <p className="text-sm text-slate-500">Creating student for {convertLead.name}</p>
            <Input label="Fee amount (₹)" type="number" value={convertForm.fee_amount}
              onChange={e => setConvertForm(f => ({ ...f, fee_amount: e.target.value }))}
              placeholder="e.g. 4500" />
            <Select label="Day preference" value={convertForm.day_pref}
              onChange={e => setConvertForm(f => ({ ...f, day_pref: e.target.value }))}>
              <option value="weekdays">Mon–Sat</option>
              <option value="weekends">Sat–Sun</option>
              <option value="all">Daily</option>
            </Select>
            <Select label="Preferred slot" value={convertForm.preferred_time}
              onChange={e => setConvertForm(f => ({ ...f, preferred_time: e.target.value }))}>
              {TIME_SLOTS.map(slot => (
                <option key={slot} value={slot}>{slot}</option>
              ))}
            </Select>
            <div className="flex gap-2">
              <Button variant="primary" loading={converting} onClick={convertLeadToStudent} className="flex-1 justify-center"
                disabled={converting || !convertForm.fee_amount}>
                {converting ? 'Converting…' : 'Enroll & copy portal link'}
              </Button>
              <Button onClick={() => {
                setConvertLead(null)
                setConvertForm({ ...DEFAULT_CONVERT_FORM })
              }}>Cancel</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
