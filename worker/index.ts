import { createWorker } from '../src/lib/queue/worker'

const worker = createWorker()
console.log('Worker ready, waiting for jobs...')

worker.on('completed', job => console.log(`✓ Job ${job.id} done`))
worker.on('failed', (job, err) => console.error(`✗ Job ${job?.id} failed:`, err.message))

process.on('SIGTERM', async () => {
  await worker.close()
  process.exit(0)
})
