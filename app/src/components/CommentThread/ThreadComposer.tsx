import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { DeviceFlowModal } from '../Auth/DeviceFlowModal'

interface Props {
  onSubmit: (body: string) => Promise<void>
  onCancel?: () => void
  placeholder?: string
  submitLabel?: string
}

export function ThreadComposer({ onSubmit, onCancel, placeholder = 'Add a comment…', submitLabel = 'Comment' }: Props) {
  const { isAuthenticated } = useAuth()
  const [body, setBody] = useState('')
  const [preview, setPreview] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)

  const handleSubmit = async () => {
    if (!isAuthenticated) { setShowAuthModal(true); return }
    if (!body.trim()) return
    setSubmitting(true)
    try {
      await onSubmit(body.trim())
      setBody('')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className="border border-gray-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
        <div className="flex border-b border-gray-100 bg-gray-50">
          <button
            onClick={() => setPreview(false)}
            className={`px-3 py-1.5 text-xs font-medium ${!preview ? 'text-gray-900 border-b-2 border-blue-500 bg-white' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Write
          </button>
          <button
            onClick={() => setPreview(true)}
            className={`px-3 py-1.5 text-xs font-medium ${preview ? 'text-gray-900 border-b-2 border-blue-500 bg-white' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Preview
          </button>
        </div>

        {preview ? (
          <div
            className="min-h-[80px] p-3 text-sm prose prose-sm max-w-none text-gray-700"
            dangerouslySetInnerHTML={{ __html: body || '<span class="text-gray-400">Nothing to preview</span>' }}
          />
        ) : (
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={placeholder}
            rows={3}
            className="w-full p-3 text-sm text-gray-800 resize-none focus:outline-none placeholder-gray-400"
          />
        )}
      </div>

      <div className="flex justify-end gap-2 mt-2">
        {onCancel && (
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
        )}
        <button
          onClick={handleSubmit}
          disabled={submitting || (!isAuthenticated ? false : !body.trim())}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {!isAuthenticated ? 'Sign in to comment' : submitting ? 'Posting…' : submitLabel}
        </button>
      </div>

      {showAuthModal && <DeviceFlowModal onClose={() => setShowAuthModal(false)} />}
    </>
  )
}
