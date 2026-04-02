import { NextResponse } from 'next/server'
export async function PATCH() { return NextResponse.json({ error: 'Use /api/sessions/[id]/attendance' }, { status: 400 }) }
