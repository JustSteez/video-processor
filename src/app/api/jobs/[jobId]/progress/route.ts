import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { jobs } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: object) => {
        try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`)) }
        catch {}
      }

      const poll = setInterval(async () => {
        try {
          const job = await db.select().from(jobs).where(eq(jobs.id, jobId)).get()
          if (!job) return send({ phase: 'queued', percent: 0 })

          send({
            phase: job.progressPhase,
            percent: job.progress,
            status: job.status,
            error: job.errorMessage ?? undefined,
          })

          if (job.status === 'complete' || job.status === 'failed') {
            clearInterval(poll)
            controller.close()
          }
        } catch {
          clearInterval(poll)
          controller.close()
        }
      }, 600)

      req.signal.addEventListener('abort', () => {
        clearInterval(poll)
        try { controller.close() } catch {}
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
