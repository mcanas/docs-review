import type { ThreadCoordinates } from '../types/thread'

const METADATA_FENCE = '<!-- docs-review-meta'
const METADATA_FENCE_END = '-->'

export function serializeCoordinates(coords: ThreadCoordinates): string {
  return `${METADATA_FENCE}\n${JSON.stringify(coords, null, 2)}\n${METADATA_FENCE_END}`
}

export function deserializeCoordinates(body: string): ThreadCoordinates | null {
  const start = body.indexOf(METADATA_FENCE)
  const end = body.indexOf(METADATA_FENCE_END, start)
  if (start === -1 || end === -1) return null

  try {
    const json = body.slice(start + METADATA_FENCE.length, end).trim()
    return JSON.parse(json) as ThreadCoordinates
  } catch {
    return null
  }
}

export function buildDiscussionTitle(file: string, startLine: number, endLine: number): string {
  return `[doc-review] ${file}:${startLine}-${endLine}`
}

export function buildDiscussionBody(coords: ThreadCoordinates, openingComment: string): string {
  const quote = coords.selectedText
    .split('\n')
    .map((l) => `> ${l}`)
    .join('\n')
  return `${quote}\n\n${openingComment}\n\n${serializeCoordinates(coords)}`
}
