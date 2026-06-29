import { graphql } from '@octokit/graphql'
import type { Thread } from '../types/thread'
import { deserializeCoordinates } from '../utils/discussion'

export function createGraphQLClient(token: string, baseUrl?: string) {
  const url = baseUrl ? `${baseUrl}/graphql` : undefined
  return graphql.defaults({
    headers: { authorization: `token ${token}` },
    ...(url ? { baseUrl: url } : {}),
  })
}

const THREAD_FIELDS = `
  id
  number
  title
  body
  closed
  createdAt
  author { login avatarUrl url }
  reactionGroups { content reactors { totalCount } }
  comments(first: 50) {
    nodes {
      id
      body
      createdAt
      author { login avatarUrl url }
      reactionGroups { content reactors { totalCount } }
    }
  }
`

interface RawDiscussion {
  id: string
  number: number
  title: string
  body: string
  closed: boolean
  createdAt: string
  author: { login: string; avatarUrl: string; url: string }
  reactionGroups: Array<{ content: string; reactors: { totalCount: number } }>
  comments: {
    nodes: Array<{
      id: string
      body: string
      createdAt: string
      author: { login: string; avatarUrl: string; url: string }
      reactionGroups: Array<{ content: string; reactors: { totalCount: number } }>
    }>
  }
}

function mapDiscussion(raw: RawDiscussion): Thread | null {
  const coordinates = deserializeCoordinates(raw.body)
  if (!coordinates) return null
  return {
    id: raw.id,
    number: raw.number,
    title: raw.title,
    body: raw.body,
    closed: raw.closed,
    author: raw.author,
    createdAt: raw.createdAt,
    coordinates,
    replies: raw.comments.nodes.map((c) => ({
      id: c.id,
      body: c.body,
      author: c.author,
      createdAt: c.createdAt,
      reactionGroups: c.reactionGroups,
    })),
    reactionGroups: raw.reactionGroups,
  }
}

export async function fetchThreadsForFile(
  client: ReturnType<typeof createGraphQLClient>,
  owner: string,
  repo: string,
  filePath: string,
): Promise<Thread[]> {
  const query = `
    query($owner: String!, $repo: String!, $label: String!) {
      repository(owner: $owner, name: $repo) {
        issues(first: 100, labels: [$label], states: [OPEN, CLOSED], orderBy: { field: CREATED_AT, direction: ASC }) {
          nodes { ${THREAD_FIELDS} }
        }
      }
    }
  `
  const result = await client<{
    repository: { issues: { nodes: RawDiscussion[] } }
  }>(query, { owner, repo, label: 'doc-review' })

  return result.repository.issues.nodes
    .map(mapDiscussion)
    .filter((t): t is Thread => t !== null && t.coordinates.file === filePath)
}

export async function addReply(
  client: ReturnType<typeof createGraphQLClient>,
  subjectId: string,
  body: string,
): Promise<void> {
  const mutation = `
    mutation($subjectId: ID!, $body: String!) {
      addComment(input: { subjectId: $subjectId, body: $body }) { commentEdge { node { id } } }
    }
  `
  await client(mutation, { subjectId, body })
}

export async function closeThread(
  client: ReturnType<typeof createGraphQLClient>,
  issueId: string,
): Promise<void> {
  const mutation = `
    mutation($id: ID!) { closeIssue(input: { issueId: $id }) { issue { id } } }
  `
  await client(mutation, { id: issueId })
}

export async function reopenThread(
  client: ReturnType<typeof createGraphQLClient>,
  issueId: string,
): Promise<void> {
  const mutation = `
    mutation($id: ID!) { reopenIssue(input: { issueId: $id }) { issue { id } } }
  `
  await client(mutation, { id: issueId })
}
