import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { attendance } from '@/db/schema'

// Progress is now tracked via attendance skill_scores
// GET returns all attendance records with skill data for this student
export async function GET(_: NextRequest, { params }: { params: { studentId: string } }) {
  const records = await db.select().from(attendance)
    .where(eq(attendance.student_id, params.studentId))
    .orderBy(attendance.marked_at)
  return NextResponse.json({ data: records })
}
