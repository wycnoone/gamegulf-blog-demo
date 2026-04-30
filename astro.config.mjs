import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

function resolveBase() {
  return process.env.ASTRO_BASE?.trim() || '/blog';
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
