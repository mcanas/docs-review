export interface ThreadCoordinates {
  project: string
  file: string
  selectedText: string
  sectionContext: string
  startLine: number
  endLine: number
  commitSha: string
}

export interface ThreadAuthor {
  login: string
  avatarUrl: string
  url: string
}

export interface ThreadReply {
  id: string
  body: string
  author: ThreadAuthor
  createdAt: string
  reactionGroups: ReactionGroup[]
}

export interface ReactionGroup {
  content: string
  reactors: { totalCount: number }
}

export interface Thread {
  id: string
  number: number
  title: string
  body: string
  closed: boolean
  author: ThreadAuthor
  createdAt: string
  coordinates: ThreadCoordinates
  replies: ThreadReply[]
  reactionGroups: ReactionGroup[]
}
