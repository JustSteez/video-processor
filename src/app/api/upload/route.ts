import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'
import { Readable } from 'stream'
import { pipeline } from 'stream/promises'
import { randomUUID } from 'crypto'
import { probeVideo } from '@/lib/ffmpeg/probe'
import { db } from '@/lib/db'
import { jobs, uploadedFiles } from '@/lib/db/schema'
import { connection } from '@/lib/queue/queues'

export const dynamic = 'force-dynamic'

// 20 uploads per IP per 10 minutes
const RATE_LIMIT = 20
const RATE_WINDOW = 60 * 10

async function checkRateLimit(ip: string): Promise<boolean> {
  const key = `upload_rl:${ip}`
  const count = await connection.incr(key)
  if (count === 1) await connection.expire(key, RATE_WINDOW)
  return count <= RATE_LIMIT
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  const allowed = await checkRateLimit(ip)
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many uploads. Please wait a few minutes.' },
      { status: 429 }
    )
  }

  const jobId = randomUUID()
  const uploadDir = path.join(process.cwd(), 'storage/uploads', jobId)
  fs.mkdirSync(uploadDir, { recursive: true })

  try {
    const formData = await req.formData()
    const files = formData.getAll('videos') as File[]

    if (files.length < 2 || files.length > 20) {
      return NextResponse.json({ error: 'Upload 2 to 20 video files.' }, { status: 400 })
    }

    // Create job record
    await db.insert(jobs).values({
      id: jobId,
      status: 'uploading',
      targetDuration: 0,
      progress: 0,
      progressPhase: 'uploading',
      createdAt: new Date(),
    })

    const fileMeta = []

    for (const file of files) {
      const fileId = randomUUID()
      const ext = path.extname(file.name) || '.mp4'
      const filePath = path.join(uploadDir, `${fileId}${ext}`)

      // Stream file to disk (avoids loading entire video into memory)
      const nodeStream = Readable.fromWeb(file.stream() as any)
      const writeStream = fs.createWriteStream(filePath)
      await pipeline(nodeStream, writeStream)

      const meta = await probeVideo(filePath)

      await db.insert(uploadedFiles).values({
        id: fileId,
        jobId,
        path: filePath,
        filename: file.name,
        duration: meta.duration,
        size: file.size,
      })

      fileMeta.push({
        id: fileId,
        path: filePath,
        filename: file.name,
        duration: meta.duration,
        size: file.size,
      })
    }

    return NextResponse.json({ jobId, files: fileMeta })
  } catch (err: any) {
    fs.rmSync(uploadDir, { recursive: true, force: true })
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
