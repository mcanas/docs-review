export interface GitHubUser {
  login: string
  name: string | null
  avatarUrl: string
  url: string
}

export interface GitHubTreeItem {
  path: string
  type: 'blob' | 'tree'
  sha: string
}

export interface GitHubFileContent {
  content: string
  sha: string
  path: string
}
