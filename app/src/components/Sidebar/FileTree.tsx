import { useState } from 'react'
import type { GitHubTreeItem } from '../../types/github'
import type { Thread } from '../../types/thread'

interface FileNode {
  name: string
  path: string
  type: 'blob' | 'tree'
  children: FileNode[]
}

function buildTree(items: GitHubTreeItem[], rootPath: string): FileNode[] {
  const relative = items
    .filter((i) => i.path.startsWith(rootPath + '/'))
    .map((i) => ({ ...i, path: i.path.slice(rootPath.length + 1) }))

  const roots: FileNode[] = []
  const byPath: Record<string, FileNode> = {}

  const sorted = [...relative].sort((a, b) => {
    if (a.type !== b.type) return a.type === 'tree' ? -1 : 1
    return a.path.localeCompare(b.path)
  })

  for (const item of sorted) {
    const parts = item.path.split('/')
    const name = parts[parts.length - 1]
    const node: FileNode = { name, path: item.path, type: item.type, children: [] }
    byPath[item.path] = node

    if (parts.length === 1) {
      roots.push(node)
    } else {
      const parentPath = parts.slice(0, -1).join('/')
      byPath[parentPath]?.children.push(node)
    }
  }

  return roots
}

function openThreadCountForFile(threads: Thread[], filePath: string): number {
  return threads.filter((t) => t.coordinates.file === filePath && !t.closed).length
}

interface FileNodeProps {
  node: FileNode
  projectPath: string
  selectedFile: string
  onSelect: (path: string) => void
  threads: Thread[]
  depth: number
}

function FileNodeRow({ node, projectPath, selectedFile, onSelect, threads, depth }: FileNodeProps) {
  const [open, setOpen] = useState(true)
  const fullPath = `${projectPath}/${node.path}`
  const isSelected = selectedFile === fullPath
  const openCount = node.type === 'blob' ? openThreadCountForFile(threads, fullPath) : 0

  if (node.type === 'tree') {
    return (
      <div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1 w-full text-left px-3 py-1 text-xs text-gray-500 hover:text-gray-700"
          style={{ paddingLeft: `${12 + depth * 12}px` }}
        >
          <span className="select-none">{open ? '▾' : '▸'}</span>
          <span className="font-medium">{node.name}</span>
        </button>
        {open && node.children.map((child) => (
          <FileNodeRow
            key={child.path}
            node={child}
            projectPath={projectPath}
            selectedFile={selectedFile}
            onSelect={onSelect}
            threads={threads}
            depth={depth + 1}
          />
        ))}
      </div>
    )
  }

  return (
    <button
      onClick={() => onSelect(fullPath)}
      className={`flex items-center justify-between w-full text-left px-3 py-1.5 text-sm rounded-md transition-colors ${
        isSelected ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
      }`}
      style={{ paddingLeft: `${12 + depth * 12}px` }}
    >
      <span className="truncate">{node.name}</span>
      {openCount > 0 && (
        <span className="ml-1 text-xs bg-blue-100 text-blue-600 rounded-full px-1.5 py-0.5 shrink-0">
          {openCount}
        </span>
      )}
    </button>
  )
}

interface Props {
  items: GitHubTreeItem[]
  projectPath: string
  selectedFile: string
  onSelect: (path: string) => void
  threads: Thread[]
  extensions: string[]
}

export function FileTree({ items, projectPath, selectedFile, onSelect, threads, extensions }: Props) {
  const filtered = items.filter(
    (i) => i.type === 'tree' || extensions.some((ext) => i.path.endsWith(ext)),
  )
  const nodes = buildTree(filtered, projectPath)

  if (nodes.length === 0) {
    return <p className="px-3 py-4 text-sm text-gray-400">No documents found.</p>
  }

  return (
    <div className="py-2">
      {nodes.map((node) => (
        <FileNodeRow
          key={node.path}
          node={node}
          projectPath={projectPath}
          selectedFile={selectedFile}
          onSelect={onSelect}
          threads={threads}
          depth={0}
        />
      ))}
    </div>
  )
}
