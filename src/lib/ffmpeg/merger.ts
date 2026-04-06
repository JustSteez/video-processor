import ffmpeg from 'fluent-ffmpeg'
import path from 'path'
import fs from 'fs'
import type { Clip } from '@/types'
// Uses system ffmpeg/ffprobe from PATH
// All clips arriving here are pre-normalized by the splitter (1280x720, 30fps, aac stereo)
// so we can use the concat demuxer rather than filter_complex.

export async function mergeClips(
  clips: Clip[],
  outputPath: string,
  trimLastBy: number,
  onProgress?: (percent: number) => void
): Promise<void> {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })

  const manifestPath = outputPath.replace('.mp4', '_manifest.txt')

  // Build concat manifest. Use `outpoint` on the last clip to trim it instead of
  // a separate FFmpeg pass — the concat demuxer handles it natively.
  const lines: string[] = []
  for (let i = 0; i < clips.length; i++) {
    const clip = clips[i]
    const filePath = clip.path.replace(/\\/g, '/').replace(/'/g, "\\'")
    lines.push(`file '${filePath}'`)
    if (i === clips.length - 1 && trimLastBy > 1) {
      const outpoint = Math.max(1, clip.duration - trimLastBy)
      lines.push(`outpoint ${outpoint.toFixed(3)}`)
    }
  }
  fs.writeFileSync(manifestPath, lines.join('\n'))

  await new Promise<void>((resolve, reject) => {
    ffmpeg()
      .input(manifestPath)
      .inputOptions(['-f', 'concat', '-safe', '0'])
      .outputOptions([
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '23',
        '-c:a', 'aac',
        '-ar', '44100',
        '-ac', '2',
        '-movflags', '+faststart',
      ])
      .output(outputPath)
      .on('progress', p => onProgress?.(Math.min(p.percent ?? 0, 99)))
      .on('end', () => {
        try { fs.unlinkSync(manifestPath) } catch {}
        resolve()
      })
      .on('error', (err) => {
        try { fs.unlinkSync(manifestPath) } catch {}
        reject(err)
      })
      .run()
  })
}
