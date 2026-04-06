'use client'
import { useState } from 'react'

interface Props {
  files: any[]
  onSubmit: (seconds: number) => void
}

export function DurationPicker({ files, onSubmit }: Props) {
  const [mins, setMins] = useState(3)
  const [secs, setSecs] = useState(0)

  const total = files.reduce((s, f) => s + f.duration, 0)
  const target = mins * 60 + secs

  return (
    <div className="space-y-5">
      <div>
        <p className="font-medium mb-2">Uploaded files</p>
        <ul className="text-sm text-gray-500 space-y-1">
          {files.map(f => (
            <li key={f.id}>{f.filename} — {Math.round(f.duration)}s</li>
          ))}
        </ul>
        <p className="text-xs text-gray-400 mt-1">Total: {Math.round(total)}s of source material</p>
      </div>

      <div>
        <p className="font-medium mb-2">Target duration</p>
        <div className="flex gap-3 items-center">
          <div className="flex flex-col items-center">
            <input type="number" min={0} max={59} value={mins}
              onChange={e => setMins(+e.target.value)}
              className="w-16 text-center border rounded p-2 text-lg font-mono" />
            <span className="text-xs text-gray-400 mt-1">min</span>
          </div>
          <span className="text-2xl text-gray-400">:</span>
          <div className="flex flex-col items-center">
            <input type="number" min={0} max={59} value={secs}
              onChange={e => setSecs(+e.target.value)}
              className="w-16 text-center border rounded p-2 text-lg font-mono" />
            <span className="text-xs text-gray-400 mt-1">sec</span>
          </div>
        </div>
        {target >= total && (
          <p className="text-red-500 text-sm mt-2 font-medium">
            Target must be shorter than your total source material ({Math.round(total)}s).
            Clips will repeat if you proceed.
          </p>
        )}
      </div>

      <button
        onClick={() => onSubmit(target)}
        disabled={target < 5}
        className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold
          hover:bg-blue-700 disabled:opacity-50 transition"
      >
        Generate Video
      </button>
    </div>
  )
}
