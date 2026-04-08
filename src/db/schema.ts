import {
  pgTable, uuid, text, boolean, integer,
  timestamp, date, decimal, jsonb, pgEnum, time
} from 'drizzle-orm/pg-core'

export const userRoleEnum       = pgEnum('user_role',       ['admin', 'instructor'])
export const courseTypeEnum     = pgEnum('course_type',     ['2-wheeler', '4-wheeler', 'heavy'])
export const studentStatusEnum  = pgEnum('student_status',  ['enrolled', 'active', 'completed', 'on_hold', 'dropped'])
export const batchStatusEnum    = pgEnum('batch_status',    ['active', 'completed', 'cancelled'])
export const dayPrefEnum        = pgEnum('day_pref',        ['weekdays', 'weekends', 'all'])
export const attendanceEnum     = pgEnum('attendance',      ['present', 'absent', 'holiday'])
export const vehicleStatusEnum  = pgEnum('vehicle_status',  ['available', 'in_session', 'service_due', 'under_repair'])
export const feeStatusEnum      = pgEnum('fee_status',      ['unpaid', 'partial', 'paid'])
export const rtoTestStatusEnum  = pgEnum('rto_test_status', ['not_scheduled', 'scheduled', 'passed', 'failed'])
export const leadStatusEnum     = pgEnum('lead_status',     ['new', 'called', 'interested', 'enrolled', 'lost'])
export const leadSourceEnum     = pgEnum('lead_source',     ['walk_in', 'phone', 'whatsapp', 'referral', 'facebook', 'other'])
export const paymentModeEnum    = pgEnum('payment_mode',    ['upi', 'cash', 'card', 'bank_transfer'])

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

export const school_settings = pgTable('school_settings', {
  id:                   uuid('id').primaryKey().defaultRandom(),
  school_id:            uuid('school_id').references(() => schools.id).notNull().unique(),
  upi_id:               text('upi_id'),
  upi_qr_url:           text('upi_qr_url'),
  telegram_chat_id:     text('telegram_chat_id'),      // Telegram user ID once linked
  telegram_verify_code: text('telegram_verify_code'),  // Temporary 6-digit pairing code
  updated_at:           timestamp('updated_at').notNull().defaultNow(),
})

export const users = pgTable('users', {
  id:            uuid('id').primaryKey().defaultRandom(),
  school_id:     uuid('school_id').references(() => schools.id).notNull(),
  name:          text('name').notNull(),
  phone:         text('phone').notNull().unique(),
  password_hash: text('password_hash'),
  role:          userRoleEnum('role').notNull(),
  is_active:     boolean('is_active').notNull().default(true),
  created_at:    timestamp('created_at').notNull().defaultNow(),
})

export const batches = pgTable('batches', {
  id:             uuid('id').primaryKey().defaultRandom(),
  school_id:      uuid('school_id').references(() => schools.id).notNull(),
  instructor_id:  uuid('instructor_id').references(() => users.id).notNull(),
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

export const vehicles = pgTable('vehicles', {
  id:               uuid('id').primaryKey().defaultRandom(),
  school_id:        uuid('school_id').references(() => schools.id).notNull(),
  registration_no:  text('registration_no').notNull().unique(),
  make_model:       text('make_model').notNull(),
  type:             courseTypeEnum('type').notNull(),
  status:           vehicleStatusEnum('status').notNull().default('available'),
  service_due_date: date('service_due_date'),
})

export const sessions = pgTable('sessions', {
  id:           uuid('id').primaryKey().defaultRandom(),
  batch_id:     uuid('batch_id').references(() => batches.id).notNull(),
  session_date: date('session_date').notNull(),
  session_num:  integer('session_num').notNull(),
  vehicle_id:   uuid('vehicle_id').references(() => vehicles.id),
  notes:        text('notes'),
  created_at:   timestamp('created_at').notNull().defaultNow(),
})

export const attendance = pgTable('attendance', {
  id:           uuid('id').primaryKey().defaultRandom(),
  session_id:   uuid('session_id').references(() => sessions.id).notNull(),
  student_id:   uuid('student_id').references(() => students.id).notNull(),
  status:       attendanceEnum('status').notNull().default('present'),
  skill_scores: jsonb('skill_scores').default({}),
  notes:        text('notes'),
  marked_at:    timestamp('marked_at').notNull().defaultNow(),
})

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

export const fees = pgTable('fees', {
  id:             uuid('id').primaryKey().defaultRandom(),
  student_id:     uuid('student_id').references(() => students.id).notNull().unique(),
  total_amount:   decimal('total_amount', { precision: 10, scale: 2 }).notNull(),
  paid_amount:    decimal('paid_amount',  { precision: 10, scale: 2 }).notNull().default('0'),
  payment_status: feeStatusEnum('payment_status').notNull().default('unpaid'),
})

export const fee_payments = pgTable('fee_payments', {
  id:             uuid('id').primaryKey().defaultRandom(),
  student_id:     uuid('student_id').references(() => students.id).notNull(),
  amount:         decimal('amount', { precision: 10, scale: 2 }).notNull(),
  payment_mode:   paymentModeEnum('payment_mode').notNull().default('upi'),
  receipt_number: text('receipt_number').notNull().unique(),
  admin_note:     text('admin_note'),
  confirmed_by:   uuid('confirmed_by').references(() => users.id),
  is_confirmed:   boolean('is_confirmed').notNull().default(false),
  paid_at:        timestamp('paid_at').notNull().defaultNow(),
})

export const leads = pgTable('leads', {
  id:                   uuid('id').primaryKey().defaultRandom(),
  school_id:            uuid('school_id').references(() => schools.id).notNull(),
  name:                 text('name').notNull(),
  phone:                text('phone').notNull(),
  course_type:          courseTypeEnum('course_type').notNull().default('4-wheeler'),
  source:               leadSourceEnum('source').notNull().default('phone'),
  status:               leadStatusEnum('status').notNull().default('new'),
  notes:                text('notes'),
  follow_up_at:         date('follow_up_at'),
  converted_student_id: uuid('converted_student_id').references(() => students.id),
  created_at:           timestamp('created_at').notNull().defaultNow(),
  updated_at:           timestamp('updated_at').notNull().defaultNow(),
})

export const certificates = pgTable('certificates', {
  id:                 uuid('id').primaryKey().defaultRandom(),
  student_id:         uuid('student_id').references(() => students.id).notNull().unique(),
  certificate_number: text('certificate_number').notNull().unique(),
  issued_date:        date('issued_date').notNull(),
  pdf_url:            text('pdf_url'),
})

export const notifications = pgTable('notifications', {
  id:         uuid('id').primaryKey().defaultRandom(),
  student_id: uuid('student_id').references(() => students.id).notNull(),
  channel:    text('channel').notNull(),
  type:       text('type').notNull(),
  message:    text('message').notNull(),
  sent_at:    timestamp('sent_at').notNull().defaultNow(),
  status:     text('status').notNull().default('sent'),
})
