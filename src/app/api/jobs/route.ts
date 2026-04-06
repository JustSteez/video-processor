import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { jobs, uploadedFiles } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { videoQueue } from '@/lib/queue/queues'

export async function POST(req: NextRequest) {
  const { jobId, targetDuration } = await req.json()

  if (!jobId || !targetDuration || targetDuration < 5)
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 })

  await db.update(jobs)
    .set({ targetDuration, status: 'queued' })
    .where(eq(jobs.id, jobId))

  const files = await db.select()
    .from(uploadedFiles)
    .where(eq(uploadedFiles.jobId, jobId))

  if (!files.length)
    return NextResponse.json({ error: 'No files found' }, { status: 400 })

  await videoQueue.add('process', { jobId, files, targetDuration }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    timeout: 15 * 60 * 1000,   // fail job if it runs > 15 minutes
  })

  return NextResponse.json({ jobId, status: 'queued' })
}
