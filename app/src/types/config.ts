export interface ProjectConfig {
  name: string
  path: string
  description?: string
}

export interface DocsReviewConfig {
  projects: ProjectConfig[]
  settings: {
    default_project?: string
    file_extensions: string[]
    exclude: string[]
  }
}

export interface BuildConfig {
  repo: {
    owner: string
    name: string
  }
  oauthClientId: string
  githubApiUrl: string
  config: DocsReviewConfig
}
