// Indian driving school standards (Central Motor Vehicles Rules 1989)
export const COURSE_SESSIONS: Record<string, number> = {
  '2-wheeler': 12,   // ~12 sessions, 30 min each
  '4-wheeler': 22,   // ~22 sessions, 1 hr each  
  'heavy':     30,   // heavy vehicle, 30 sessions
}

export const COURSE_SKILLS: Record<string, string[]> = {
  '2-wheeler': ['Vehicle controls', 'Balancing', 'Starting & stopping', 'Gear shifting', 'Turning', 'Traffic awareness', 'Parking'],
  '4-wheeler': ['Vehicle controls', 'Starting & stopping', 'Gear shifting', 'Steering control', 'Reversing', 'Parking', 'Hill start', 'Highway driving'],
  'heavy':     ['Vehicle controls', 'Starting & stopping', 'Gear shifting', 'Reversing', 'Wide turns', 'Loading manoeuvres', 'Hill driving'],
}

// Time slots used by Indian driving schools
export const TIME_SLOTS = [
  '05:30', '06:00', '06:30', '07:00', '07:30', '08:00', '08:30',
  '09:00', '09:30', '10:00', '10:30', '11:00',
  '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00',
]

export function formatSlotTime(t: string): string {
  const [h, m] = t.split(':').map(Number)
  const ampm = h < 12 ? 'AM' : 'PM'
  const h12  = h % 12 || 12
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`
}

export function generatePortalToken(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

export function getDayLabel(pref: string): string {
  return { weekdays: 'Mon–Sat', weekends: 'Sat–Sun', all: 'Daily' }[pref] ?? pref
}

// Generate all session dates for a batch from start_date
export function generateSessionDates(
  startDate: string,
  dayPref: 'weekdays' | 'weekends' | 'all',
  totalSessions: number
): string[] {
  const dates: string[] = []
  const current = new Date(startDate)
  while (dates.length < totalSessions) {
    const dow = current.getDay() // 0=Sun, 6=Sat
    const isWeekday = dow >= 1 && dow <= 6
    const isWeekend = dow === 0 || dow === 6
    if (
      dayPref === 'all' ||
      (dayPref === 'weekdays' && isWeekday) ||
      (dayPref === 'weekends' && isWeekend)
    ) {
      dates.push(current.toISOString().split('T')[0])
    }
    current.setDate(current.getDate() + 1)
  }
  return dates
}
