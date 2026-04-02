// ── Enums ──────────────────────────────────────────────────────────────────

export type UserRole       = 'admin' | 'instructor'
export type CourseType     = '2-wheeler' | '4-wheeler' | 'heavy'
export type StudentStatus  = 'enrolled' | 'active' | 'completed' | 'on_hold' | 'dropped'
export type BatchStatus    = 'active' | 'completed' | 'cancelled'
export type DayPref        = 'weekdays' | 'weekends' | 'all'
export type AttendanceStatus = 'present' | 'absent' | 'holiday'
export type VehicleStatus  = 'available' | 'in_session' | 'service_due' | 'under_repair'
export type FeeStatus      = 'unpaid' | 'partial' | 'paid'
export type RtoTestStatus  = 'not_scheduled' | 'scheduled' | 'passed' | 'failed'

// ── Core entities ──────────────────────────────────────────────────────────

export interface City {
  id: string; name: string; state: string
  rto_office_name: string; rto_office_address: string
}

export interface School {
  id: string; city_id: string; name: string; address: string
  phone: string; email: string; gst_number?: string
  is_active: boolean; created_at: string
}

export interface User {
  id: string; school_id: string; name: string; phone: string
  password_hash?: string; role: UserRole
  is_active: boolean; created_at: string
}

export interface Batch {
  id: string; school_id: string; instructor_id: string; vehicle_id: string
  name: string; slot_time: string; day_pref: DayPref; course_type: CourseType
  start_date: string; total_sessions: number; max_students: number
  status: BatchStatus; created_at: string
}

export interface Student {
  id: string; school_id: string; batch_id?: string | null
  name: string; phone: string; portal_token: string
  course_type: CourseType; day_pref: DayPref; preferred_time?: string
  status: StudentStatus; enrolled_at: string
}

export interface Vehicle {
  id: string; school_id: string; registration_no: string
  make_model: string; type: CourseType; status: VehicleStatus
  service_due_date?: string
}

export interface Session {
  id: string; batch_id: string; session_date: string
  session_num: number; notes?: string; created_at: string
}

export interface Attendance {
  id: string; session_id: string; student_id: string
  status: AttendanceStatus; skill_scores?: Record<string, number>
  notes?: string; marked_at: string
}

export interface RtoRecord {
  id: string; student_id: string
  ll_number?: string; ll_issued_date?: string; ll_expiry_date?: string
  test_date?: string; test_venue?: string; test_status: RtoTestStatus
  dl_issued_date?: string; dl_number?: string
}

export interface Fee {
  id: string; student_id: string
  total_amount: number; paid_amount: number
  payment_status: FeeStatus; razorpay_order_id?: string; paid_at?: string
}

export interface Certificate {
  id: string; student_id: string; certificate_number: string
  issued_date: string; pdf_url?: string
}

// ── API wrappers ───────────────────────────────────────────────────────────

export interface ApiResponse<T>      { data: T; message?: string }
export interface ApiError            { error: string; code?: string }
export interface AuthPayload {
  sub: string; school_id: string; role: UserRole; iat: number; exp: number
}
