import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Thread } from './Thread'
import type { Thread as ThreadType } from '../../types/thread'

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    isAuthenticated: true,
    initAuth: vi.fn(),
    signOut: vi.fn(),
    state: { status: 'authenticated' },
    token: 'fake-token',
    user: { login: 'reviewer', avatarUrl: 'https://example.com/avatar.png', url: '' },
  })),
}))

vi.mock('../MarkdownBody', () => ({
  MarkdownBody: ({ markdown, className }: { markdown: string; className?: string }) => (
    <div className={className} data-testid="markdown-body">{markdown}</div>
  ),
}))

const baseThread: ThreadType = {
  id: 'D_thread1',
  number: 1,
  title: '[doc-review] docs/spec.md:10-12',
  body: '> the selected text\n\nThis needs clarification.\n\n<!-- docs-review-meta\n{}\n-->',
  closed: false,
  author: { login: 'alice', avatarUrl: 'https://example.com/alice.png', url: '' },
  createdAt: new Date(Date.now() - 60000).toISOString(),
  coordinates: {
    project: 'Platform Core',
    file: 'docs/spec.md',
    selectedText: 'the selected text',
    sectionContext: '## Overview',
    startLine: 10,
    endLine: 12,
    commitSha: 'abc123',
  },
  replies: [],
  reactionGroups: [],
}

const defaultProps = {
  thread: baseThread,
  isOutdated: false,
  onClose: vi.fn(),
  onReply: vi.fn().mockResolvedValue(undefined),
  onResolve: vi.fn().mockResolvedValue(undefined),
  onReopen: vi.fn().mockResolvedValue(undefined),
  onSignIn: vi.fn(),
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Thread', () => {
  it('renders the quoted selected text', () => {
    render(<Thread {...defaultProps} />)
    expect(screen.getByText('the selected text')).toBeInTheDocument()
  })

  it('renders the section context', () => {
    render(<Thread {...defaultProps} />)
    expect(screen.getByText(/Overview/)).toBeInTheDocument()
  })

  it('renders the author login', () => {
    render(<Thread {...defaultProps} />)
    expect(screen.getByText('alice')).toBeInTheDocument()
  })

  it('shows Outdated badge when isOutdated is true', () => {
    render(<Thread {...defaultProps} isOutdated />)
    expect(screen.getByText('Outdated')).toBeInTheDocument()
  })

  it('does not show Outdated badge when isOutdated is false', () => {
    render(<Thread {...defaultProps} isOutdated={false} />)
    expect(screen.queryByText('Outdated')).not.toBeInTheDocument()
  })

  it('shows Resolved badge when thread is closed', () => {
    render(<Thread {...defaultProps} thread={{ ...baseThread, closed: true }} />)
    expect(screen.getByText('Resolved')).toBeInTheDocument()
  })

  it('shows "Resolve" action for an open thread', () => {
    render(<Thread {...defaultProps} />)
    expect(screen.getByRole('button', { name: 'Resolve' })).toBeInTheDocument()
  })

  it('shows "Reopen" action for a closed thread', () => {
    render(<Thread {...defaultProps} thread={{ ...baseThread, closed: true }} />)
    expect(screen.getByRole('button', { name: 'Reopen' })).toBeInTheDocument()
  })

  it('calls onResolve when Resolve is clicked', async () => {
    render(<Thread {...defaultProps} />)
    await userEvent.click(screen.getByRole('button', { name: 'Resolve' }))
    expect(defaultProps.onResolve).toHaveBeenCalledOnce()
  })

  it('calls onReopen when Reopen is clicked', async () => {
    render(<Thread {...defaultProps} thread={{ ...baseThread, closed: true }} />)
    await userEvent.click(screen.getByRole('button', { name: 'Reopen' }))
    expect(defaultProps.onReopen).toHaveBeenCalledOnce()
  })

  it('shows reply composer when Reply is clicked', async () => {
    render(<Thread {...defaultProps} />)
    await userEvent.click(screen.getByRole('button', { name: 'Reply' }))
    expect(screen.getByPlaceholderText('Add a comment…')).toBeInTheDocument()
  })

  it('renders replies when present', () => {
    const thread: ThreadType = {
      ...baseThread,
      replies: [
        {
          id: 'r1',
          body: 'Good point.',
          author: { login: 'bob', avatarUrl: '', url: '' },
          createdAt: new Date().toISOString(),
          reactionGroups: [],
        },
      ],
    }
    render(<Thread {...defaultProps} thread={thread} />)
    expect(screen.getByText('bob')).toBeInTheDocument()
  })

  it('submits a reply and calls onReply', async () => {
    render(<Thread {...defaultProps} />)
    await userEvent.click(screen.getByRole('button', { name: 'Reply' }))

    const textarea = screen.getByPlaceholderText('Add a comment…')
    await userEvent.type(textarea, 'Agreed, needs more detail.')
    await userEvent.click(screen.getByRole('button', { name: 'Reply' }))

    await waitFor(() => {
      expect(defaultProps.onReply).toHaveBeenCalledWith('Agreed, needs more detail.')
    })
  })
})
