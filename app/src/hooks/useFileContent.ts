import { useQuery } from '@tanstack/react-query'
import { createRestClient, fetchFileContent, fetchRepoTree, fetchDefaultBranchSha } from '../api/github-rest'
import type { GitHubTreeItem } from '../types/github'

export function useFileContent(
  owner: string,
  repo: string,
  path: string,
  token: string | null,
  baseUrl?: string,
) {
  return useQuery({
    queryKey: ['file', owner, repo, path, token],
    enabled: !!path && !!token,
    queryFn: async () => {
      const client = createRestClient(token!, baseUrl)
      return fetchFileContent(client, owner, repo, path)
    },
  })
}

export function useRepoTree(
  owner: string,
  repo: string,
  token: string | null,
  baseUrl?: string,
) {
  return useQuery({
    queryKey: ['tree', owner, repo, token],
    enabled: !!token,
    queryFn: async () => {
      const client = createRestClient(token!, baseUrl)
      const sha = await fetchDefaultBranchSha(client, owner, repo)
      const items = await fetchRepoTree(client, owner, repo, sha)
      return { sha, items: items as GitHubTreeItem[] }
    },
  })
}
