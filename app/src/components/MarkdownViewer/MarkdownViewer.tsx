import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useBuildConfig } from '../../contexts/ConfigContext'
import { useFileContent } from '../../hooks/useFileContent'
import { useThreads, useCreateThread, useAddReply, useResolveThread } from '../../hooks/useDiscussions'
import { renderMarkdown, extractSourceLines } from '../../utils/markdown'
import { extractSelectionCoordinates } from '../../utils/coordinate'
import { SelectionPopover } from './SelectionPopover'
import { ThreadMarkerLayer } from './ThreadMarker'
import { Thread } from '../CommentThread/Thread'
import { ThreadComposer } from '../CommentThread/ThreadComposer'
import type { ThreadCoordinates } from '../../types/thread'

interface Props {
  filePath: string
  projectName: string
  currentCommitSha: string
}

interface PendingSelection {
  coordinates: Omit<ThreadCoordinates, 'project' | 'file' | 'commitSha'>
  selectionRect: DOMRect
  containerRect: DOMRect
}

export function MarkdownViewer({ filePath, projectName, currentCommitSha }: Props) {
  const { token } = useAuth()
  const { repo, githubApiUrl } = useBuildConfig()
  const baseUrl = githubApiUrl !== 'https://api.github.com' ? githubApiUrl : undefined

  const containerRef = useRef<HTMLDivElement>(null)
  const [renderedHtml, setRenderedHtml] = useState('')
  const [sourceLines, setSourceLines] = useState<string[]>([])
  const [pending, setPending] = useState<PendingSelection | null>(null)
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)
  const [composerOpen, setComposerOpen] = useState(false)

  const { data: fileContent, isLoading: fileLoading } = useFileContent(
    repo.owner, repo.name, filePath, token, baseUrl,
  )
  const { data: threads = [] } = useThreads(
    repo.owner, repo.name, filePath, token, githubApiUrl,
  )
  const createThread = useCreateThread(repo.owner, repo.name, token, githubApiUrl)
  const addReply = useAddReply(repo.owner, repo.name, filePath, token, githubApiUrl)
  const resolveThread = useResolveThread(repo.owner, repo.name, filePath, token, githubApiUrl)

  useEffect(() => {
    if (!fileContent) return
    const lines = extractSourceLines(fileContent.content)
    setSourceLines(lines)
    renderMarkdown(fileContent.content).then(setRenderedHtml)
  }, [fileContent])

  // After each HTML update, hydrate any mermaid placeholder divs into SVGs.
  // Mermaid is lazy-imported so it doesn't land in the initial bundle.
  useLayoutEffect(() => {
    if (!renderedHtml || !containerRef.current) return
    const placeholders = containerRef.current.querySelectorAll<HTMLElement>('.mermaid-pending')
    if (!placeholders.length) return

    import('mermaid').then(({ default: mermaid }) => {
      mermaid.initialize({ startOnLoad: false, theme: 'neutral' })
      placeholders.forEach(async (el, i) => {
        const encoded = el.getAttribute('data-mermaid')
        if (!encoded) return
        try {
          const source = decodeURIComponent(escape(atob(encoded)))
          const id = `mermaid-diagram-${i}`
          const { svg } = await mermaid.render(id, source)
          el.innerHTML = svg
          el.classList.remove('mermaid-pending')
        } catch (err) {
          el.textContent = `Diagram error: ${err instanceof Error ? err.message : String(err)}`
          el.classList.add('text-red-500', 'text-sm', 'font-mono', 'p-3', 'bg-red-50', 'rounded')
          el.classList.remove('mermaid-pending')
        }
      })
    })
  }, [renderedHtml])

  const handleMouseUp = useCallback(() => {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || !containerRef.current) { setPending(null); return }

    const coords = extractSelectionCoordinates(sel, sourceLines, containerRef.current)
    if (!coords) { setPending(null); return }

    const range = sel.getRangeAt(0)
    const selectionRect = range.getBoundingClientRect()
    const containerRect = containerRef.current.getBoundingClientRect()

    setPending({ coordinates: coords, selectionRect, containerRect })
    setComposerOpen(false)
  }, [sourceLines])

  const handleOpenComposer = () => {
    setComposerOpen(true)
    window.getSelection()?.removeAllRanges()
  }

  const handleCreateThread = async (body: string) => {
    if (!pending || !fileContent) return
    const coordinates: ThreadCoordinates = {
      ...pending.coordinates,
      project: projectName,
      file: filePath,
      commitSha: fileContent.sha,
    }
    await createThread.mutateAsync({ coordinates, comment: body })
    setPending(null)
    setComposerOpen(false)
  }

  const selectedThread = threads.find((t) => t.id === selectedThreadId) ?? null

  if (fileLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
        Loading…
      </div>
    )
  }

  return (
    <div className="flex gap-8 h-full">
      {/* Main content column */}
      <div className="flex-1 min-w-0 relative pr-12">
        <div
          ref={containerRef}
          className="relative prose prose-gray max-w-none py-8 px-6 select-text"
          dangerouslySetInnerHTML={{ __html: renderedHtml }}
          onMouseUp={handleMouseUp}
        />

        {/* Highlight threads in document via left-border accents */}
        <style>{`
          ${threads.map((t) => `
            [data-line="${t.coordinates.startLine}"] {
              border-left: 3px solid ${t.closed ? '#e5e7eb' : '#93c5fd'};
              padding-left: 0.75rem;
              margin-left: -0.75rem;
            }
          `).join('\n')}
        `}</style>

        {/* Selection popover */}
        {pending && !composerOpen && (
          <SelectionPopover
            anchorRect={pending.selectionRect}
            containerRect={pending.containerRect}
            onAddComment={handleOpenComposer}
          />
        )}

        {/* Thread markers in right margin */}
        {containerRef.current && (
          <ThreadMarkerLayer
            threads={threads}
            containerRef={containerRef}
            onSelect={(id) => setSelectedThreadId((prev) => prev === id ? null : id)}
            selectedThreadId={selectedThreadId}
          />
        )}
      </div>

      {/* Thread panel */}
      <div className="w-80 shrink-0 py-8 space-y-4 overflow-y-auto">
        {/* New thread composer */}
        {composerOpen && pending && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-500">New comment</p>
            <blockquote className="border-l-2 border-blue-300 pl-3 text-xs text-gray-500 italic line-clamp-2">
              {pending.coordinates.selectedText}
            </blockquote>
            <ThreadComposer
              onSubmit={handleCreateThread}
              onCancel={() => { setPending(null); setComposerOpen(false) }}
              submitLabel="Start thread"
            />
          </div>
        )}

        {/* Selected thread */}
        {selectedThread && (
          <Thread
            key={selectedThread.id}
            thread={selectedThread}
            isOutdated={selectedThread.coordinates.commitSha !== currentCommitSha}
            onReply={(body) => addReply.mutateAsync({ discussionId: selectedThread.id, body })}
            onResolve={() => resolveThread.mutateAsync({ discussionId: selectedThread.id, close: true })}
            onReopen={() => resolveThread.mutateAsync({ discussionId: selectedThread.id, close: false })}
          />
        )}

        {/* Thread list (when none selected) */}
        {!selectedThread && !composerOpen && threads.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
              {threads.filter((t) => !t.closed).length} open · {threads.filter((t) => t.closed).length} resolved
            </p>
            {threads.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedThreadId(t.id)}
                className="w-full text-left p-3 rounded-lg border border-gray-100 hover:border-gray-300 hover:shadow-sm transition-all"
              >
                <p className="text-xs text-gray-500 italic line-clamp-2 mb-1">
                  "{t.coordinates.selectedText}"
                </p>
                <p className="text-xs text-gray-400">
                  {t.author.login} · {t.replies.length} {t.replies.length === 1 ? 'reply' : 'replies'}
                  {t.closed && ' · Resolved'}
                </p>
              </button>
            ))}
          </div>
        )}

        {!selectedThread && !composerOpen && threads.length === 0 && (
          <p className="text-xs text-gray-400">
            Select text in the document to start a thread.
          </p>
        )}
      </div>
    </div>
  )
}
