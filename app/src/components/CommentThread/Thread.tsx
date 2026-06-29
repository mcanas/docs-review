import { useState } from 'react'
import type { Thread as ThreadType } from '../../types/thread'
import { Reply } from './Reply'
import { ThreadComposer } from './ThreadComposer'
import { useAuth } from '../../contexts/AuthContext'

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

interface Props {
  thread: ThreadType
  isOutdated: boolean
  onReply: (body: string) => Promise<void>
  onResolve: () => Promise<void>
  onReopen: () => Promise<void>
}

export function Thread({ thread, isOutdated, onReply, onResolve, onReopen }: Props) {
  const { isAuthenticated } = useAuth()
  const [showReply, setShowReply] = useState(false)
  const [resolving, setResolving] = useState(false)

  const handleResolve = async () => {
    setResolving(true)
    try {
      await (thread.closed ? onReopen() : onResolve())
    } finally {
      setResolving(false)
    }
  }

  const handleReply = async (body: string) => {
    await onReply(body)
    setShowReply(false)
  }

  return (
    <div className={`rounded-xl border text-sm ${thread.closed ? 'border-gray-100 bg-gray-50' : 'border-gray-200 bg-white'} shadow-sm`}>
      {/* Quoted selection */}
      <div className="px-4 pt-3 pb-2 border-b border-gray-100">
        {isOutdated && (
          <span className="inline-block mb-2 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
            Outdated
          </span>
        )}
        <blockquote className="border-l-2 border-gray-300 pl-3 text-xs text-gray-500 italic line-clamp-3">
          {thread.coordinates.selectedText}
        </blockquote>
        {thread.coordinates.sectionContext && (
          <p className="mt-1 text-xs text-gray-400">in {thread.coordinates.sectionContext}</p>
        )}
      </div>

      {/* Opening comment */}
      <div className="px-4">
        <div className="flex gap-2.5 py-3">
          <img
            src={thread.author.avatarUrl}
            alt={thread.author.login}
            className="w-6 h-6 rounded-full shrink-0 mt-0.5"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-sm font-medium text-gray-900">{thread.author.login}</span>
              <span className="text-xs text-gray-400">{relativeTime(thread.createdAt)}</span>
              {thread.closed && (
                <span className="text-xs text-green-600 font-medium">Resolved</span>
              )}
            </div>
            {/* Strip metadata block from displayed body */}
            <div
              className="text-sm text-gray-700 prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{
                __html: thread.body
                  .replace(/<!-- docs-review-meta[\s\S]*?-->/, '')
                  .replace(/^(>.*\n?)+/, '')
                  .trim(),
              }}
            />
          </div>
        </div>

        {/* Replies */}
        {thread.replies.length > 0 && (
          <div className="border-t border-gray-100 divide-y divide-gray-50">
            {thread.replies.map((r) => (
              <Reply key={r.id} reply={r} />
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="py-3 flex items-center justify-between border-t border-gray-100">
          <button
            onClick={() => setShowReply((v) => !v)}
            className="text-xs text-gray-500 hover:text-blue-600"
          >
            {showReply ? 'Cancel' : 'Reply'}
          </button>
          {isAuthenticated && (
            <button
              onClick={handleResolve}
              disabled={resolving}
              className="text-xs text-gray-500 hover:text-green-600 disabled:opacity-40"
            >
              {resolving ? '…' : thread.closed ? 'Reopen' : 'Resolve'}
            </button>
          )}
        </div>

        {showReply && (
          <div className="pb-3">
            <ThreadComposer onSubmit={handleReply} onCancel={() => setShowReply(false)} submitLabel="Reply" />
          </div>
        )}
      </div>
    </div>
  )
}
