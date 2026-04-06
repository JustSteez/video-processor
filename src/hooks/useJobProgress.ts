import { useEffect, useState } from 'react'
import type { JobProgress } from '@/types'

export function useJobProgress(jobId: string | null) {
  const [progress, setProgress] = useState<JobProgress>({ phase: 'queued', percent: 0 })

  useEffect(() => {
    if (!jobId) return
    const es = new EventSource(`/api/jobs/${jobId}/progress`)
    es.onmessage = (e) => {
      const data = JSON.parse(e.data)
      setProgress(data)
      if (data.phase === 'complete' || data.phase === 'failed') es.close()
    }
    es.onerror = () => es.close()
    return () => es.close()
  }, [jobId])

  return progress
}
