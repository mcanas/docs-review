import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  createGraphQLClient,
  fetchThreadsForFile,
  createThread,
  addReply,
  closeThread,
  reopenThread,
  fetchOrCreateDocReviewCategory,
} from '../api/github-graphql'
import { buildDiscussionTitle, buildDiscussionBody } from '../utils/discussion'
import type { ThreadCoordinates } from '../types/thread'

function useGraphQL(token: string | null, githubApiUrl: string) {
  if (!token) return null
  const baseUrl = githubApiUrl !== 'https://api.github.com' ? githubApiUrl : undefined
  return createGraphQLClient(token, baseUrl)
}

export function useThreads(
  owner: string,
  repo: string,
  filePath: string,
  token: string | null,
  githubApiUrl: string,
) {
  const client = useGraphQL(token, githubApiUrl)
  return useQuery({
    queryKey: ['threads', owner, repo, filePath, token],
    enabled: !!client && !!filePath,
    queryFn: () => fetchThreadsForFile(client!, owner, repo, filePath),
  })
}

export function useCreateThread(
  owner: string,
  repo: string,
  token: string | null,
  githubApiUrl: string,
) {
  const queryClient = useQueryClient()
  const client = useGraphQL(token, githubApiUrl)

  return useMutation({
    mutationFn: async ({
      coordinates,
      comment,
    }: {
      coordinates: ThreadCoordinates
      comment: string
    }) => {
      if (!client) throw new Error('Not authenticated')
      const { repositoryId, categoryId } = await fetchOrCreateDocReviewCategory(client, owner, repo)
      const title = buildDiscussionTitle(coordinates.file, coordinates.startLine, coordinates.endLine)
      const body = buildDiscussionBody(coordinates, comment)
      return createThread(client, repositoryId, categoryId, title, body)
    },
    onSuccess: (_, { coordinates }) => {
      queryClient.invalidateQueries({ queryKey: ['threads', owner, repo, coordinates.file] })
    },
  })
}

export function useAddReply(
  owner: string,
  repo: string,
  filePath: string,
  token: string | null,
  githubApiUrl: string,
) {
  const queryClient = useQueryClient()
  const client = useGraphQL(token, githubApiUrl)

  return useMutation({
    mutationFn: async ({ discussionId, body }: { discussionId: string; body: string }) => {
      if (!client) throw new Error('Not authenticated')
      return addReply(client, discussionId, body)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['threads', owner, repo, filePath] })
    },
  })
}

export function useResolveThread(
  owner: string,
  repo: string,
  filePath: string,
  token: string | null,
  githubApiUrl: string,
) {
  const queryClient = useQueryClient()
  const client = useGraphQL(token, githubApiUrl)

  return useMutation({
    mutationFn: async ({ discussionId, close }: { discussionId: string; close: boolean }) => {
      if (!client) throw new Error('Not authenticated')
      return close ? closeThread(client, discussionId) : reopenThread(client, discussionId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['threads', owner, repo, filePath] })
    },
  })
}
