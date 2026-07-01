import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'

export function DeviceFlowModal({ onClose }: { onClose: () => void }) {
  const { state, initAuth } = useAuth()
  const [pat, setPat] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = pat.trim()
    if (!trimmed) return
    await initAuth(trimmed)
    if (state.status !== 'error') onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Sign in with GitHub</h2>

        <p className="text-sm text-gray-600">
          Enter a GitHub{' '}
          <a
            href="https://github.com/settings/personal-access-tokens/new"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline"
          >
            fine-grained Personal Access Token
          </a>{' '}
          scoped to this repo with{' '}
          <strong className="font-medium text-gray-800">Issues: Read and Write</strong>{' '}
          and{' '}
          <strong className="font-medium text-gray-800">Contents: Read-only</strong>.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password"
            value={pat}
            onChange={(e) => setPat(e.target.value)}
            placeholder="github_pat_xxxxxxxxxxxxxxxxxxxx"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 font-mono"
            autoFocus
          />

          {state.status === 'error' && (
            <p className="text-sm text-red-600">{state.message}</p>
          )}

          <button
            type="submit"
            disabled={state.status === 'validating' || !pat.trim()}
            className="w-full py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {state.status === 'validating' ? 'Verifying…' : 'Sign in'}
          </button>
        </form>

        <button
          onClick={onClose}
          className="w-full py-2 text-sm text-gray-500 hover:text-gray-700"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
