import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MarkdownViewer } from './MarkdownViewer'

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    isAuthenticated: true,
    token: 'fake-token',
    user: { login: 'alice', avatarUrl: '', url: '' },
    state: { status: 'authenticated' },
    initAuth: vi.fn(),
    signOut: vi.fn(),
  })),
}))

vi.mock('../../contexts/ConfigContext', () => ({
  useBuildConfig: vi.fn(() => ({
    repo: { owner: 'my-org', name: 'my-repo' },
    oauthClientId: 'client-id',
    githubApiUrl: 'https://api.github.com',
    readToken: '',
    config: { projects: [], settings: { file_extensions: ['.md'], exclude: [] } },
  })),
}))

vi.mock('../../hooks/useFileContent', () => ({
  useFileContent: vi.fn(() => ({ data: null, isLoading: true })),
  useRepoTree: vi.fn(() => ({ data: null, isLoading: false })),
}))

vi.mock('../../hooks/useDiscussions', () => ({
  useThreads: vi.fn(() => ({ data: [] })),
  useCreateThread: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useAddReply: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useResolveThread: vi.fn(() => ({ mutateAsync: vi.fn() })),
}))

vi.mock('../../utils/markdown', () => ({
  renderMarkdown: vi.fn(() => Promise.resolve('<p>Rendered content</p>')),
  extractSourceLines: vi.fn(() => ['line one', 'line two']),
}))

function renderWithQuery(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

const defaultProps = {
  filePath: 'docs/spec.md',
  projectName: 'Platform Core',
  currentCommitSha: 'abc123',
  openSignIn: vi.fn(),
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('MarkdownViewer', () => {
  it('shows loading state while file is fetching', () => {
    renderWithQuery(<MarkdownViewer {...defaultProps} />)
    expect(screen.getByText('Loading…')).toBeInTheDocument()
  })

  it('shows empty thread panel hint when no threads exist', async () => {
    const { useFileContent } = await import('../../hooks/useFileContent')
    vi.mocked(useFileContent).mockReturnValue({
      data: { content: '# Hello\n\nSome text.', sha: 'abc123', path: 'docs/spec.md' },
      isLoading: false,
    } as ReturnType<typeof useFileContent>)

    renderWithQuery(<MarkdownViewer {...defaultProps} />)
    expect(await screen.findByText(/Select text in the document/)).toBeInTheDocument()
  })

  it('shows thread count summary when threads exist', async () => {
    const { useFileContent } = await import('../../hooks/useFileContent')
    const { useThreads } = await import('../../hooks/useDiscussions')

    vi.mocked(useFileContent).mockReturnValue({
      data: { content: '# Hello', sha: 'abc123', path: 'docs/spec.md' },
      isLoading: false,
    } as ReturnType<typeof useFileContent>)

    vi.mocked(useThreads).mockReturnValue({
      data: [
        {
          id: 't1', number: 1, title: '', body: '', closed: false,
          author: { login: 'alice', avatarUrl: '', url: '' },
          createdAt: new Date().toISOString(),
          coordinates: { project: 'P', file: 'docs/spec.md', selectedText: 'some text', sectionContext: '', startLine: 1, endLine: 1, commitSha: 'abc123' },
          replies: [],
          reactionGroups: [],
        },
      ],
    } as unknown as ReturnType<typeof useThreads>)

    renderWithQuery(<MarkdownViewer {...defaultProps} />)
    expect(await screen.findByText(/1 open/)).toBeInTheDocument()
  })
})
