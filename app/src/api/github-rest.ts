import { Octokit } from '@octokit/rest'
import type { GitHubFileContent, GitHubTreeItem, GitHubUser } from '../types/github'
import type { Thread, ReactionGroup } from '../types/thread'
import { deserializeCoordinates } from '../utils/discussion'

export function createRestClient(token: string | null, baseUrl?: string): Octokit {
  return new Octokit({ ...(token ? { auth: token } : {}), baseUrl })
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
  const binary = atob(data.content.replace(/\n/g, ''))
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
  return {
    content: new TextDecoder().decode(bytes),
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

export async function ensureDocReviewLabel(
  client: Octokit,
  owner: string,
  repo: string,
): Promise<void> {
  try {
    await client.issues.createLabel({ owner, repo, name: 'doc-review', color: '0075ca', description: 'Doc review thread' })
  } catch (e: any) {
    if (e.status !== 422) throw e
  }
}

export async function fetchThreadsForFile(
  client: Octokit,
  owner: string,
  repo: string,
  filePath: string,
): Promise<Thread[]> {
  const { data: issues } = await client.issues.listForRepo({
    owner, repo, labels: 'doc-review', state: 'all', per_page: 100,
  })

  const threads = await Promise.all(
    issues.map(async (issue) => {
      const coordinates = deserializeCoordinates(issue.body ?? '')
      if (!coordinates || coordinates.file !== filePath) return null

      const { data: comments } = await client.issues.listComments({
        owner, repo, issue_number: issue.number, per_page: 100,
      })

      return {
        id: issue.node_id,
        number: issue.number,
        title: issue.title,
        body: issue.body ?? '',
        closed: issue.state === 'closed',
        author: {
          login: issue.user?.login ?? '',
          avatarUrl: issue.user?.avatar_url ?? '',
          url: issue.user?.html_url ?? '',
        },
        createdAt: issue.created_at,
        coordinates,
        replies: comments.map((c) => ({
          id: c.node_id,
          body: c.body ?? '',
          author: {
            login: c.user?.login ?? '',
            avatarUrl: c.user?.avatar_url ?? '',
            url: c.user?.html_url ?? '',
          },
          createdAt: c.created_at,
          reactionGroups: [] as ReactionGroup[],
        })),
        reactionGroups: [] as ReactionGroup[],
      } satisfies Thread
    }),
  )

  return threads.filter((t): t is Thread => t !== null)
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
