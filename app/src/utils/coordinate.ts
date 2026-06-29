export interface SelectionCoordinates {
  selectedText: string
  startLine: number
  endLine: number
  sectionContext: string
}

export function extractSelectionCoordinates(
  selection: Selection,
  sourceLines: string[],
  renderedContainer: HTMLElement,
): SelectionCoordinates | null {
  if (!selection.rangeCount || selection.isCollapsed) return null

  const range = selection.getRangeAt(0)
  const selectedText = range.toString().trim()
  if (!selectedText) return null

  const startEl = range.startContainer.parentElement
  const endEl = range.endContainer.parentElement

  const startLine = findSourceLine(startEl, renderedContainer, sourceLines, selectedText, 'start')
  const endLine = findSourceLine(endEl, renderedContainer, sourceLines, selectedText, 'end')
  const sectionContext = findNearestHeading(range.startContainer, renderedContainer)

  return { selectedText, startLine, endLine, sectionContext }
}

const BLOCK_TAGS = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'blockquote', 'pre', 'td', 'th', 'dt', 'dd'])

function findSourceLine(
  el: Element | null,
  container: HTMLElement,
  sourceLines: string[],
  selectedText: string,
  _hint: 'start' | 'end',
): number {
  if (!el || !container.contains(el)) return 0

  // Walk up to the nearest block element — inline elements like <strong>/<code>
  // have very short textContent that can ambiguously match the wrong source line.
  let block: Element = el
  while (!BLOCK_TAGS.has(block.tagName.toLowerCase()) && block.parentElement && block.parentElement !== container) {
    block = block.parentElement
  }

  const textContent = block.textContent ?? ''
  const firstWord = selectedText.split(/\s+/)[0]

  const lineIndex = sourceLines.findIndex((line) => line.includes(firstWord) && line.includes(textContent.slice(0, 40)))
  return lineIndex === -1 ? 0 : lineIndex + 1
}

function findNearestHeading(node: Node, container: HTMLElement): string {
  let current: Node | null = node
  while (current && current !== container) {
    if (current.nodeType === Node.ELEMENT_NODE) {
      const el = current as Element
      if (/^H[1-6]$/.test(el.tagName)) return el.textContent ?? ''
      const prev = el.previousElementSibling
      if (prev && /^H[1-6]$/.test(prev.tagName)) return prev.textContent ?? ''
    }
    current = current.parentNode
  }
  return ''
}
