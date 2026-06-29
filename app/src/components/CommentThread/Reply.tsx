import type { ThreadReply } from '../../types/thread'

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function Reply({ reply }: { reply: ThreadReply }) {
  return (
    <div className="flex gap-2.5 py-3">
      <img
        src={reply.author.avatarUrl}
        alt={reply.author.login}
        className="w-6 h-6 rounded-full shrink-0 mt-0.5"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-sm font-medium text-gray-900">{reply.author.login}</span>
          <span className="text-xs text-gray-400">{relativeTime(reply.createdAt)}</span>
        </div>
        <div
          className="text-sm text-gray-700 prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: reply.body }}
        />
      </div>
    </div>
  )
}
