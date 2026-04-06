export interface VideoFile {
  id: string
  path: string
  filename: string
  duration: number
  size: number
}

export interface Clip {
  id: string
  path: string
  duration: number
  sourceFile: string
}

export interface JobProgress {
  phase: 'queued' | 'splitting' | 'selecting' | 'merging' | 'complete' | 'failed'
  percent: number
  error?: string
}
