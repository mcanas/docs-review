import { useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'

export function DeviceFlowModal({ onClose }: { onClose: () => void }) {
  const { state, initAuth } = useAuth()

  useEffect(() => {
    if (state.status === 'idle') initAuth()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (state.status === 'authenticated') onClose()
  }, [state.status, onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Sign in with GitHub</h2>

        {state.status === 'idle' && (
          <p className="text-sm text-gray-500">Initializing…</p>
        )}

        {state.status === 'pending' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Enter this code at{' '}
              <a
                href={state.verificationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline"
              >
                {state.verificationUrl}
              </a>
            </p>
            <div className="flex justify-center">
              <span className="font-mono text-2xl tracking-widest bg-gray-100 px-4 py-2 rounded-lg text-gray-900">
                {state.userCode}
              </span>
            </div>
            <p className="text-xs text-gray-400 text-center">
              Waiting for authorization…
            </p>
          </div>
        )}

        {state.status === 'error' && (
          <div className="space-y-3">
            <p className="text-sm text-red-600">{state.message}</p>
            <button
              onClick={() => initAuth()}
              className="w-full py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-700"
            >
              Try again
            </button>
          </div>
        )}

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
