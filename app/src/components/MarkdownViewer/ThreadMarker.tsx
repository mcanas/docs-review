import { useEffect, useState } from 'react'
import type { Thread } from '../../types/thread'

interface Props {
  threads: Thread[]
  containerRef: React.RefObject<HTMLDivElement | null>
  onSelect: (threadId: string) => void
  selectedThreadId: string | null
}

interface Marker {
  threadId: string
  top: number
  count: number
  open: number
}

export function ThreadMarkerLayer({ threads, containerRef, onSelect, selectedThreadId }: Props) {
  const [markers, setMarkers] = useState<Marker[]>([])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const containerTop = container.getBoundingClientRect().top + window.scrollY

    const byLine = new Map<number, Thread[]>()
    for (const thread of threads) {
      const line = thread.coordinates.startLine
      const existing = byLine.get(line) ?? []
      byLine.set(line, [...existing, thread])
    }

    const computed: Marker[] = []
    byLine.forEach((group, line) => {
      const el = container.querySelector<HTMLElement>(`[data-line="${line}"]`)
      if (!el) return
      const top = el.getBoundingClientRect().top + window.scrollY - containerTop
      computed.push({
        threadId: group[0].id,
        top,
        count: group.length,
        open: group.filter((t) => !t.closed).length,
      })
    })

    setMarkers(computed)
  }, [threads, containerRef])

  return (
    <>
      {markers.map((marker) => (
        <button
          key={marker.threadId}
          onClick={() => onSelect(marker.threadId)}
          className={`absolute right-0 flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border transition-all ${
            selectedThreadId === marker.threadId
              ? 'bg-blue-600 text-white border-blue-600'
              : marker.open > 0
              ? 'bg-white text-blue-600 border-blue-200 hover:border-blue-400'
              : 'bg-white text-gray-400 border-gray-200 hover:border-gray-400'
          }`}
          style={{ top: marker.top }}
          title={`${marker.open} open · ${marker.count - marker.open} resolved`}
        >
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
          </svg>
          {marker.count}
        </button>
      ))}
    </>
  )
}
