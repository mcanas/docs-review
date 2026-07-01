import { defineConfig, type Plugin } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { parse as parseYaml } from 'yaml'

function injectBuildConfig(): Plugin {
  return {
    name: 'inject-build-config',
    transformIndexHtml(html) {
      const owner = process.env.VITE_REPO_OWNER ?? 'owner'
      const name = process.env.VITE_REPO_NAME ?? 'repo'
      const oauthClientId = process.env.VITE_OAUTH_CLIENT_ID ?? ''
      const githubApiUrl = process.env.VITE_GITHUB_API_URL ?? 'https://api.github.com'
      const readToken = process.env.VITE_READ_TOKEN ?? ''
      const rawConfig = process.env.VITE_DOCS_CONFIG ?? ''

      const defaultConfig = { projects: [], settings: { file_extensions: ['.md'], exclude: [] } }
      let config = defaultConfig
      try {
        const parsed = rawConfig ? parseYaml(rawConfig) : {}
        config = { ...defaultConfig, ...parsed, settings: { ...defaultConfig.settings, ...(parsed.settings ?? {}) } }
      } catch {
        // fall back to empty config in dev
      }

      const injected = `<script>window.__DOCS_REVIEW_CONFIG__ = ${JSON.stringify({
        repo: { owner, name },
        oauthClientId,
        githubApiUrl,
        readToken,
        config,
      })}</script>`

      return html.replace('<!--DOCS_REVIEW_CONFIG_INJECT-->', injected)
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), injectBuildConfig()],
  base: './',
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/utils/**', 'src/api/**'],
      thresholds: { lines: 80, functions: 80, branches: 70 },
    },
  },
})
