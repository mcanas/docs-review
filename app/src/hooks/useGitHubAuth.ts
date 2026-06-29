import { useState, useCallback } from 'react'
import type { GitHubUser } from '../types/github'
import { createRestClient, fetchUser } from '../api/github-rest'

const TOKEN_KEY = 'docs-review:github-token'

interface DeviceCodeResponse {
  device_code: string
  user_code: string
  verification_uri: string
  expires_in: number
  interval: number
}

interface AccessTokenResponse {
  access_token?: string
  error?: string
}

export type AuthState =
  | { status: 'idle' }
  | { status: 'pending'; userCode: string; verificationUrl: string }
  | { status: 'authenticated'; token: string; user: GitHubUser }
  | { status: 'error'; message: string }

export function useGitHubAuth(clientId: string, githubApiUrl: string) {
  const storedToken = localStorage.getItem(TOKEN_KEY)
  const [state, setState] = useState<AuthState>(() => ({ status: 'idle' }))
  const [token, setToken] = useState<string | null>(storedToken)
  const [user, setUser] = useState<GitHubUser | null>(null)

  const baseUrl = githubApiUrl !== 'https://api.github.com' ? githubApiUrl : undefined

  const initAuth = useCallback(async () => {
    setState({ status: 'idle' })

    const deviceRes = await fetch(`${githubApiUrl.replace('/api/v3', '')}/login/device/code`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, scope: 'repo' }),
    })
    const deviceData: DeviceCodeResponse = await deviceRes.json()

    setState({
      status: 'pending',
      userCode: deviceData.user_code,
      verificationUrl: deviceData.verification_uri,
    })

    const pollingInterval = Math.max(deviceData.interval, 5) * 1000
    const expiresAt = Date.now() + deviceData.expires_in * 1000

    const poll = async () => {
      if (Date.now() > expiresAt) {
        setState({ status: 'error', message: 'Authorization timed out. Please try again.' })
        return
      }

      const tokenRes = await fetch(`${githubApiUrl.replace('/api/v3', '')}/login/oauth/access_token`, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          device_code: deviceData.device_code,
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        }),
      })
      const tokenData: AccessTokenResponse = await tokenRes.json()

      if (tokenData.access_token) {
        localStorage.setItem(TOKEN_KEY, tokenData.access_token)
        setToken(tokenData.access_token)
        const client = createRestClient(tokenData.access_token, baseUrl)
        const fetchedUser = await fetchUser(client)
        setUser(fetchedUser)
        setState({ status: 'authenticated', token: tokenData.access_token, user: fetchedUser })
      } else if (tokenData.error === 'authorization_pending' || tokenData.error === 'slow_down') {
        setTimeout(poll, pollingInterval)
      } else {
        setState({ status: 'error', message: tokenData.error ?? 'Authorization failed' })
      }
    }

    setTimeout(poll, pollingInterval)
  }, [clientId, githubApiUrl, baseUrl])

  const signOut = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setUser(null)
    setState({ status: 'idle' })
  }, [])

  return { state, token, user, initAuth, signOut, isAuthenticated: token !== null }
}
