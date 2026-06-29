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
        discussions(first: 100, labels: [$label], orderBy: { field: CREATED_AT, direction: ASC }) {
          nodes { ${THREAD_FIELDS} }
        }
      }
    }
  `
  const result = await client<{
    repository: { discussions: { nodes: RawDiscussion[] } }
  }>(query, { owner, repo, label: 'doc-review' })

  return result.repository.discussions.nodes
    .map(mapDiscussion)
    .filter((t): t is Thread => t !== null && t.coordinates.file === filePath)
}

export async function createThread(
  client: ReturnType<typeof createGraphQLClient>,
  repositoryId: string,
  categoryId: string,
  title: string,
  body: string,
): Promise<Thread> {
  const mutation = `
    mutation($input: CreateDiscussionInput!) {
      createDiscussion(input: $input) {
        discussion { ${THREAD_FIELDS} }
      }
    }
  `
  const result = await client<{
    createDiscussion: { discussion: RawDiscussion }
  }>(mutation, {
    input: { repositoryId, categoryId, title, body },
  })

  const thread = mapDiscussion(result.createDiscussion.discussion)
  if (!thread) throw new Error('Failed to parse created thread')
  return thread
}

export async function addReply(
  client: ReturnType<typeof createGraphQLClient>,
  discussionId: string,
  body: string,
): Promise<void> {
  const mutation = `
    mutation($input: AddDiscussionCommentInput!) {
      addDiscussionComment(input: $input) { comment { id } }
    }
  `
  await client(mutation, { input: { discussionId, body } })
}

export async function closeThread(
  client: ReturnType<typeof createGraphQLClient>,
  discussionId: string,
): Promise<void> {
  const mutation = `
    mutation($id: ID!) { closeDiscussion(input: { discussionId: $id }) { discussion { id } } }
  `
  await client(mutation, { id: discussionId })
}

export async function reopenThread(
  client: ReturnType<typeof createGraphQLClient>,
  discussionId: string,
): Promise<void> {
  const mutation = `
    mutation($id: ID!) { reopenDiscussion(input: { discussionId: $id }) { discussion { id } } }
  `
  await client(mutation, { id: discussionId })
}

export async function fetchOrCreateDocReviewCategory(
  client: ReturnType<typeof createGraphQLClient>,
  owner: string,
  repo: string,
): Promise<{ repositoryId: string; categoryId: string }> {
  const query = `
    query($owner: String!, $repo: String!) {
      repository(owner: $owner, name: $repo) {
        id
        discussionCategories(first: 20) {
          nodes { id name }
        }
      }
    }
  `
  const result = await client<{
    repository: { id: string; discussionCategories: { nodes: Array<{ id: string; name: string }> } }
  }>(query, { owner, repo })

  const existing = result.repository.discussionCategories.nodes.find((c) => c.name === '📝 Doc Reviews')
  if (existing) {
    return { repositoryId: result.repository.id, categoryId: existing.id }
  }

  const createMutation = `
    mutation($input: CreateDiscussionCategoryInput!) {
      createDiscussionCategory(input: $input) { discussionCategory { id } }
    }
  `
  const created = await client<{
    createDiscussionCategory: { discussionCategory: { id: string } }
  }>(createMutation, {
    input: { repositoryId: result.repository.id, name: '📝 Doc Reviews', emoji: ':memo:', description: 'Doc review threads managed by docs-review' },
  })

  return {
    repositoryId: result.repository.id,
    categoryId: created.createDiscussionCategory.discussionCategory.id,
  }
}
