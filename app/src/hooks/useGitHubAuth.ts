import { useState, useCallback, useEffect } from 'react'
import type { GitHubUser } from '../types/github'
import { createRestClient, fetchUser } from '../api/github-rest'

const TOKEN_KEY = 'docs-review:github-token'

export type AuthState =
  | { status: 'idle' }
  | { status: 'validating' }
  | { status: 'authenticated'; token: string; user: GitHubUser }
  | { status: 'error'; message: string }

export function useGitHubAuth(_clientId: string, githubApiUrl: string) {
  const storedToken = localStorage.getItem(TOKEN_KEY)
  const [state, setState] = useState<AuthState>({ status: 'idle' })
  const [token, setToken] = useState<string | null>(storedToken)
  const [user, setUser] = useState<GitHubUser | null>(null)

  const baseUrl = githubApiUrl !== 'https://api.github.com' ? githubApiUrl : undefined

  const initAuth = useCallback(async (pat?: string) => {
    const tokenToUse = pat ?? storedToken
    if (!tokenToUse) {
      setState({ status: 'idle' })
      return
    }
    setState({ status: 'validating' })
    try {
      const client = createRestClient(tokenToUse, baseUrl)
      const fetchedUser = await fetchUser(client)
      localStorage.setItem(TOKEN_KEY, tokenToUse)
      setToken(tokenToUse)
      setUser(fetchedUser)
      setState({ status: 'authenticated', token: tokenToUse, user: fetchedUser })
    } catch {
      setState({ status: 'error', message: 'Invalid token or insufficient permissions. Token needs Issues: Read and Write + Contents: Read-only.' })
    }
  }, [githubApiUrl, baseUrl, storedToken])

  useEffect(() => {
    if (storedToken) initAuth(storedToken)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const signOut = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setUser(null)
    setState({ status: 'idle' })
  }, [])

  return { state, token, user, initAuth, signOut, isAuthenticated: token !== null }
}
