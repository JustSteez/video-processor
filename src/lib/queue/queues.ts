import { Queue } from 'bullmq'
import Redis from 'ioredis'

export const connection = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
})

export const videoQueue = new Queue('video-processing', { connection })
