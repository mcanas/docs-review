import type { BuildConfig } from '../types/config'

declare global {
  interface Window {
    __DOCS_REVIEW_CONFIG__?: BuildConfig
  }
}

export function useConfig(): BuildConfig {
  const config = window.__DOCS_REVIEW_CONFIG__
  if (!config) throw new Error('Docs review config not injected. Is the build configured correctly?')
  return config
}
