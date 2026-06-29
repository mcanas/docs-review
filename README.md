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

In your GitHub org settings (**github.com → Your org → Settings → Developer settings → OAuth Apps → New OAuth App**):

1. Set **Application name**: `Docs Review`
2. Set **Homepage URL**: your GitHub Pages URL (e.g. `https://your-org.github.io/your-repo`)
3. Set **Authorization callback URL** to the same GitHub Pages URL — Device Flow doesn't use a redirect, but GitHub requires a non-blank value here
4. Save, then enable **Device Flow** on the OAuth App's settings page
5. Note the **Client ID** (you do not need a client secret)

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
      client-id: ${{ vars.DOCS_REVIEW_CLIENT_ID }}
```

Replace `YOUR_ORG` with the organisation where your forked `docs-review` repository lives.

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

**GitHub Enterprise Cloud (GHEC)** — no additional configuration. GHEC uses the same API and auth URLs as github.com (`api.github.com`, `github.com`). Register the OAuth App in your org's Settings → Developer Settings and follow the standard installation steps above. If your org enforces SAML SSO, the GitHub Pages site will automatically be restricted to org members — only authenticated org members will be able to load the review interface.

**GitHub Enterprise Server (GHES 3.1+)** — the build automatically picks up `VITE_GITHUB_API_URL` from the `github.api_url` context variable in GitHub Actions, which points to your instance's API (`https://github.your-company.com/api/v3`). Auth URLs are derived from it automatically. Ensure GitHub Pages is enabled at the instance level (Admin Console → Pages).

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
