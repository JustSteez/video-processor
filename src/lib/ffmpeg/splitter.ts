import ffmpeg from 'fluent-ffmpeg'
import path from 'path'
import fs from 'fs'
import { randomUUID } from 'crypto'
import { probeVideo } from './probe'
import type { Clip } from '@/types'
// Uses system ffmpeg/ffprobe from PATH

// All clips are normalized to this spec so the merger can concat without re-encoding
const NORM_VF =
  'scale=1280:720:force_original_aspect_ratio=decrease,' +
  'pad=1280:720:(ow-iw)/2:(oh-ih)/2,' +
  'fps=30,format=yuv420p'

export async function splitVideo(
  inputPath: string,
  outputDir: string,
  onProgress?: (percent: number) => void
): Promise<Clip[]> {
  fs.mkdirSync(outputDir, { recursive: true })

  // Probe first so we know whether to inject a silent audio track
  const meta = await probeVideo(inputPath)
  const hasAudio = meta.hasAudio

  const segmentTime = 3 + Math.floor(Math.random() * 3)
  const outputPattern = path.join(outputDir, 'clip-%04d.mp4')

  await new Promise<void>((resolve, reject) => {
    let cmd = ffmpeg(inputPath)

    if (!hasAudio) {
      // Inject an infinite silent audio source so every clip has an audio track.
      // -reset_timestamps 1 keeps each segment's audio in sync with video.
      cmd = cmd.input('anullsrc=r=44100:cl=stereo').inputOptions(['-f', 'lavfi'])
    }

    cmd
      .outputOptions([
        '-vf', NORM_VF,
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-crf', '23',
        '-g', '30',           // keyframe every 1 s at 30 fps → clean segment starts
        '-c:a', 'aac',
        '-ar', '44100',
        '-ac', '2',
        '-map', '0:v:0',
        '-map', hasAudio ? '0:a:0' : '1:a:0',
        `-segment_time`, String(segmentTime),
        '-f', 'segment',
        '-reset_timestamps', '1',
      ])
      .output(outputPattern)
      .on('progress', p => onProgress?.(Math.min(p.percent ?? 0, 99)))
      .on('end', resolve)
      .on('error', reject)
      .run()
  })

  const clipFiles = fs.readdirSync(outputDir)
    .filter(f => f.endsWith('.mp4'))
    .sort()

  const clips: Clip[] = []
  for (const file of clipFiles) {
    const clipPath = path.join(outputDir, file)
    try {
      const clipMeta = await probeVideo(clipPath)
      if (clipMeta.duration >= 2) {
        clips.push({
          id: randomUUID(),
          path: clipPath,
          duration: clipMeta.duration,
          sourceFile: inputPath,
        })
      }
    } catch {
      // skip unreadable clips silently
    }
  }

  return clips
}
