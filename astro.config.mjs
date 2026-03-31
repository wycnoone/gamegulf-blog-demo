import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  // DEV: GitHub Pages preview URL
  // PROD: change back to site: 'https://www.gamegulf.com', base: '/blog'
  site: 'https://wycnoone.github.io',
  base: '/gamegulf-blog-demo',
  output: 'static',
  integrations: [
    react(),
    sitemap(),
  ],
  markdown: {
    shikiConfig: { theme: 'github-light' },
  },
});
