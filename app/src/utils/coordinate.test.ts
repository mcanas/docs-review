// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { findNearestHeading, extractSourceLines } from './markdown'

describe('extractSourceLines', () => {
  it('splits on newlines', () => {
    const lines = extractSourceLines('line one\nline two\nline three')
    expect(lines).toEqual(['line one', 'line two', 'line three'])
  })

  it('handles empty string', () => {
    expect(extractSourceLines('')).toEqual([''])
  })

  it('preserves blank lines', () => {
    const lines = extractSourceLines('a\n\nb')
    expect(lines).toHaveLength(3)
    expect(lines[1]).toBe('')
  })
})

describe('findNearestHeading', () => {
  const source = [
    '# Document Title',       // line 1 (index 0)
    '',                        // line 2
    '## Section One',          // line 3 (index 2)
    '',                        // line 4
    'Some paragraph text.',    // line 5 (index 4)
    '',                        // line 6
    'More paragraph text.',    // line 7 (index 6)
    '',                        // line 8
    '## Section Two',          // line 9 (index 8)
    '',                        // line 10
    'Section two content.',    // line 11 (index 10)
  ]

  it('returns the nearest preceding heading for a paragraph', () => {
    // Line 5 (index 4) is under "Section One"
    expect(findNearestHeading(5, source)).toBe('Section One')
  })

  it('returns the nearest heading when multiple headings exist', () => {
    // Line 11 (index 10) is under "Section Two"
    expect(findNearestHeading(11, source)).toBe('Section Two')
  })

  it('returns the document title when content is before first section', () => {
    // If content appears before any ## heading, the h1 should be returned
    expect(findNearestHeading(2, source)).toBe('Document Title')
  })

  it('returns empty string when no heading precedes the line', () => {
    const noHeadings = ['paragraph one', 'paragraph two']
    expect(findNearestHeading(2, noHeadings)).toBe('')
  })

  it('returns the heading itself when the selection is on a heading line', () => {
    // Line 3 (index 2) is "## Section One" — scanning back from index 2 finds it immediately
    expect(findNearestHeading(3, source)).toBe('Section One')
  })
})
