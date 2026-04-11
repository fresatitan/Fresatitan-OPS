import { useState, useEffect } from 'react'

export function useElapsedTime(startIso: string | null): string {
  const [elapsed, setElapsed] = useState('00:00:00')

  useEffect(() => {
    if (!startIso) return
    const start = new Date(startIso).getTime()

    const tick = () => {
      const diff = Math.max(0, Math.floor((Date.now() - start) / 1000))
      const h = String(Math.floor(diff / 3600)).padStart(2, '0')
      const m = String(Math.floor((diff % 3600) / 60)).padStart(2, '0')
      const s = String(diff % 60).padStart(2, '0')
      setElapsed(`${h}:${m}:${s}`)
    }

    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [startIso])

  return elapsed
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
