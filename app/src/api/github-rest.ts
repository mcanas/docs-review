import { Octokit } from '@octokit/rest'
import type { GitHubFileContent, GitHubTreeItem, GitHubUser } from '../types/github'
import type { Thread } from '../types/thread'
import { deserializeCoordinates } from '../utils/discussion'

export function createRestClient(token: string, baseUrl?: string): Octokit {
  return new Octokit({ auth: token, baseUrl })
}

export async function fetchUser(client: Octokit): Promise<GitHubUser> {
  const { data } = await client.users.getAuthenticated()
  return {
    login: data.login,
    name: data.name,
    avatarUrl: data.avatar_url,
    url: data.html_url,
  }
}

export async function fetchFileContent(
  client: Octokit,
  owner: string,
  repo: string,
  path: string,
  ref?: string,
): Promise<GitHubFileContent> {
  const { data } = await client.repos.getContent({ owner, repo, path, ref })
  if (Array.isArray(data) || data.type !== 'file') {
    throw new Error(`${path} is not a file`)
  }
  return {
    content: atob(data.content.replace(/\n/g, '')),
    sha: data.sha,
    path: data.path,
  }
}

export async function fetchRepoTree(
  client: Octokit,
  owner: string,
  repo: string,
  treeSha: string,
): Promise<GitHubTreeItem[]> {
  const { data } = await client.git.getTree({ owner, repo, tree_sha: treeSha, recursive: '1' })
  return (data.tree as GitHubTreeItem[]).filter((item) => item.type === 'blob' || item.type === 'tree')
}

export async function fetchDefaultBranchSha(client: Octokit, owner: string, repo: string): Promise<string> {
  const { data: repoData } = await client.repos.get({ owner, repo })
  const branch = repoData.default_branch
  const { data: branchData } = await client.repos.getBranch({ owner, repo, branch })
  return branchData.commit.sha
}

export async function createIssue(
  client: Octokit,
  owner: string,
  repo: string,
  title: string,
  body: string,
): Promise<Thread> {
  const { data } = await client.issues.create({ owner, repo, title, body, labels: ['doc-review'] })
  return {
    id: data.node_id,
    number: data.number,
    title: data.title,
    body: data.body ?? '',
    closed: data.state === 'closed',
    author: {
      login: data.user?.login ?? '',
      avatarUrl: data.user?.avatar_url ?? '',
      url: data.user?.html_url ?? '',
    },
    createdAt: data.created_at,
    coordinates: deserializeCoordinates(data.body ?? '')!,
    replies: [],
    reactionGroups: [],
  }
}
