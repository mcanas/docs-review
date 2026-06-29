import { useState, useEffect } from 'react'
import { useBuildConfig } from '../contexts/ConfigContext'
import { useAuth } from '../contexts/AuthContext'
import { useRepoTree } from '../hooks/useFileContent'
import { useThreads } from '../hooks/useDiscussions'
import { ProjectSelector } from './Sidebar/ProjectSelector'
import { FileTree } from './Sidebar/FileTree'
import { UserMenu } from './Auth/UserMenu'
import { MarkdownViewer } from './MarkdownViewer/MarkdownViewer'

function useUrlParams() {
  const params = new URLSearchParams(window.location.search)
  const [project, setProjectState] = useState(params.get('project') ?? '')
  const [file, setFileState] = useState(params.get('file') ?? '')

  const setProject = (name: string) => {
    const p = new URLSearchParams(window.location.search)
    p.set('project', name)
    p.delete('file')
    window.history.pushState({}, '', `?${p}`)
    setProjectState(name)
    setFileState('')
  }

  const setFile = (path: string) => {
    const p = new URLSearchParams(window.location.search)
    p.set('file', path)
    window.history.pushState({}, '', `?${p}`)
    setFileState(path)
  }

  return { project, file, setProject, setFile }
}

export function App() {
  const config = useBuildConfig()
  const { token, githubApiUrl } = { ...useAuth(), githubApiUrl: useBuildConfig().githubApiUrl }
  const { repo } = config
  const baseUrl = githubApiUrl !== 'https://api.github.com' ? githubApiUrl : undefined

  const { project: urlProject, file: urlFile, setProject, setFile } = useUrlParams()

  const defaultProject = config.config.settings.default_project ?? config.config.projects[0]?.name ?? ''
  const [selectedProject, setSelectedProjectState] = useState(urlProject || defaultProject)

  const projectConfig = config.config.projects.find((p) => p.name === selectedProject)

  const handleProjectChange = (name: string) => {
    setSelectedProjectState(name)
    setProject(name)
  }

  const { data: treeData, isLoading: treeLoading } = useRepoTree(
    repo.owner, repo.name, token, baseUrl,
  )

  const { data: allThreads = [] } = useThreads(
    repo.owner, repo.name, urlFile, token, githubApiUrl,
  )

  useEffect(() => {
    if (!urlProject && defaultProject) {
      setSelectedProjectState(defaultProject)
    }
  }, [urlProject, defaultProject])

  const currentSha = treeData?.sha ?? ''

  return (
    <div className="flex flex-col h-screen bg-white text-gray-900 font-sans">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-semibold text-gray-900">Docs Review</span>
          <span className="text-gray-300">/</span>
          <span className="text-gray-500">{repo.owner}/{repo.name}</span>
          {urlFile && (
            <>
              <span className="text-gray-300">/</span>
              <span className="text-gray-700 truncate max-w-xs">{urlFile.split('/').pop()}</span>
            </>
          )}
        </div>
        <UserMenu />
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-60 shrink-0 border-r border-gray-100 flex flex-col overflow-hidden">
          <ProjectSelector
            projects={config.config.projects}
            selected={selectedProject}
            onChange={handleProjectChange}
          />
          <div className="flex-1 overflow-y-auto">
            {treeLoading ? (
              <p className="px-3 py-4 text-sm text-gray-400">Loading…</p>
            ) : treeData && projectConfig ? (
              <FileTree
                items={treeData.items}
                projectPath={projectConfig.path}
                selectedFile={urlFile}
                onSelect={setFile}
                threads={allThreads}
                extensions={config.config.settings.file_extensions}
              />
            ) : !token ? (
              <p className="px-3 py-4 text-xs text-gray-400">Sign in to browse files.</p>
            ) : null}
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 overflow-auto">
          {urlFile ? (
            <MarkdownViewer
              filePath={urlFile}
              projectName={selectedProject}
              currentCommitSha={currentSha}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3">
              <svg className="w-10 h-10 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm text-gray-400">Select a document to review</p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
