import { Worker, Job } from 'bullmq'
import { connection } from './queues'
import { splitVideo } from '@/lib/ffmpeg/splitter'
import { mergeClips } from '@/lib/ffmpeg/merger'
import { selectClips } from '@/lib/utils/clipSelector'
import { db } from '@/lib/db'
import { jobs } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import path from 'path'
import fs from 'fs'
import type { VideoFile } from '@/types'

async function setProgress(jobId: string, phase: string, percent: number) {
  await db.update(jobs)
    .set({ status: phase, progress: percent, progressPhase: phase })
    .where(eq(jobs.id, jobId))
}

function cleanup(jobId: string, includeUploads: boolean) {
  const clipsDir = path.join(process.cwd(), 'storage/clips', jobId)
  const uploadsDir = path.join(process.cwd(), 'storage/uploads', jobId)
  try { fs.rmSync(clipsDir, { recursive: true, force: true }) } catch {}
  if (includeUploads) {
    try { fs.rmSync(uploadsDir, { recursive: true, force: true }) } catch {}
  }
}

export function createWorker() {
  return new Worker(
    'video-processing',
    async (job: Job) => {
      const { jobId, files, targetDuration } = job.data as {
        jobId: string
        files: VideoFile[]
        targetDuration: number
      }

      try {
        // ── PHASE 1: Split each uploaded video into clips ──
        await setProgress(jobId, 'splitting', 5)

        const allClips = []
        for (let i = 0; i < files.length; i++) {
          const file = files[i]
          const clipDir = path.join(
            process.cwd(), 'storage/clips', jobId, `video-${i}`
          )
          const clips = await splitVideo(file.path, clipDir, async (p) => {
            const base = 5 + (i / files.length) * 25
            const inc = (p / 100) * (25 / files.length)
            await setProgress(jobId, 'splitting', Math.round(base + inc))
          })
          allClips.push(...clips)
        }

        await setProgress(jobId, 'splitting', 30)

        // ── PHASE 2: Select clips to match target duration ──
        await setProgress(jobId, 'selecting', 40)
        const { clips, trimLastBy } = selectClips(allClips, targetDuration)
        await setProgress(jobId, 'selecting', 60)

        // ── PHASE 3: Merge selected clips into final video ──
        const outputPath = path.join(
          process.cwd(), 'storage/output', jobId, 'final.mp4'
        )
        await mergeClips(clips, outputPath, trimLastBy, async (p) => {
          const overall = 60 + (p / 100) * 35
          await setProgress(jobId, 'merging', Math.round(overall))
        })

        // ── DONE ───────────────────────────────────────────
        await db.update(jobs).set({
          status: 'complete',
          progress: 100,
          progressPhase: 'complete',
          outputPath,
          completedAt: new Date(),
        }).where(eq(jobs.id, jobId))

        // Delete clips + uploads — output file is all we need now
        cleanup(jobId, true)

        return { outputPath }

      } catch (err: any) {
        await db.update(jobs)
          .set({ status: 'failed', errorMessage: err.message })
          .where(eq(jobs.id, jobId))

        // Delete clips only — keep uploads so the user can retry
        cleanup(jobId, false)

        throw err
      }
    },
    {
      connection,
      concurrency: 2,
    }
  )
}
