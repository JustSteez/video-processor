'use client'
import { useState } from 'react'
import axios from 'axios'
import { VideoUploader } from '@/components/VideoUploader'
import { DurationPicker } from '@/components/DurationPicker'
import { JobProgress } from '@/components/JobProgress'

type Stage = 'upload' | 'configure' | 'processing' | 'done'

export default function Home() {
  const [stage, setStage] = useState<Stage>('upload')
  const [jobId, setJobId] = useState<string | null>(null)
  const [files, setFiles] = useState<any[]>([])
  const [retryCount, setRetryCount] = useState(0)

  const handleUploaded = (id: string, uploadedFiles: any[]) => {
    setJobId(id)
    setFiles(uploadedFiles)
    setStage('configure')
  }

  const handleGenerate = async (targetDuration: number) => {
    await axios.post('/api/jobs', { jobId, targetDuration })
    setStage('processing')
  }

  const handleRetry = async () => {
    try {
      await axios.post(`/api/jobs/${jobId}/retry`)
      setRetryCount(c => c + 1)
    } catch (e: any) {
      const msg = e.response?.data?.error ?? 'Retry failed. Please re-upload your videos.'
      // If uploads are gone, bounce back to upload stage with a message
      if (e.response?.status === 400) {
        alert(msg)
        reset()
      }
    }
  }

  const reset = () => {
    setStage('upload')
    setJobId(null)
    setFiles([])
    setRetryCount(0)
  }

  return (
    <main className="min-h-screen bg-gray-50 flex justify-center pt-16 px-4">
      <div className="w-full max-w-lg space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Video Compiler</h1>
          <p className="text-gray-500 mt-1">Upload videos → get a perfectly timed compilation</p>
        </div>

        <div className="bg-white border rounded-2xl shadow-sm p-6">
          {stage === 'upload' && (
            <VideoUploader onUploadComplete={handleUploaded} />
          )}
          {stage === 'configure' && (
            <DurationPicker files={files} onSubmit={handleGenerate} />
          )}
          {stage === 'processing' && jobId && (
            <JobProgress
              key={`${jobId}-${retryCount}`}
              jobId={jobId}
              onComplete={() => setStage('done')}
              onRetry={handleRetry}
            />
          )}
          {stage === 'done' && jobId && (
            <div className="space-y-4 text-center">
              <p className="text-green-600 font-semibold text-lg">Your video is ready!</p>
              <video controls className="w-full rounded-lg" src={`/api/download/${jobId}`} />
              <a
                href={`/api/download/${jobId}`}
                download
                className="block w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition"
              >
                Download MP4
              </a>
              <button onClick={reset} className="text-gray-400 hover:text-gray-600 text-sm">
                Start over
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
