# Docs Review

A GitHub-native markdown documentation review tool. Adds Confluence-style threaded inline commenting to any markdown repository, served via GitHub Pages with all content and commentary stored in GitHub Discussions. No external services required.

---

## How it works

- Documents are written and committed as markdown files — no change to author workflow
- Reviewers open the GitHub Pages site, select text in the rendered document, and add comment threads
- Comments are stored as GitHub Discussions in the same repository
- GitHub's native notification system alerts participants
- All content stays in GitHub

---

## Installation

### Prerequisites

| Requirement | Notes |
|---|---|
| GitHub Discussions enabled | Repo Settings → Features → Discussions |
| GitHub Pages enabled | Repo Settings → Pages → Source: `gh-pages` branch |
| GitHub OAuth App | Register in your org/GHE instance with Device Flow enabled |

### 1 — Register a GitHub OAuth App

In your GitHub organisation (or GitHub Enterprise instance):

1. Go to **Settings → Developer settings → OAuth Apps → New OAuth App**
2. Set **Application name**: `Docs Review`
3. Set **Homepage URL**: your GitHub Pages URL (e.g. `https://your-org.github.io/your-repo`)
4. Leave **Authorization callback URL** blank — Device Flow does not use a redirect
5. Enable **Device Flow** under the OAuth App settings
6. Note the **Client ID** (you do not need a client secret)

### 2 — Add the config file

Create `docs-review.config.yml` in the root of your repository:

```yaml
projects:
  - name: "Platform Core"
    path: "projects/platform/docs"
    description: "Core platform architecture and design docs"
  - name: "Mobile SDK"
    path: "projects/mobile/docs"

settings:
  default_project: "Platform Core"
  file_extensions: [".md", ".mdx"]
  exclude:
    - "**/CHANGELOG.md"
    - "**/node_modules/**"
```

Each `path` is relative to the repository root and scopes the file tree shown for that project.

### 3 — Add the workflow

Create `.github/workflows/docs-review.yml`:

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
    uses: YOUR_ORG/docs-review/.github/workflows/reusable-deploy.yml@main
    with:
      config-path: 'docs-review.config.yml'
    secrets:
      client-id: ${{ vars.DOCS_REVIEW_CLIENT_ID }}
```

Replace `YOUR_ORG` with the organisation where this `docs-review` repository lives.

### 4 — Set the repository variable

In your repository: **Settings → Secrets and variables → Actions → Variables → New repository variable**

- **Name**: `DOCS_REVIEW_CLIENT_ID`
- **Value**: the Client ID from step 1

### 5 — Deploy

Push to `main` or trigger the workflow manually via **Actions → Deploy Docs Review → Run workflow**.

The site will be available at `https://YOUR_ORG.github.io/YOUR_REPO` (or your GHE equivalent) once the workflow completes.

---

## Reviewer workflow

1. Open the GitHub Pages URL
2. Click **Sign in** — you'll see a short device code; visit the displayed URL and enter it in your GitHub account
3. Select a project from the sidebar, then select a document
4. Highlight any text in the rendered document → click **Add comment**
5. Write your comment (markdown supported) → **Start thread**
6. Other reviewers can reply, resolve, or reopen threads
7. GitHub sends notifications to all thread participants automatically

---

## Multi-project mono-repo layout

A single `docs-review.config.yml` can address multiple documentation projects within the same repository:

```
my-docs-repo/
├── docs-review.config.yml
├── projects/
│   ├── platform/
│   │   └── docs/
│   │       ├── architecture.md
│   │       └── api-design.md
│   └── mobile/
│       └── docs/
│           ├── brd.md
│           └── urs.md
└── .github/
    └── workflows/
        └── docs-review.yml
```

The sidebar project selector lets reviewers switch between projects without leaving the interface.

---

## GitHub Enterprise

Docs Review works on GitHub Enterprise Server (GHES 3.1+). No additional configuration is required — the build picks up `VITE_GITHUB_API_URL` automatically from the `github.api_url` context variable in GitHub Actions.

Ensure GitHub Pages is enabled at the instance level (Admin Console → Pages).

---

## Comment storage

Comments are stored as GitHub Discussions in the `📝 Doc Reviews` category (created automatically on first use). Each thread is labelled `doc-review` to keep it isolated from other Discussions. Deleting a thread closes the Discussion and removes the inline annotation.

---

## Development

```bash
cd app
npm install
npm run dev      # local dev server (no GitHub API calls without env vars)
npm test         # unit tests
npm run build    # production build
```

To test against a real repository locally, create `app/.env.local`:

```env
VITE_REPO_OWNER=your-org
VITE_REPO_NAME=your-repo
VITE_OAUTH_CLIENT_ID=your-client-id
VITE_GITHUB_API_URL=https://api.github.com
VITE_DOCS_CONFIG=|
  projects:
    - name: "My Docs"
      path: "docs"
  settings:
    file_extensions: [".md"]
    exclude: []
```
