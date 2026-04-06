import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { jobs, uploadedFiles } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { videoQueue } from '@/lib/queue/queues'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params

  const job = await db.select().from(jobs).where(eq(jobs.id, jobId)).get()
  if (!job || job.status !== 'failed')
    return NextResponse.json({ error: 'Job is not in a failed state' }, { status: 400 })

  const files = await db.select().from(uploadedFiles).where(eq(uploadedFiles.jobId, jobId))
  if (!files.length)
    return NextResponse.json(
      { error: 'Upload files are gone — please re-upload your videos' },
      { status: 400 }
    )

  // Reset the job back to queued
  await db.update(jobs).set({
    status: 'queued',
    progress: 0,
    progressPhase: 'queued',
    errorMessage: null,
    outputPath: null,
    completedAt: null,
  }).where(eq(jobs.id, jobId))

  // Re-enqueue with the same files and target duration
  await videoQueue.add('process', { jobId, files, targetDuration: job.targetDuration }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    timeout: 15 * 60 * 1000,
  })

  return NextResponse.json({ jobId, status: 'queued' })
}
