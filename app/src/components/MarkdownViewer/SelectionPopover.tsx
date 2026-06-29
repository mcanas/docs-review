import { useEffect, useRef } from 'react'

interface Props {
  anchorRect: DOMRect
  containerRect: DOMRect
  onAddComment: () => void
}

export function SelectionPopover({ anchorRect, containerRect, onAddComment }: Props) {
  const ref = useRef<HTMLButtonElement>(null)

  const top = anchorRect.top - containerRect.top - 40
  const left = anchorRect.left - containerRect.left + anchorRect.width / 2

  useEffect(() => {
    ref.current?.focus()
  }, [])

  return (
    <button
      ref={ref}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onAddComment() }}
      onMouseDown={(e) => e.preventDefault()}
      className="absolute z-30 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-full shadow-lg hover:bg-gray-700 transition-colors whitespace-nowrap"
      style={{ top, left }}
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
      </svg>
      Add comment
    </button>
  )
}
