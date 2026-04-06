import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { jobs } from '@/lib/db/schema'
import { lt, or, eq } from 'drizzle-orm'
import fs from 'fs'
import path from 'path'

// Delete output files for jobs older than 24 hours
// Called by a cron job: GET /api/cleanup with Authorization header
const MAX_AGE_MS = 24 * 60 * 60 * 1000

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CLEANUP_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const cutoff = new Date(Date.now() - MAX_AGE_MS)

  const old = await db.select({ id: jobs.id, outputPath: jobs.outputPath })
    .from(jobs)
    .where(lt(jobs.createdAt, cutoff))

  let deleted = 0
  for (const job of old) {
    // Remove output file
    if (job.outputPath) {
      try { fs.rmSync(path.dirname(job.outputPath), { recursive: true, force: true }) } catch {}
    }
    // Remove any leftover upload/clips dirs
    const base = path.join(process.cwd(), 'storage')
    for (const sub of ['uploads', 'clips', 'output']) {
      try { fs.rmSync(path.join(base, sub, job.id), { recursive: true, force: true }) } catch {}
    }
    deleted++
  }

  return NextResponse.json({ deleted })
}
