import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConfigProvider } from './contexts/ConfigContext'
import { AuthProvider } from './contexts/AuthContext'
import { useConfig } from './hooks/useConfig'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, retry: 1 } },
})

function Providers({ children }: { children: React.ReactNode }) {
  const config = useConfig()
  return (
    <AuthProvider clientId={config.oauthClientId} githubApiUrl={config.githubApiUrl}>
      {children}
    </AuthProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ConfigProvider>
        <Providers>
          <div>Docs Review — coming soon</div>
        </Providers>
      </ConfigProvider>
    </QueryClientProvider>
  </StrictMode>,
)
