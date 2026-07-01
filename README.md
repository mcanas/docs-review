# Docs Review

A GitHub-native markdown documentation review tool. Adds Confluence-style threaded inline commenting to any markdown repository, served via GitHub Pages with all content and commentary stored as GitHub Issues. No external services required.

---

## How it works

- Documents are written and committed as markdown files — no change to author workflow
- Reviewers open the GitHub Pages site, select text in the rendered document, and add comment threads
- Comments are stored as GitHub Issues in the same repository
- GitHub's native notification system alerts participants
- All content stays in GitHub

---

## Installation

### Prerequisites

| Requirement | Notes |
|---|---|
| GitHub Pages enabled | Repo Settings → Pages → Source: `gh-pages` branch |
| GitHub Issues enabled | Enabled by default on all repositories |

**Authentication** uses GitHub Personal Access Tokens — no OAuth App registration needed. Visitors can browse and read without signing in; signing in is only required to post or reply to comments.

### 1 — Add the config file

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

### 2 — Create a read-only PAT

This token lets unauthenticated visitors browse docs and read threads without signing in.

Go to **github.com → Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**:

- **Resource owner**: the org (or account) that owns the docs repo
- **Repository access**: only the target docs repo
- **Permissions**: Contents → Read-only; Issues → Read-only

Copy the generated token — you'll add it as a secret in step 4.

### 3 — Fork this repository to your org

For enterprise use, fork `mcanas/docs-review` into your own GitHub organisation so your workflows depend on your org's copy rather than an external repo.

Then create `.github/workflows/docs-review.yml` in the target documentation repository:

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
      read-token: ${{ secrets.DOCS_REVIEW_READ_TOKEN }}
```

Replace `YOUR_ORG` with the organisation where your forked `docs-review` repository lives.

### 4 — Add the secret

In your repository: **Settings → Secrets and variables → Actions → Secrets → New repository secret**

- **Name**: `DOCS_REVIEW_READ_TOKEN`
- **Value**: the fine-grained PAT from step 2

### 5 — Deploy

Push to `main` or trigger the workflow manually via **Actions → Deploy Docs Review → Run workflow**.

The site will be available at `https://YOUR_ORG.github.io/YOUR_REPO` (or your GHE equivalent) once the workflow completes.

---

## Reviewer workflow

1. Open the GitHub Pages URL — no sign-in required to browse docs and read existing threads
2. Select a project from the sidebar, then select a document
3. To comment: click **Sign in** in the top-right, enter your GitHub Personal Access Token, click **Sign in**
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

**GitHub Enterprise Cloud (GHEC)** — no additional configuration. GHEC uses the same API and auth URLs as github.com (`api.github.com`, `github.com`). Follow the standard installation steps above. If your org enforces SAML SSO, the GitHub Pages site will automatically be restricted to org members.

**GitHub Enterprise Server (GHES 3.1+)** — the build automatically picks up `VITE_GITHUB_API_URL` from the `github.api_url` context variable in GitHub Actions, which points to your instance's API (`https://github.your-company.com/api/v3`). Ensure GitHub Pages is enabled at the instance level (Admin Console → Pages).

---

## Comment storage

Comments are stored as GitHub Issues labelled `doc-review`, keeping them isolated from regular issues. Thread coordinates (file, line range, selected text, commit SHA) are stored in the issue body so threads stay anchored to the correct location even as the document evolves.

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
VITE_GITHUB_API_URL=https://api.github.com
VITE_READ_TOKEN=your_read_only_pat
VITE_DOCS_CONFIG=|
  projects:
    - name: "My Docs"
      path: "docs"
  settings:
    file_extensions: [".md"]
    exclude: []
```
