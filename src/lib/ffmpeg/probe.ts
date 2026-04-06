import ffmpeg from 'fluent-ffmpeg'
// Uses system ffmpeg/ffprobe from PATH (installed via winget/brew)

export interface VideoMeta {
  duration: number
  width: number
  height: number
  codec: string
  size: number
  hasAudio: boolean
}

export function probeVideo(filePath: string): Promise<VideoMeta> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, data) => {
      if (err) return reject(err)
      const video = data.streams.find(s => s.codec_type === 'video')
      if (!video) return reject(new Error('No video stream'))
      const audio = data.streams.find(s => s.codec_type === 'audio')
      resolve({
        duration: Number(data.format.duration) || 0,
        width: video.width || 0,
        height: video.height || 0,
        codec: video.codec_name || 'unknown',
        size: Number(data.format.size) || 0,
        hasAudio: !!audio,
      })
    })
  })
}
