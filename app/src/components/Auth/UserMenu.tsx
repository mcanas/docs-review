import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { DeviceFlowModal } from './DeviceFlowModal'

export function UserMenu() {
  const { user, isAuthenticated, signOut } = useAuth()
  const [showModal, setShowModal] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)

  if (!isAuthenticated) {
    return (
      <>
        <button
          onClick={() => setShowModal(true)}
          className="text-sm px-3 py-1.5 bg-gray-900 text-white rounded-lg hover:bg-gray-700"
        >
          Sign in
        </button>
        {showModal && <DeviceFlowModal onClose={() => setShowModal(false)} />}
      </>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown((v) => !v)}
        className="flex items-center gap-2 rounded-full hover:ring-2 hover:ring-gray-300 transition-all"
      >
        <img
          src={user?.avatarUrl}
          alt={user?.login}
          className="w-7 h-7 rounded-full"
        />
      </button>

      {showDropdown && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
          <div className="absolute right-0 top-9 z-20 w-44 bg-white rounded-xl shadow-lg border border-gray-100 py-1">
            <div className="px-3 py-2 text-sm text-gray-500 border-b border-gray-100">
              {user?.name ?? user?.login}
            </div>
            <button
              onClick={() => { signOut(); setShowDropdown(false) }}
              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  )
}
