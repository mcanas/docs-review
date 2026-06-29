// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  serializeCoordinates,
  deserializeCoordinates,
  buildDiscussionTitle,
  buildDiscussionBody,
} from './discussion'
import type { ThreadCoordinates } from '../types/thread'

const coords: ThreadCoordinates = {
  project: 'Platform Core',
  file: 'projects/platform/docs/design.md',
  selectedText: 'the authentication flow',
  sectionContext: '## Authentication',
  startLine: 42,
  endLine: 44,
  commitSha: 'abc123',
}

describe('serializeCoordinates / deserializeCoordinates', () => {
  it('round-trips coordinates through body text', () => {
    const body = `Some comment text\n\n${serializeCoordinates(coords)}`
    expect(deserializeCoordinates(body)).toEqual(coords)
  })

  it('returns null when metadata block is absent', () => {
    expect(deserializeCoordinates('plain comment body, no metadata')).toBeNull()
  })

  it('returns null when metadata JSON is malformed', () => {
    const bad = '<!-- docs-review-meta\nnot valid json\n-->'
    expect(deserializeCoordinates(bad)).toBeNull()
  })

  it('preserves unicode in selectedText', () => {
    const unicode: ThreadCoordinates = { ...coords, selectedText: '日本語テキスト' }
    const body = serializeCoordinates(unicode)
    expect(deserializeCoordinates(body)?.selectedText).toBe('日本語テキスト')
  })
})

describe('buildDiscussionTitle', () => {
  it('formats as [doc-review] path:start-end', () => {
    expect(buildDiscussionTitle('projects/platform/docs/design.md', 42, 44)).toBe(
      '[doc-review] projects/platform/docs/design.md:42-44',
    )
  })

  it('handles single-line selections (start === end)', () => {
    expect(buildDiscussionTitle('docs/spec.md', 10, 10)).toBe('[doc-review] docs/spec.md:10-10')
  })
})

describe('buildDiscussionBody', () => {
  it('includes quoted selectedText as a blockquote', () => {
    const body = buildDiscussionBody(coords, 'This needs clarification.')
    expect(body).toContain('> the authentication flow')
  })

  it('includes the opening comment', () => {
    const body = buildDiscussionBody(coords, 'This needs clarification.')
    expect(body).toContain('This needs clarification.')
  })

  it('includes serialized metadata', () => {
    const body = buildDiscussionBody(coords, 'Any comment.')
    expect(deserializeCoordinates(body)).toEqual(coords)
  })

  it('formats multi-line selectedText as a blockquote', () => {
    const multiLine: ThreadCoordinates = {
      ...coords,
      selectedText: 'line one\nline two\nline three',
    }
    const body = buildDiscussionBody(multiLine, 'Comment.')
    expect(body).toContain('> line one')
    expect(body).toContain('> line two')
    expect(body).toContain('> line three')
  })
})
