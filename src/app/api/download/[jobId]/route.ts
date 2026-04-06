import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { jobs } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import fs from 'fs'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params
  const job = await db.select().from(jobs).where(eq(jobs.id, jobId)).get()

  if (!job || job.status !== 'complete' || !job.outputPath)
    return NextResponse.json({ error: 'File not ready' }, { status: 404 })

  if (!fs.existsSync(job.outputPath))
    return NextResponse.json({ error: 'File missing' }, { status: 404 })

  const stat = fs.statSync(job.outputPath)
  const fileStream = fs.createReadStream(job.outputPath)

  return new Response(fileStream as any, {
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Length': String(stat.size),
      'Content-Disposition': `attachment; filename="output.mp4"`,
    },
  })
}
