import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

const pool = new Pool({ connectionString: process.env.DATABASE_URL! })
const db   = drizzle(pool, { schema })

// Same hash as /lib/auth/password.ts — SHA-256(password + JWT_SECRET)
async function hashPassword(password: string): Promise<string> {
  const salt = process.env.JWT_SECRET ?? 'dev-salt-change-in-prod'
  const data = new TextEncoder().encode(password + salt)
  const buf  = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function seed() {
  console.log('🌱 Seeding database...')

  const [city] = await db.insert(schema.cities).values({
    name: 'Coimbatore', state: 'Tamil Nadu',
    rto_office_name:    'RTO Coimbatore',
    rto_office_address: 'Avinashi Road, Coimbatore - 641014',
  }).returning()

  const [school] = await db.insert(schema.schools).values({
    city_id: city.id,
    name:    'Sri Lakshmi Driving School',
    address: 'RS Puram, Coimbatore - 641002',
    phone:   '9876543210',
    email:   'srilakshmi@example.com',
  }).returning()

  const adminHash      = await hashPassword('admin123')
  const instructorHash = await hashPassword('instructor123')

  const [admin] = await db.insert(schema.users).values({
    school_id: school.id, name: 'Ravi Kumar',
    phone: '9876543211', password_hash: adminHash, role: 'admin',
  }).returning()

  const [instructor] = await db.insert(schema.users).values({
    school_id: school.id, name: 'KM Rajendran',
    phone: '9876543212', password_hash: instructorHash, role: 'instructor',
  }).returning()

  const [vehicle] = await db.insert(schema.vehicles).values({
    school_id: school.id, registration_no: 'TN-33-AB-1234',
    make_model: 'Maruti Swift', type: '4-wheeler', status: 'available',
  }).returning()

  const [batch] = await db.insert(schema.batches).values({
    school_id:      school.id,
    instructor_id:  instructor.id,
    vehicle_id:     vehicle.id,
    name:           '7 AM Weekday Batch – Swift',
    slot_time:      '07:00:00',
    day_pref:       'weekdays',
    course_type:    '4-wheeler',
    start_date:     new Date().toISOString().split('T')[0],
    total_sessions: 22,
    max_students:   4,
    status:         'active',
  }).returning()

  const [student] = await db.insert(schema.students).values({
    school_id:      school.id,
    batch_id:       batch.id,
    name:           'Priya Krishnan',
    phone:          '9876543220',
    portal_token:   'demo-priya-k',
    course_type:    '4-wheeler',
    day_pref:       'weekdays',
    preferred_time: '07:00',
    status:         'active',
  }).returning()

  await db.insert(schema.rto_records).values({ student_id: student.id } as any)
  await db.insert(schema.fees).values({
    student_id: student.id, total_amount: '4500',
    paid_amount: '0', payment_status: 'unpaid',
  })

  console.log('✅ Seed complete!')
  console.log('')
  console.log('   School:     ' + school.name)
  console.log('   City:       Coimbatore, Tamil Nadu')
  console.log('')
  console.log('🔑 Login credentials:')
  console.log('   Admin      → phone: 9876543211 | password: admin123')
  console.log('   Instructor → phone: 9876543212 | password: instructor123')
  console.log('')
  console.log('📱 Student portal: /s/demo-priya-k')
  console.log('')
  await pool.end()
}

seed().catch(err => { console.error(err); process.exit(1) })
