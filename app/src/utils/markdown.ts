/* eslint-disable @typescript-eslint/no-explicit-any */
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import rehypeStringify from 'rehype-stringify'
import { createHighlighter, type HighlighterGeneric } from 'shiki'
import rehypeShikiFromHighlighter from '@shikijs/rehype/core'
import { visit } from 'unist-util-visit'
import type { Root, Element } from 'hast'

const BLOCK_TAGS = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'blockquote', 'pre', 'table', 'hr']

function rehypeLineNumbers() {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element) => {
      if (!node.position || !BLOCK_TAGS.includes(node.tagName)) return
      node.properties ??= {}
      node.properties['dataLine'] = node.position.start.line
      node.properties['dataLineEnd'] = node.position.end.line
    })
  }
}

const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    '*': [...(defaultSchema.attributes?.['*'] ?? []), /^data-/],
    code: [...(defaultSchema.attributes?.['code'] ?? []), 'className'],
    span: [...(defaultSchema.attributes?.['span'] ?? []), 'className', 'style'],
  },
}

let highlighterPromise: Promise<HighlighterGeneric<any, any>> | null = null

function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ['github-light'],
      langs: ['typescript', 'javascript', 'tsx', 'jsx', 'python', 'bash', 'sh', 'yaml', 'json', 'sql', 'go', 'rust', 'java', 'markdown', 'text'],
    })
  }
  return highlighterPromise
}

export async function renderMarkdown(markdown: string): Promise<string> {
  const highlighter = await getHighlighter()
  const shikiPlugin = rehypeShikiFromHighlighter(highlighter as any, { theme: 'github-light', fallbackLanguage: 'text' })

  const file = await (unified() as any)
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: false })
    .use(rehypeLineNumbers)
    .use(shikiPlugin)
    .use(rehypeSanitize, sanitizeSchema)
    .use(rehypeStringify)
    .process(markdown)

  return String(file)
}

export function extractSourceLines(markdown: string): string[] {
  return markdown.split('\n')
}

export function findNearestHeading(lineNumber: number, sourceLines: string[]): string {
  for (let i = lineNumber - 1; i >= 0; i--) {
    if (sourceLines[i]?.startsWith('#')) {
      return sourceLines[i].replace(/^#+\s*/, '')
    }
  }
  return ''
}
