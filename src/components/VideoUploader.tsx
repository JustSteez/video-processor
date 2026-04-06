'use client'
import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import axios from 'axios'

interface Props {
  onUploadComplete: (jobId: string, files: any[]) => void
}

export function VideoUploader({ onUploadComplete }: Props) {
  const [uploading, setUploading] = useState(false)
  const [uploadPct, setUploadPct] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length < 2 || acceptedFiles.length > 5) {
      setError('Upload 2 to 5 videos.')
      return
    }
    setUploading(true)
    setError(null)
    const form = new FormData()
    acceptedFiles.forEach(f => form.append('videos', f))
    try {
      const { data } = await axios.post('/api/upload', form, {
        onUploadProgress: e => setUploadPct(Math.round((e.loaded / (e.total || 1)) * 100)),
      })
      onUploadComplete(data.jobId, data.files)
    } catch (e: any) {
      setError(e.response?.data?.error || 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }, [onUploadComplete])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'video/mp4': ['.mp4'], 'video/quicktime': ['.mov'] },
    maxFiles: 5,
    disabled: uploading,
  })

  return (
    <div>
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition
          ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <div>
            <p className="text-gray-600 mb-3">Uploading... {uploadPct}%</p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${uploadPct}%` }} />
            </div>
          </div>
        ) : (
          <div>
            <p className="text-xl font-medium mb-1">Drop videos here</p>
            <p className="text-gray-400 text-sm">2–5 MP4 files · max 500MB each</p>
          </div>
        )}
      </div>
      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
    </div>
  )
}
