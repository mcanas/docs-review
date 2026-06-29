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
import type { Thread as ThreadType, ThreadCoordinates } from '../../types/thread'

interface Props {
  filePath: string
  projectName: string
  currentCommitSha: string
}

interface PendingSelection {
  coordinates: Omit<ThreadCoordinates, 'project' | 'file' | 'commitSha'>
  selectionRect: DOMRect
}

// Inject a <mark> into `root` wrapping the first occurrence of a search string.
// Tries the full first line of selectedText first; falls back to the first word
// so that cross-element selections (e.g. text spanning <strong>) still get a mark.
function injectMark(
  root: Element,
  selectedText: string,
  attrs: { threadId?: string; pending?: true },
  styles: { background: string; underlineColor: string },
): boolean {
  const firstLine = selectedText.split('\n')[0].trim()
  if (!firstLine) return false

  // Candidates: try longest match first so the most accurate anchor wins.
  const firstWord = firstLine.split(/\s+/)[0]
  const candidates = firstWord !== firstLine ? [firstLine, firstWord] : [firstLine]

  for (const searchText of candidates) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    let node: Text | null
    while ((node = walker.nextNode() as Text | null)) {
      const val = node.nodeValue ?? ''
      const idx = val.indexOf(searchText)
      if (idx === -1) continue

      const mark = document.createElement('mark')
      if (attrs.threadId) mark.dataset.threadId = attrs.threadId
      if (attrs.pending) mark.dataset.pending = 'true'
      mark.style.cssText = [
        `background:${styles.background}`,
        'border-radius:2px',
        'cursor:pointer',
        'text-decoration:underline',
        `text-decoration-color:${styles.underlineColor}`,
        'text-decoration-thickness:2px',
        'text-underline-offset:2px',
      ].join(';')
      mark.textContent = searchText

      const parent = node.parentNode!
      const before = val.slice(0, idx)
      const after = val.slice(idx + searchText.length)
      if (before) parent.insertBefore(document.createTextNode(before), node)
      parent.insertBefore(mark, node)
      if (after) node.nodeValue = after
      else parent.removeChild(node)
      return true
    }
  }
  return false
}

export function MarkdownViewer({ filePath, projectName, currentCommitSha }: Props) {
  const { token } = useAuth()
  const { repo, githubApiUrl } = useBuildConfig()
  const baseUrl = githubApiUrl !== 'https://api.github.com' ? githubApiUrl : undefined

  const containerRef = useRef<HTMLDivElement>(null)
  const threadPanelRef = useRef<HTMLDivElement>(null)
  const [renderedHtml, setRenderedHtml] = useState('')
  const [sourceLines, setSourceLines] = useState<string[]>([])
  const [pending, setPending] = useState<PendingSelection | null>(null)
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)
  const [composerOpen, setComposerOpen] = useState(false)
  const [threadPanelOpen, setThreadPanelOpen] = useState(true)

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
    let cancelled = false

    setSourceLines(extractSourceLines(fileContent.content))
    ;(async () => {
      const html = await renderMarkdown(fileContent.content)
      if (cancelled) return
      // Show content immediately with placeholder divs so the page isn't blank
      // while mermaid diagrams render.
      setRenderedHtml(html)

      // Render mermaid diagrams into an off-DOM DOMParser document, then bake
      // the SVG strings into the HTML before the second setRenderedHtml call.
      // Doing it this way avoids the async-vs-React-commit race where el.innerHTML
      // targets a detached node (happens when renderedHtml changes between when
      // the useLayoutEffect captures element references and when mermaid resolves).
      const temp = new DOMParser().parseFromString(html, 'text/html')
      const placeholders = Array.from(temp.querySelectorAll<HTMLElement>('.mermaid-pending'))
      if (!placeholders.length || cancelled) return

      const { default: mermaid } = await import('mermaid')
      if (cancelled) return
      mermaid.initialize({ startOnLoad: false, theme: 'neutral' })

      await Promise.all(
        placeholders.map(async (el, i) => {
          const encoded = el.getAttribute('data-mermaid')
          if (!encoded) return
          try {
            const source = new TextDecoder().decode(
              Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0)),
            )
            const { svg } = await mermaid.render(`mermaid-${i}`, source)
            const wrapper = temp.createElement('div')
            wrapper.innerHTML = svg
            el.replaceWith(...Array.from(wrapper.childNodes))
          } catch (err) {
            el.textContent = `Diagram error: ${err instanceof Error ? err.message : String(err)}`
            el.removeAttribute('data-mermaid')
            el.className = 'text-red-500 text-sm font-mono p-3 bg-red-50 rounded'
          }
        }),
      )

      if (!cancelled) setRenderedHtml(temp.body.innerHTML)
    })()

    return () => { cancelled = true }
  }, [fileContent])

  // Scroll thread panel to top whenever the composer opens or a thread is selected,
  // so the new content is always visible regardless of prior scroll position.
  useEffect(() => {
    if (composerOpen || selectedThreadId) {
      threadPanelRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [composerOpen, selectedThreadId])

  // Inject <mark> highlights for threads and pending selection.
  // Runs after every render that changes html, threads, selection, or pending state.
  useLayoutEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current

    // Clear all injected marks, restoring plain text nodes.
    container
      .querySelectorAll<HTMLElement>('mark[data-thread-id], mark[data-pending]')
      .forEach((m) => m.replaceWith(document.createTextNode(m.textContent ?? '')))

    // Permanent thread highlights.
    // Falls back to searching the whole container when startLine is 0 or the
    // element can't be found (e.g. threads created before data-line fix).
    threads.forEach((t: ThreadType) => {
      const lineEl = container.querySelector(`[data-line="${t.coordinates.startLine}"]`) ?? container
      const selected = t.id === selectedThreadId
      injectMark(
        lineEl,
        t.coordinates.selectedText,
        { threadId: t.id },
        {
          background: selected ? 'rgba(253,224,71,0.6)' : t.closed ? 'rgba(156,163,175,0.12)' : 'rgba(253,224,71,0.35)',
          underlineColor: t.closed ? '#9ca3af' : '#fbbf24',
        },
      )
    })

    // Pending selection highlight — shown while popover or composer is visible.
    if (pending) {
      const lineEl = container.querySelector(`[data-line="${pending.coordinates.startLine}"]`) ?? container
      injectMark(
        lineEl,
        pending.coordinates.selectedText,
        { pending: true },
        { background: 'rgba(99,102,241,0.15)', underlineColor: '#818cf8' },
      )
    }
  }, [renderedHtml, threads, selectedThreadId, pending])

  const handleMouseUp = useCallback(() => {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || !containerRef.current) { setPending(null); return }

    const coords = extractSelectionCoordinates(sel, sourceLines, containerRef.current)
    if (!coords) { setPending(null); return }

    const range = sel.getRangeAt(0)
    setPending({ coordinates: coords, selectionRect: range.getBoundingClientRect() })
    setComposerOpen(false)
  }, [sourceLines])

  const handleOpenComposer = () => {
    setComposerOpen(true)
    // Clear browser selection — our pending mark provides the visual feedback instead.
    window.getSelection()?.removeAllRanges()
  }

  const handleCreateThread = async (body: string) => {
    if (!pending || !fileContent) return
    const coordinates: ThreadCoordinates = {
      ...pending.coordinates,
      project: projectName,
      file: filePath,
      commitSha: currentCommitSha,
    }
    await createThread.mutateAsync({ coordinates, comment: body })
    setPending(null)
    setComposerOpen(false)
  }

  // Event delegation: clicks on injected <mark> elements open the thread.
  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    const mark = (e.target as Element).closest('mark[data-thread-id]') as HTMLElement | null
    if (!mark) return
    const threadId = mark.dataset.threadId
    if (threadId) setSelectedThreadId(prev => prev === threadId ? null : threadId)
  }, [])

  const selectedThread = threads.find((t) => t.id === selectedThreadId) ?? null

  if (fileLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
        Loading…
      </div>
    )
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Main content column */}
      <div className="flex-1 min-w-0 relative pr-12 overflow-y-auto">
        <div
          ref={containerRef}
          className="relative prose prose-gray max-w-none py-8 px-6 select-text"
          dangerouslySetInnerHTML={{ __html: renderedHtml }}
          onMouseUp={handleMouseUp}
          onClick={handleContainerClick}
        />

        {/* Selection popover */}
        {pending && !composerOpen && (
          <SelectionPopover
            anchorRect={pending.selectionRect}
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

      {/* Thread panel toggle strip */}
      <button
        onClick={() => setThreadPanelOpen(v => !v)}
        className="shrink-0 w-4 flex items-center justify-center border-l border-gray-100 hover:bg-gray-50 text-gray-300 hover:text-gray-500 transition-colors"
        title={threadPanelOpen ? 'Collapse comments' : 'Expand comments'}
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          {threadPanelOpen
            ? <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            : <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />}
        </svg>
      </button>

      {/* Thread panel — outer shell animates width */}
      <div className={`shrink-0 overflow-hidden transition-[width] duration-200 ${threadPanelOpen ? 'w-80' : 'w-0'}`}>
        <div ref={threadPanelRef} className="w-80 h-full py-8 px-4 space-y-4 overflow-y-auto">
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
              isOutdated={!!currentCommitSha && selectedThread.coordinates.commitSha !== currentCommitSha}
              onClose={() => setSelectedThreadId(null)}
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
    </div>
  )
}
