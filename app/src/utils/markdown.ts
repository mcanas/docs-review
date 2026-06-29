/* eslint-disable @typescript-eslint/no-explicit-any */
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import rehypeStringify from 'rehype-stringify'
import { createHighlighterCore } from 'shiki/core'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'
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

// Converts ```mermaid blocks into <div data-mermaid="..."> placeholders before
// rehype-sanitize runs, so the diagram source survives sanitization intact.
function rehypeMermaidPlaceholder() {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element, index, parent) => {
      if (
        node.tagName !== 'pre' ||
        !parent ||
        index == null
      ) return

      const code = node.children.find(
        (c): c is Element =>
          c.type === 'element' &&
          c.tagName === 'code' &&
          String(c.properties?.className ?? '').includes('language-mermaid'),
      )
      if (!code) return

      const source = code.children
        .filter((c) => c.type === 'text')
        .map((c) => (c as { value: string }).value)
        .join('')

      // Replace the <pre> with a placeholder <div> that survives sanitization
      ;(parent.children as Element[])[index] = {
        type: 'element',
        tagName: 'div',
        properties: {
          className: ['mermaid-pending'],
          dataMermaid: btoa(unescape(encodeURIComponent(source))),
        },
        children: [],
      }
    })
  }
}

const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    '*': [...(defaultSchema.attributes?.['*'] ?? []), 'data*'],
    code: [...(defaultSchema.attributes?.['code'] ?? []), 'className'],
    span: [...(defaultSchema.attributes?.['span'] ?? []), 'className', 'style'],
    div: [...(defaultSchema.attributes?.['div'] ?? []), 'className', 'dataMermaid'],
  },
}

// Only the langs we actually need — each is a separate dynamic import (code-split by Vite)
const LANGS = [
  () => import('shiki/langs/typescript.mjs'),
  () => import('shiki/langs/javascript.mjs'),
  () => import('shiki/langs/tsx.mjs'),
  () => import('shiki/langs/jsx.mjs'),
  () => import('shiki/langs/python.mjs'),
  () => import('shiki/langs/bash.mjs'),
  () => import('shiki/langs/yaml.mjs'),
  () => import('shiki/langs/json.mjs'),
  () => import('shiki/langs/sql.mjs'),
  () => import('shiki/langs/go.mjs'),
  () => import('shiki/langs/rust.mjs'),
  () => import('shiki/langs/java.mjs'),
  () => import('shiki/langs/markdown.mjs'),
  () => import('shiki/langs/graphql.mjs'),
]

let highlighterPromise: ReturnType<typeof createHighlighterCore> | null = null

function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighterCore({
      themes: [import('shiki/themes/github-light.mjs')],
      langs: LANGS.map((fn) => fn()),
      engine: createJavaScriptRegexEngine(),
    })
  }
  return highlighterPromise
}

export async function renderMarkdown(markdown: string): Promise<string> {
  const highlighter = await getHighlighter()
  const shikiPlugin = rehypeShikiFromHighlighter(highlighter as any, {
    theme: 'github-light',
    fallbackLanguage: 'text',
    addLanguageClass: true,
  })

  const file = await (unified() as any)
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: false })
    .use(rehypeLineNumbers)
    .use(rehypeMermaidPlaceholder)
    .use(() => shikiPlugin)
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
