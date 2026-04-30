import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

function resolveBase() {
  if (process.env.GITHUB_ACTIONS === 'true') {
    const repo = process.env.GITHUB_REPOSITORY?.split('/')[1]?.trim();
    if (repo) return `/${repo}`;
  }
  return '/blog';
}

export default defineConfig({
  site: 'https://www.gamegulf.com',
  base: resolveBase(),
  output: 'static',
  integrations: [
    react(),
    sitemap(),
  ],
  markdown: {
    shikiConfig: { theme: 'github-light' },
  },
});
