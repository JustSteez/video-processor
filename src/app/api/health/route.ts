import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { jobs } from '@/lib/db/schema'
import { sql } from 'drizzle-orm'

export async function GET() {
  try {
    // Verify DB is reachable
    db.select({ count: sql<number>`count(*)` }).from(jobs).get()
    return NextResponse.json({ status: 'ok' })
  } catch {
    return NextResponse.json({ status: 'error' }, { status: 503 })
  }
}
