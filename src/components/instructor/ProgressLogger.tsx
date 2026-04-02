'use client'
import { useState } from 'react'
import { Card, Button, Avatar, Badge, Select } from '@/components/ui'
import PageHeader from '@/components/shared/PageHeader'
import { COURSE_SKILLS } from '@/lib/course/config'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'

interface Props {
  students: any[]
  sessions: any[]
  batches: any[]
  attendanceLogs: any[]
  instructorId: string
}

export default function ProgressLogger({ students, sessions, batches, attendanceLogs, instructorId }: Props) {
  const [selected,        setSelected]   = useState<string | null>(null)
  const [selectedSession, setSession]    = useState('')
  const [scores,          setScores]     = useState<Record<string, number>>({})
  const [notes,           setNotes]      = useState('')
  const [loading,         setLoading]    = useState(false)

  const student     = students.find(s => s.id === selected)
  const skills      = COURSE_SKILLS[student?.course_type ?? '4-wheeler'] ?? []
  const batch       = student ? batches.find(b => b.id === student.batch_id) : null
  const stuSessions = sessions.filter(s => s.batch_id === student?.batch_id)

  function selectStudent(id: string) {
    setSelected(id); setScores({}); setNotes(''); setSession('')
  }

  function getLatestSkills(studentId: string) {
    const logs = attendanceLogs
      .filter(a => a.student_id === studentId && a.skill_scores && Object.keys(a.skill_scores as object).length > 0)
      .sort((a, b) => new Date(b.marked_at).getTime() - new Date(a.marked_at).getTime())
    return (logs[0]?.skill_scores ?? {}) as Record<string, number>
  }

  async function save() {
    if (!selected || !selectedSession) { toast.error('Select a session first'); return }
    setLoading(true)
    const res = await fetch(`/api/sessions/${selectedSession}/attendance`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        records: [{ student_id: selected, status: 'present', skill_scores: scores, notes }]
      }),
    })
    setLoading(false)
    if (!res.ok) { toast.error('Failed to save'); return }
    toast.success(`Skills saved for ${student?.name}`)
    setScores({}); setNotes(''); setSession('')
  }

  return (
    <div className="p-4 md:p-6">
      <PageHeader title="Progress & skills" subtitle="Log skill assessments after sessions" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Student list */}
        <Card className="p-4 overflow-y-auto max-h-[60vh]">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">My students</p>
          {students.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">No students in your batches</p>
          )}
          <div className="space-y-1.5">
            {students.map(s => {
              const latestSkills = getLatestSkills(s.id)
              const hasSkills = Object.keys(latestSkills).length > 0
              return (
                <button key={s.id} onClick={() => selectStudent(s.id)}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition border ${
                    selected === s.id ? 'bg-emerald-50 border-emerald-200' : 'hover:bg-gray-50 border-transparent'
                  }`}>
                  <Avatar name={s.name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{s.name}</p>
                    <p className="text-xs text-gray-400">{s.course_type}</p>
                  </div>
                  {hasSkills && <Badge variant="blue">Scored</Badge>}
                </button>
              )
            })}
          </div>
        </Card>

        {/* Skill form */}
        <div className="lg:col-span-2">
          {!student ? (
            <Card className="p-10 text-center text-gray-400">
              <p className="text-2xl mb-2">📝</p>
              <p>Select a student to log their skills</p>
            </Card>
          ) : (
            <Card className="p-4 md:p-5">
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-50">
                <Avatar name={student.name} />
                <div>
                  <p className="font-semibold text-gray-800">{student.name}</p>
                  <p className="text-xs text-gray-400">{student.course_type} · {batch?.name}</p>
                </div>
              </div>

              <Select label="Session" value={selectedSession}
                onChange={e => setSession(e.target.value)} className="mb-4">
                <option value="">— Pick a session to score —</option>
                {stuSessions.map(s => (
                  <option key={s.id} value={s.id}>
                    Session {s.session_num} — {formatDate(s.session_date)}
                  </option>
                ))}
              </Select>

              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Skill scores (1 = beginner · 5 = excellent)
              </p>
              <div className="space-y-3 mb-4">
                {skills.map(skill => (
                  <div key={skill} className="flex items-center gap-2">
                    <span className="text-xs text-gray-700 w-32 flex-shrink-0">{skill}</span>
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4, 5].map(n => (
                        <button key={n}
                          onClick={() => setScores(s => ({ ...s, [skill]: n }))}
                          className={`w-8 h-8 rounded-lg text-xs font-medium border transition active:scale-95 ${
                            (scores[skill] ?? 0) >= n
                              ? 'bg-emerald-500 text-white border-emerald-500'
                              : 'bg-white text-gray-400 border-gray-200 hover:border-emerald-300'
                          }`}>
                          {n}
                        </button>
                      ))}
                    </div>
                    <span className="text-xs text-gray-400 ml-auto">{scores[skill] ? `${scores[skill]}/5` : '—'}</span>
                  </div>
                ))}
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                  placeholder="e.g. Good gear control, needs more parking practice"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
              </div>

              <Button variant="primary" loading={loading} onClick={save}
                disabled={!selectedSession || Object.keys(scores).length === 0}
                className="w-full justify-center">
                Save skill scores
              </Button>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
