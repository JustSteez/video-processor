import type { Clip } from '@/types'

export interface SelectionResult {
  clips: Clip[]
  totalDuration: number
  trimLastBy: number
}

export function selectClips(
  allClips: Clip[],
  targetSeconds: number
): SelectionResult {
  if (allClips.length === 0) throw new Error('No clips to select from')

  // Shuffle so we pull from different source videos randomly
  const pool = [...allClips].sort(() => Math.random() - 0.5)

  const selected: Clip[] = []
  let total = 0

  // Greedy fill — keep adding unique clips until we reach the target
  for (const clip of pool) {
    if (total >= targetSeconds) break
    selected.push(clip)
    total += clip.duration
  }

  // Only allow repeats if we exhausted ALL clips and are still short
  // (i.e. source material is genuinely shorter than the target)
  const allClipsDuration = pool.reduce((s, c) => s + c.duration, 0)
  if (total < targetSeconds - 3 && allClipsDuration < targetSeconds) {
    let pass = 2
    while (total < targetSeconds - 3) {
      const extra = [...pool].sort(() => Math.random() - 0.5)
      for (const clip of extra) {
        if (total >= targetSeconds) break
        selected.push({ ...clip, id: `${clip.id}_r${pass}` })
        total += clip.duration
      }
      pass++
      if (pass > 10) break // safety limit
    }
  }

  const trimLastBy = Math.max(0, total - targetSeconds)
  return { clips: selected, totalDuration: total, trimLastBy }
}
