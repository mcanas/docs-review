# Docs Review — Specification

## 1. Objective

A GitHub-native markdown documentation review platform that replicates Confluence-style threaded inline commenting directly on markdown files, with all content and commentary stored in GitHub. The tool installs as a reusable GitHub Actions workflow into any repository and serves a static review interface via GitHub Pages — no external services required.

**Target users:** Engineering teams practicing spec-driven development on GitHub Enterprise who need collaborative review workflows for BRDs, URSs, technical designs, and other markdown documentation stored in a shared repo.

**Success criteria:**
- Any contributor can comment on a specific line or range of lines in a markdown doc
- Comments are threaded, resolvable, and persisted as GitHub Discussions
- Authors receive notifications via GitHub's native notification system
- The interface is accessible to all org members who have repo access
- Zero external service dependencies beyond GitHub itself

---

## 2. Architecture

### Deployment Model

```
Target Repo (customer's repo)
├── .github/
│   └── workflows/
│       └── docs-review.yml        ← user adds this (calls the reusable workflow)
├── docs-review.config.yml          ← user adds this (project config)
└── projects/
    ├── alpha/docs/
    └── beta/docs/
```

The reusable workflow (hosted in this project's repo) builds a React SPA and deploys it to the `gh-pages` branch of the target repo. The SPA is configured at build time with the target repo coordinates; all other data is fetched at runtime from GitHub's API.

### Runtime Architecture

```
Browser (org member)
  │  loads static SPA from GitHub Pages (internal, org-restricted)
  ▼
React SPA
  ├── GitHub REST API v3        → fetch file contents, repo tree, user profile
  ├── GitHub GraphQL API v4     → read/write Discussions (comments, threads)
  └── GitHub OAuth Device Flow  → authenticate user, store token in localStorage
```

No server-side component. All API calls go directly from the browser to GitHub's API using the authenticated user's token.

### Comment Storage

Comments are stored as **GitHub Discussions** in the target repo:
- **Category:** `📝 Doc Reviews` (auto-created via API on first authenticated use if not present)
- **One Discussion per thread** — each thread is unique to a file path + line range
- **Discussion body** contains structured metadata as a fenced JSON block (see Data Model below)
- **Discussion comments** (replies) are the thread's conversation
- **Label:** `doc-review` on all threads to isolate them from project Discussions

### Git Coordinate Model

Each comment thread captures the line coordinates at time of posting:

```json
{
  "project": "Platform Core",
  "file": "projects/platform/docs/design.md",
  "startLine": 42,
  "endLine": 44,
  "commitSha": "abc123def456...",
  "lineContent": "the exact text of the commented line(s)"
}
```

Threads are displayed inline relative to the current file. If the current HEAD `commitSha` differs from the thread's recorded `commitSha`, the thread is marked **Outdated** with the original line content shown as a quote.

---

## 3. Installation & Setup

### Prerequisites

- GitHub Discussions enabled on the target repo (repo Settings → Features → Discussions)
- A GitHub OAuth App registered in the org/GHE instance with **Device Flow** enabled (Client ID only required — device flow is a public-client flow, no secret needed in the browser)
- GitHub Pages enabled on the target repo, serving from the `gh-pages` branch

### Installation Steps

1. Register a GitHub OAuth App in the org with Device Flow enabled; note the Client ID
2. Add `docs-review.config.yml` to the repo root (see Config Reference below)
3. Add `.github/workflows/docs-review.yml` to the repo (see Workflow Reference below)
4. Set `DOCS_REVIEW_CLIENT_ID` as a repository variable (not a secret — it's public-client)
5. Push — the workflow builds and deploys the SPA to GitHub Pages

### Workflow Reference (`.github/workflows/docs-review.yml`)

```yaml
name: Deploy Docs Review

on:
  push:
    branches: [main]
    paths:
      - 'docs-review.config.yml'

  workflow_dispatch:

jobs:
  deploy:
    uses: <org>/docs-review/.github/workflows/reusable-deploy.yml@main
    with:
      config-path: 'docs-review.config.yml'
    secrets:
      client-id: ${{ vars.DOCS_REVIEW_CLIENT_ID }}
```

### Config Reference (`docs-review.config.yml`)

```yaml
projects:
  - name: "Platform Core"
    path: "projects/platform/docs"
    description: "Core platform architecture and design docs"
  - name: "Mobile SDK"
    path: "projects/mobile/docs"
    description: "Mobile SDK specifications and BRDs"

settings:
  default_project: "Platform Core"
  file_extensions: [".md", ".mdx"]
  exclude:
    - "**/CHANGELOG.md"
    - "**/node_modules/**"
```

---

## 4. Core Features

### F1 — Markdown Viewer
- Render markdown with a line-number gutter on the left
- Full GFM support: tables, task lists, strikethrough, footnotes
- Syntax highlighting for fenced code blocks (via Shiki)
- Frontmatter rendered as a collapsible metadata panel
- Hover on any line reveals a comment affordance (➕ icon in gutter)

### F2 — Inline Comment Threads
- Click the ➕ gutter icon to open a thread composer anchored to that line
- Click-drag across consecutive line numbers to select a multi-line range
- Thread composer: markdown input with live preview tab
- Submitting requires authentication — triggers Device Flow prompt if unauthenticated
- After posting, thread anchor renders inline directly below the commented line(s)
- Thread is collapsed by default; click to expand

### F3 — Threaded Replies
- Expanding a thread shows all replies in chronological order
- Each reply shows: author avatar, display name, relative timestamp, markdown body
- Reply composer at the bottom of an expanded thread
- Reactions (👍 👎 ❤️ 🎉) on thread root and individual replies via GitHub API

### F4 — Thread Resolution
- Any authenticated repo member can resolve or reopen a thread
- Resolution state stored on the Discussion (close/reopen via GraphQL `closeDiscussion` / `reopenDiscussion`)
- Resolved threads collapse to a single "Resolved" badge inline; expandable
- File header shows counts: `N open · M resolved`

### F5 — Project Navigation
- Left sidebar: project selector dropdown + file tree scoped to the selected project path
- File tree mirrors repo directory structure, collapsible folders
- Each file in the tree shows a badge with its open thread count
- Breadcrumb header: `Project Name › path/to/file.md`
- URL scheme: `/?project=platform-core&file=design.md` for deep-linking and sharing

### F6 — Authentication
- GitHub OAuth Device Flow: user clicks "Sign in" → device code displayed → user visits GitHub device activation URL → token obtained
- Token stored in `localStorage` under a namespaced key
- Unauthenticated users: full read access (file content + comments)
- Auth prompt appears contextually when write action is attempted
- "Sign out" clears the token from `localStorage`

### F7 — Outdated Thread Handling
- When a thread's `commitSha` differs from the current HEAD, the thread anchor shows an **Outdated** badge
- Expanding an outdated thread shows the original quoted line content from the thread metadata
- Outdated threads are still shown inline at their best-effort line position

### F8 — Notification Passthrough
- No custom notification system implemented
- GitHub's native Discussion notification system handles all email/web alerts to participants
- Participants are auto-subscribed per their GitHub notification settings

---

## 5. Project Structure

```
docs-review/                         ← this repository
├── .github/
│   └── workflows/
│       └── reusable-deploy.yml      ← reusable workflow (called by target repos)
├── action/
│   └── action.yml                   ← composite action entry point
├── app/                             ← React SPA source
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sidebar/
│   │   │   │   ├── ProjectSelector.tsx
│   │   │   │   └── FileTree.tsx
│   │   │   ├── MarkdownViewer/
│   │   │   │   ├── MarkdownViewer.tsx
│   │   │   │   ├── LineGutter.tsx
│   │   │   │   └── ThreadAnchor.tsx
│   │   │   ├── CommentThread/
│   │   │   │   ├── Thread.tsx
│   │   │   │   ├── ThreadComposer.tsx
│   │   │   │   └── Reply.tsx
│   │   │   └── Auth/
│   │   │       ├── DeviceFlowModal.tsx
│   │   │       └── UserMenu.tsx
│   │   ├── hooks/
│   │   │   ├── useGitHubAuth.ts     ← device flow + token management
│   │   │   ├── useFileContent.ts    ← fetch file content + tree via REST
│   │   │   ├── useDiscussions.ts    ← read/write threads via GraphQL
│   │   │   └── useConfig.ts        ← parse baked-in build config
│   │   ├── api/
│   │   │   ├── github-rest.ts       ← Octokit REST client
│   │   │   └── github-graphql.ts    ← Octokit GraphQL client + query definitions
│   │   ├── types/
│   │   │   ├── config.ts
│   │   │   ├── thread.ts
│   │   │   └── github.ts
│   │   └── utils/
│   │       ├── coordinate.ts        ← line coordinate mapping utilities
│   │       └── discussion.ts        ← Discussion metadata serialization
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── package.json
├── docs-review.config.schema.json   ← JSON Schema for config validation in CI
└── README.md
```

---

## 6. Code Style & Conventions

- **Language:** TypeScript with `strict: true` — no `any`, no type assertions without a comment
- **Framework:** React 18 — functional components and hooks only, no class components
- **Styling:** Tailwind CSS — utility-first; no custom CSS files unless a Tailwind utility gap exists
- **Server state:** TanStack Query (React Query) for all GitHub API data — no manual fetch/loading/error state
- **Auth/Config state:** React Context — one `AuthContext`, one `ConfigContext`
- **API clients:** `@octokit/rest` for REST, `@octokit/graphql` for GraphQL — no raw `fetch` calls to GitHub
- **No inline comments** unless the behavior would surprise a reader unfamiliar with the codebase
- **No `useEffect` for derived state** — compute derived values inline or with `useMemo`
- **Named exports only** — no default exports (aids refactoring and search)
- **File naming:** PascalCase for components, camelCase for hooks/utils

---

## 7. Testing Strategy

- **Unit tests (Vitest):** Pure functions in `utils/` — coordinate mapping, Discussion metadata serialization/deserialization, config parsing and validation
- **Component tests (React Testing Library + Vitest):** `CommentThread`, `MarkdownViewer`, `ThreadAnchor` — test user-visible behavior, not implementation details
- **API integration tests (MSW):** Mock GitHub REST and GraphQL API responses to test `useDiscussions` and `useFileContent` hooks end-to-end within the component tree
- **No E2E tests in MVP** — GitHub Device Flow OAuth cannot be automated against a real GHE instance without significant test infrastructure

**Coverage target:** 80% on `utils/` and `api/` modules; component tests cover happy path and primary error states.

---

## 8. Boundaries

### Always
- Record `commitSha` at the moment a comment thread is created — never omit it
- Scope all Discussion reads and writes by the `doc-review` label to avoid polluting the repo's general Discussions
- Validate `docs-review.config.yml` against the JSON Schema in CI before the build proceeds — fail fast with a clear error
- Authenticate the user before any write operation (comment, reply, resolve, reopen)
- Apply `rel="noopener noreferrer"` to any external links rendered from markdown content
- Show an **Outdated** indicator on any thread whose `commitSha` does not match the current HEAD

### Ask First (require explicit user action in the UI)
- Auto-creating the `📝 Doc Reviews` Discussion category if it does not exist — inform the user and request confirmation before creating
- Deleting a comment thread (closing/deleting a Discussion) — present a confirmation dialog; this action is visible to all participants

### Never
- Store the OAuth token anywhere except `localStorage` — no cookies, no URL parameters, no `sessionStorage`
- Write commits or modify files in the target repo from the SPA (the app is read-only with respect to repo content)
- Expose an OAuth client secret in the browser — device flow is intentionally a public-client flow using only the Client ID
- Create Discussions outside the designated `📝 Doc Reviews` category
- Render unsanitized HTML from markdown — always pass content through the `rehype-sanitize` pipeline
