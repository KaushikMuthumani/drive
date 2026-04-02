import {
  pgTable, uuid, text, boolean, integer,
  timestamp, date, decimal, jsonb, pgEnum, time
} from 'drizzle-orm/pg-core'

// ── Enums ────────────────────────────────────────────────────────────────────

export const userRoleEnum       = pgEnum('user_role',       ['admin', 'instructor'])
export const courseTypeEnum     = pgEnum('course_type',     ['2-wheeler', '4-wheeler', 'heavy'])
export const studentStatusEnum  = pgEnum('student_status',  ['enrolled', 'active', 'completed', 'on_hold', 'dropped'])
export const batchStatusEnum    = pgEnum('batch_status',    ['active', 'completed', 'cancelled'])
export const dayPrefEnum        = pgEnum('day_pref',        ['weekdays', 'weekends', 'all'])
export const attendanceEnum     = pgEnum('attendance',      ['present', 'absent', 'holiday'])
export const vehicleStatusEnum  = pgEnum('vehicle_status',  ['available', 'in_session', 'service_due', 'under_repair'])
export const feeStatusEnum      = pgEnum('fee_status',      ['unpaid', 'partial', 'paid'])
export const rtoTestStatusEnum  = pgEnum('rto_test_status', ['not_scheduled', 'scheduled', 'passed', 'failed'])

// ── Core entities ─────────────────────────────────────────────────────────────

export const cities = pgTable('cities', {
  id:                 uuid('id').primaryKey().defaultRandom(),
  name:               text('name').notNull(),
  state:              text('state').notNull(),
  rto_office_name:    text('rto_office_name').notNull(),
  rto_office_address: text('rto_office_address').notNull(),
})

export const schools = pgTable('schools', {
  id:         uuid('id').primaryKey().defaultRandom(),
  city_id:    uuid('city_id').references(() => cities.id).notNull(),
  name:       text('name').notNull(),
  address:    text('address').notNull(),
  phone:      text('phone').notNull().unique(),
  email:      text('email').notNull().unique(),
  gst_number: text('gst_number'),
  is_active:  boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').notNull().defaultNow(),
})

export const users = pgTable('users', {
  id:            uuid('id').primaryKey().defaultRandom(),
  school_id:     uuid('school_id').references(() => schools.id).notNull(),
  name:          text('name').notNull(),
  phone:         text('phone').notNull().unique(),
  password_hash: text('password_hash'),   // nullable — OTP users have no password
  role:          userRoleEnum('role').notNull(),
  is_active:     boolean('is_active').notNull().default(true),
  created_at:    timestamp('created_at').notNull().defaultNow(),
})

// ── Batches ───────────────────────────────────────────────────────────────────

export const batches = pgTable('batches', {
  id:             uuid('id').primaryKey().defaultRandom(),
  school_id:      uuid('school_id').references(() => schools.id).notNull(),
  instructor_id:  uuid('instructor_id').references(() => users.id).notNull(),
  vehicle_id:     uuid('vehicle_id').references(() => vehicles.id).notNull(),
  name:           text('name').notNull(),
  slot_time:      time('slot_time').notNull(),
  day_pref:       dayPrefEnum('day_pref').notNull(),
  course_type:    courseTypeEnum('course_type').notNull(),
  start_date:     date('start_date').notNull(),
  total_sessions: integer('total_sessions').notNull(),
  max_students:   integer('max_students').notNull().default(4),
  status:         batchStatusEnum('status').notNull().default('active'),
  created_at:     timestamp('created_at').notNull().defaultNow(),
})

// ── Students ──────────────────────────────────────────────────────────────────

export const students = pgTable('students', {
  id:             uuid('id').primaryKey().defaultRandom(),
  school_id:      uuid('school_id').references(() => schools.id).notNull(),
  batch_id:       uuid('batch_id').references(() => batches.id),
  name:           text('name').notNull(),
  phone:          text('phone').notNull(),
  portal_token:   text('portal_token').notNull().unique(),
  course_type:    courseTypeEnum('course_type').notNull(),
  day_pref:       dayPrefEnum('day_pref').notNull().default('weekdays'),
  preferred_time: text('preferred_time'),
  status:         studentStatusEnum('status').notNull().default('enrolled'),
  enrolled_at:    timestamp('enrolled_at').notNull().defaultNow(),
})

// ── Vehicles ──────────────────────────────────────────────────────────────────

export const vehicles = pgTable('vehicles', {
  id:               uuid('id').primaryKey().defaultRandom(),
  school_id:        uuid('school_id').references(() => schools.id).notNull(),
  registration_no:  text('registration_no').notNull().unique(),
  make_model:       text('make_model').notNull(),
  type:             courseTypeEnum('type').notNull(),
  status:           vehicleStatusEnum('status').notNull().default('available'),
  service_due_date: date('service_due_date'),
})

// ── Sessions ──────────────────────────────────────────────────────────────────

export const sessions = pgTable('sessions', {
  id:           uuid('id').primaryKey().defaultRandom(),
  batch_id:     uuid('batch_id').references(() => batches.id).notNull(),
  session_date: date('session_date').notNull(),
  session_num:  integer('session_num').notNull(),
  notes:        text('notes'),
  created_at:   timestamp('created_at').notNull().defaultNow(),
})

// ── Attendance ────────────────────────────────────────────────────────────────

export const attendance = pgTable('attendance', {
  id:           uuid('id').primaryKey().defaultRandom(),
  session_id:   uuid('session_id').references(() => sessions.id).notNull(),
  student_id:   uuid('student_id').references(() => students.id).notNull(),
  status:       attendanceEnum('status').notNull().default('present'),
  skill_scores: jsonb('skill_scores').default({}),
  notes:        text('notes'),
  marked_at:    timestamp('marked_at').notNull().defaultNow(),
})

// ── RTO records ───────────────────────────────────────────────────────────────

export const rto_records = pgTable('rto_records', {
  id:             uuid('id').primaryKey().defaultRandom(),
  student_id:     uuid('student_id').references(() => students.id).notNull().unique(),
  ll_number:      text('ll_number'),
  ll_issued_date: date('ll_issued_date'),
  ll_expiry_date: date('ll_expiry_date'),
  test_date:      date('test_date'),
  test_venue:     text('test_venue'),
  test_status:    rtoTestStatusEnum('test_status').notNull().default('not_scheduled'),
  dl_issued_date: date('dl_issued_date'),
  dl_number:      text('dl_number'),
})

// ── Fees ──────────────────────────────────────────────────────────────────────

export const fees = pgTable('fees', {
  id:                uuid('id').primaryKey().defaultRandom(),
  student_id:        uuid('student_id').references(() => students.id).notNull().unique(),
  total_amount:      decimal('total_amount', { precision: 10, scale: 2 }).notNull(),
  paid_amount:       decimal('paid_amount',  { precision: 10, scale: 2 }).notNull().default('0'),
  payment_status:    feeStatusEnum('payment_status').notNull().default('unpaid'),
  razorpay_order_id: text('razorpay_order_id'),
  paid_at:           timestamp('paid_at'),
})

// ── Certificates ──────────────────────────────────────────────────────────────

export const certificates = pgTable('certificates', {
  id:                 uuid('id').primaryKey().defaultRandom(),
  student_id:         uuid('student_id').references(() => students.id).notNull().unique(),
  certificate_number: text('certificate_number').notNull().unique(),
  issued_date:        date('issued_date').notNull(),
  pdf_url:            text('pdf_url'),
})

// ── Notifications ─────────────────────────────────────────────────────────────

export const notifications = pgTable('notifications', {
  id:         uuid('id').primaryKey().defaultRandom(),
  student_id: uuid('student_id').references(() => students.id).notNull(),
  channel:    text('channel').notNull(),
  type:       text('type').notNull(),
  message:    text('message').notNull(),
  sent_at:    timestamp('sent_at').notNull().defaultNow(),
  status:     text('status').notNull().default('sent'),
})
