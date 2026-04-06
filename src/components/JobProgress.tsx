'use client'
import { useEffect } from 'react'
import { useJobProgress } from '@/hooks/useJobProgress'

const LABELS: Record<string, string> = {
  queued: 'Waiting in queue...',
  splitting: 'Splitting videos into clips...',
  selecting: 'Selecting clips...',
  merging: 'Merging into final video...',
  complete: 'Done!',
  failed: 'Processing failed.',
}

interface Props {
  jobId: string
  onComplete: () => void
  onRetry: () => void
}

export function JobProgress({ jobId, onComplete, onRetry }: Props) {
  const progress = useJobProgress(jobId)

  useEffect(() => {
    if (progress.phase === 'complete') {
      const t = setTimeout(onComplete, 800)
      return () => clearTimeout(t)
    }
  }, [progress.phase, onComplete])

  return (
    <div className="space-y-3">
      <div className="flex justify-between text-sm">
        <span className="text-gray-700">{LABELS[progress.phase] ?? progress.phase}</span>
        <span className="font-mono text-gray-400">{progress.percent}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500
            ${progress.phase === 'failed' ? 'bg-red-500' : 'bg-blue-500'}`}
          style={{ width: `${progress.percent}%` }}
        />
      </div>
      {progress.phase === 'failed' && (
        <div className="space-y-2 pt-1">
          <p className="text-red-500 text-sm">
            {progress.error ?? 'Something went wrong.'}
          </p>
          <button
            onClick={onRetry}
            className="w-full border border-gray-300 text-gray-700 py-2 rounded-lg text-sm
              font-medium hover:bg-gray-50 transition"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  )
}
