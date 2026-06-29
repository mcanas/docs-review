import { createContext, useContext, type ReactNode } from 'react'
import { useGitHubAuth, type AuthState } from '../hooks/useGitHubAuth'
import type { GitHubUser } from '../types/github'

interface AuthContextValue {
  state: AuthState
  token: string | null
  user: GitHubUser | null
  isAuthenticated: boolean
  initAuth: (pat?: string) => Promise<void>
  signOut: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({
  children,
  clientId,
  githubApiUrl,
}: {
  children: ReactNode
  clientId: string
  githubApiUrl: string
}) {
  const auth = useGitHubAuth(clientId, githubApiUrl)
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
