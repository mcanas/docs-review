import { createContext, useContext, type ReactNode } from 'react'
import { useConfig } from '../hooks/useConfig'
import type { BuildConfig } from '../types/config'

const ConfigContext = createContext<BuildConfig | null>(null)

export function ConfigProvider({ children }: { children: ReactNode }) {
  const config = useConfig()
  return <ConfigContext.Provider value={config}>{children}</ConfigContext.Provider>
}

export function useBuildConfig(): BuildConfig {
  const ctx = useContext(ConfigContext)
  if (!ctx) throw new Error('useBuildConfig must be used within ConfigProvider')
  return ctx
}
