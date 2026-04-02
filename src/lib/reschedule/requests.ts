import { sql } from 'drizzle-orm'
import { db } from '@/lib/db/client'

export async function ensureRescheduleRequestsTable() {
  await db.execute(sql`
    create table if not exists reschedule_requests (
      id uuid primary key default gen_random_uuid(),
      school_id uuid not null references schools(id) on delete cascade,
      batch_id uuid references batches(id) on delete set null,
      student_id uuid not null references students(id) on delete cascade,
      instructor_id uuid references users(id) on delete set null,
      requested_date date,
      requested_time text,
      reason text not null,
      status text not null default 'pending',
      instructor_note text,
      approved_date date,
      approved_time text,
      created_at timestamp not null default now(),
      updated_at timestamp not null default now()
    )
  `)
}

export async function listRescheduleRequests(whereClause?: ReturnType<typeof sql>) {
  const query = whereClause
    ? sql`
        select rr.*, s.name as student_name, s.phone as student_phone,
               b.name as batch_name, u.name as instructor_name
        from reschedule_requests rr
        join students s on s.id = rr.student_id
        left join batches b on b.id = rr.batch_id
        left join users u on u.id = rr.instructor_id
        ${whereClause}
        order by
          case
            when rr.status = 'pending' then 0
            when rr.status = 'approved' then 1
            else 2
          end,
          rr.updated_at desc,
          rr.created_at desc
      `
    : sql`
        select rr.*, s.name as student_name, s.phone as student_phone,
               b.name as batch_name, u.name as instructor_name
        from reschedule_requests rr
        join students s on s.id = rr.student_id
        left join batches b on b.id = rr.batch_id
        left join users u on u.id = rr.instructor_id
        order by
          case
            when rr.status = 'pending' then 0
            when rr.status = 'approved' then 1
            else 2
          end,
          rr.updated_at desc,
          rr.created_at desc
      `

  const result = await db.execute(query)
  return result.rows
}
