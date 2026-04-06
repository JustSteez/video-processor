import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { jobs } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params
  const job = await db.select().from(jobs).where(eq(jobs.id, jobId)).get()
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(job)
}
