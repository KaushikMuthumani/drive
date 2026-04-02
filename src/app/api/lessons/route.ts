import { NextResponse } from 'next/server'
// Lessons are now managed as batch sessions.
// Use /api/batches and /api/sessions/[id]/attendance instead.
export async function GET()  { return NextResponse.json({ data: [], message: 'Use /api/batches for scheduling' }) }
export async function POST() { return NextResponse.json({ error: 'Use /api/batches to create sessions' }, { status: 400 }) }
