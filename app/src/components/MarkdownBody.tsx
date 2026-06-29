import { useState, useEffect } from 'react'
import { renderMarkdown } from '../utils/markdown'

interface Props {
  markdown: string
  className?: string
}

export function MarkdownBody({ markdown, className }: Props) {
  const [html, setHtml] = useState('')

  useEffect(() => {
    if (!markdown.trim()) { setHtml(''); return }
    renderMarkdown(markdown).then(setHtml)
  }, [markdown])

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
